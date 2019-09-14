const MongoClient = require('mongodb').MongoClient;
const Sequelize = require('sequelize');
// environment files
require('dotenv').config();
const url = process.env.MONGODB_HOST;
const dbName = process.env.MONGODB;
const dbCollection = process.env.MONGDB_COLLECTION;

function MongoDbUtils(){};

function connectToMongo() {
 let promise =  new Promise(function(resolve, reject) {
   MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, db) {
      if (err) {
       reject(err);
      } else {
       resolve(db);
      }
   });
 });
 return promise;    
}

function createDocuments() {
    let promise = new Promise (function (resolve, reject) {
        const queryCBSADB = "select cbsa_id, name from cbsa_to_msa";
        const queryZip = "select zip_code, cbsa_id from zip_to_cbsa";
        const queryPop = "select cbsa_id, year, number from population";
        const sequelize = new Sequelize(process.env.DB, process.env.DB_USER, process.env.DB_PASS, {
            host: process.env.DB_HOST,
            port: 5432,
            dialect: 'postgres',
            logging: false,
            pool: {
            max: 90,
            min: 0,
            idle: 10000
            }
        })
        let cbsa;

         sequelize.query(queryCBSADB, { type: sequelize.QueryTypes.SELECT}).then(function(records) {
           cbsa = records;
           return sequelize.query(queryZip, { type: sequelize.QueryTypes.SELECT});
         }).then(function(records){
             let zipHash = {};
             for (let i  = 0 ; i < records.length; i++) {
                 let key = records[i].cbsa_id;
                 let zipCode = records[i].zip_code;
                 if (!zipHash[key]) {
                     zipHash[key] = [];
                 } 
                 zipHash[key].push(zipCode);
             }
             
             for (let i = 0 ; i < cbsa.length; i++) {
                 let record = cbsa[i];
                 let cbsa_id = cbsa[i].cbsa_id;
                 record.zip_code = (zipHash[cbsa_id]) ? zipHash[cbsa_id] : [];
             }
 
             return sequelize.query(queryPop, { type: sequelize.QueryTypes.SELECT});
         }).then(function(records){
             let popHash = records.reduce((o, r) => {
                 let key = r.cbsa_id;
                 if (!o[key]) {
                   o[key] = [];
                 } 
                 o[key].push({year: r.year, number: r.number}); 
                 return o;
             }, {});
 
             for (let i = 0 ; i < cbsa.length; i++) {
                 let record = cbsa[i];
                 let cbsa_id = cbsa[i].cbsa_id;
                 record.pop_estimate = (popHash[cbsa_id]) ? popHash[cbsa_id] : [];
             }
             
             resolve(cbsa);
         }).catch(function(error) {
             reject(error);
         })
     });
     return promise
}

function insertDocuments(db, documents) {
    let promise = new Promise(function(resolve, reject) {
        const dbo = db.db(dbName);
        const collection = dbo.collection(dbCollection);
        collection.insertMany( documents, function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
   return promise;
}

function isRequestValid(arg) {
    console.log(arg);
  if (!arg) {
    return false;
  } else if (!arg.cbsa_ids && !arg.zip_codes && !arg.name){
    return false;
  } 
   return true
}

function parseArray(records) {
  if (!records) return [];
  let result = Array.isArray(records) ? records : Object.keys(records).map((key)=> { return records[key]});
  return result;
}

 MongoDbUtils.createCollection = function(callback) {
    connectToMongo().then(function(db){
        let dbo = db.db(dbName);
        dbo.createCollection(dbCollection, function(err, res) {
            db.close();
            if (err) {
                callback(err);
            } else {
                callback(null, res);
            }
          db.close();
        });
    }).catch(function(err) {
        console.log(err);
        callback(err)
    })
  }

  MongoDbUtils.migrateDocuments = function(callback) {
    let db;
    connectToMongo().then(function(res){
      db = res;
      return createDocuments();
    }).then(function(documents){
      return insertDocuments(db, documents);
    }).then(function(res){
       db.close();
       callback(null, res);
    }).catch(function(err) {
       db.close();
       callback(err);
    })
  }

  MongoDbUtils.searchDocuments = function(arg, callback)  {
    let promise = new Promise(function(resolve, reject) {
        if (!isRequestValid(arg)) {
            reject({status: 400, message: "Bad Request"});
        } else {
            let cbsaIds = parseArray(arg.cbsa_ids);
            let zipCodes = parseArray(arg.zip_codes);
            let nameText = arg.name;
            let query = (nameText) ? {$text:{$search:nameText}} : {$or: [ {"cbsa_id": {$in: cbsaIds }}, {"zip_code": {$in: zipCodes}}] };
            connectToMongo().then(function(db){
            let dbo = db.db(dbName);
            dbo.collection(dbCollection).find(query).toArray(function(err, res) {
                db.close();
                if (err)
                reject(err); 
                else {
                    resolve(res);
                }
            });
        
            }).catch(function(err) {
            reject(err); 
            })
        }
    });
    return promise;
  }
  
module.exports = MongoDbUtils;
