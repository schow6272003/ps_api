'use strict';
const MongoClient = require('mongodb').MongoClient;
const Sequelize = require('sequelize');
const redisMod = require("redis");
const redis = (process.env.REDIS_URL) ? redisMod.createClient(process.env.REDIS_URL) : redisMod.createClient();
// environment files
require('dotenv').config();
const url = (process.env.MONGODB_URI) ? process.env.MONGODB_URI :  process.env.MONGODB_HOST;
const dbName = process.env.MONGODB;
const dbCollection = process.env.MONGDB_COLLECTION;
const helpers = require('./mongo_helpers.js');

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
};

function createDocuments() {
  let promise = new Promise (function (resolve, reject) {
    const queryCBSADB = "select cbsa_id, name from cbsa_to_msa";
    const queryZip = "select zip_code, cbsa_id from zip_to_cbsa";
    const queryPop = "select cbsa_id, year, number from population";
    let cbsa, sequelize;
    if (process.env.DATABASE_URL) {
          // Heroku database
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect:  'postgres',
        protocol: 'postgres'
      });
    } else {
      sequelize =  new Sequelize(process.env.DB, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST,
        port: 5432,
        dialect: 'postgres',
        logging: false,
        pool: {
        max: 90,
        min: 0,
        idle: 10000 }
      })
    }

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
            o[key].push({year: r.year, number: Number(r.number)}); 
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
};

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
};

function dropCollection(collectionName, dbo) { 
  let promise = new Promise(function(resolve, reject) {
    dbo.collection(collectionName).drop(function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
  return promise; 
};

MongoDbUtils.createCollection = function(callback) {
  let dbo, db;
    connectToMongo().then(function(dbRes){
      db = dbRes;
      dbo = db.db(dbName);
      return dropCollection(dbCollection, dbo);
    }).then(function(res){
      dbo.createCollection(dbCollection, function(err, res) {
        db.close();
        if (err) {
          callback(err);
        } else {
          callback(null, res);
        }
      });
    }).catch(function(err) {
      console.log(err);
      callback(err)
    });
};

MongoDbUtils.migrateDocuments = function(callback) {
  let db;
  connectToMongo().then(function(res){
    db = res;
    return createDocuments();
  }).then(function(documents){
    return insertDocuments(db, documents);
  }).then(function(res){
    db.close();
    return connectToMongo();
  }).then(function(res){
    db = res;
    const dbo = db.db(dbName);
    dbo.collection(dbCollection).createIndex([{name:"text"}]);
    dbo.collection(dbCollection).createIndex([{cbsa_id: 1}]);
    db.close();
    callback(null, "Migrate completed!");
  }).catch(function(err) {
    db.close();
    callback(err);
  });
};

MongoDbUtils.searchDocumentsNoRedis = function(arg, callback)  {
  let promise = new Promise(function(resolve, reject) {
      if (!helpers.isRequestValid(arg)) {
        reject({status: 400, message: "Bad Request"});
      } else {
        let cbsaIds = helpers.parseArray(arg.cbsa_ids).map((r) => {return Number(r)});
        let zipCodes = helpers.parseArray(arg.zip_codes).map((r) => {return Number(r)});
        let nameText = arg.name;
        let query, redisCachedKey;
        if (nameText) {
          redisCachedKey = "text-name-search-" + nameText.replace(/\s+/g,"-");
          query = {$text:{$search:nameText}} ;
        } else {
          redisCachedKey =  "query-" + "cbsa_ids-"  
                            + cbsaIds.reduce((s, r) => { return s + r.toString() + "-" }, "") 
                            + "zipcodes-" +  zipCodes.reduce((s, r) => { return s + r.toString() + "-" }, "")
          query = {$or: [ {"cbsa_id": {$in: cbsaIds }}, {"zip_code": {$in: zipCodes}}] };
        }
        connectToMongo().then(function(db){
          let dbo = db.db(dbName);
          dbo.collection(dbCollection).find(query).toArray(function(err, res) {
            db.close();
            if (err)
              reject({status: 500, message: err}); 
            else {
              resolve({status: 200, result: res});
            }
          });
        }).catch(function(err) {
          reject({status: 500, message: err}); 
        });
      }
    });
  return promise;
};

MongoDbUtils.searchDocuments = function(arg, callback)  {
  let promise = new Promise(function(resolve, reject) {
      if (!helpers.isRequestValid(arg)) {
        reject({status: 400, message: "Bad Request"});
      } else {
        let cbsaIds = helpers.parseArray(arg.cbsa_ids).map((r) => {return Number(r)});
        let zipCodes = helpers.parseArray(arg.zip_codes).map((r) => {return Number(r)});
        let nameText = arg.name;
        let query, redisCachedKey;
        if (nameText) {
          redisCachedKey = "text-name-search-" + nameText.replace(/\s+/g,"-");
          query = {$text:{$search:nameText}};
        } else {
          redisCachedKey = "query-" + "cbsa_ids-"  
                           + cbsaIds.reduce((s, r) => { return s + r.toString() + "-" }, "") 
                           + "zipcodes-" +  zipCodes.reduce((s, r) => { return s + r.toString()+ "-" }, "")
          query = {$or: [ {"cbsa_id": {$in: cbsaIds }}, {"zip_code": {$in: zipCodes}}] };
        }

        redis.get(redisCachedKey, function (err, res) {
          if (err) {
            eject({status: 500, message: err}); 
          } else if (res) {
            let records = JSON.parse(res)
            resolve({status: 200, result: helpers.parseRecords(records)});
          } else {
            connectToMongo().then(function(db){
              let dbo = db.db(dbName);
              dbo.collection(dbCollection).find(query).toArray(function(err, res) {
                db.close();
                  if (err)
                    reject({status: 500, message: err}); 
                  else {
                    redis.set(redisCachedKey, JSON.stringify(res), function () {
                      resolve({status: 200, result: helpers.parseRecords(res)});
                    }); 
                  }
              });
            }).catch(function(err) {
              reject({status: 500, message: err}); 
            });
          }
        }); // redis get
        }
    });
  return promise;
};

MongoDbUtils.showAll = function(arg, callback) {
  connectToMongo().then(function(db){
      let dbo = db.db(dbName);
      dbo.collection(dbCollection).find(arg).toArray(function(err, res) {
        db.close();
        if (err)
          callback(err);
        else {
          callback(null, res);
        }
      });
    }).catch(function(err) {
      callback(err);
    });
};
  
module.exports = MongoDbUtils;
