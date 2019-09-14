const express     = require("express");
const app         = express();
const port        = 8000;
const mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const url = process.env.MONGODB_HOST;
const dbName = "peerstreet";
const Sequelize = require('sequelize');
const MongoDbUtils = require('./model/mongo_db/mondbUtil.js');


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



var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '50mb'})); // support json encoded bodies
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000000 })); // support encoded bodies

app.use(function(req, res, next) {
 res.header("Access-Control-Allow-Origin", "*");
 res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 next();
});


const createDocuments =  function (sequelize) {
    let promise = new Promise (function (resolve, reject) {
       const queryCBSADB = "select cbsa_id, name from cbsa_to_msa";
       const queryZip = "select zip_code, cbsa_id from zip_to_cbsa";
       const queryPop = "select cbsa_id, year, number from population";
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
            console.log(cbsa.length);
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

const createCollection  = function(db, collection, callback) {
    // if (err) throw err;
    let dbo = db.db("peerstreet");
    dbo.createCollection("cbsa", function(err, res) {
      if (err) throw err;
      console.log("Collection created!");
      db.close();
    });
};

const insertDocuments = function(db, documents, callback) {
    // Get the documents collection

    const dbo = db.db("peerstreet");
    const collection = dbo.collection('cbsa');
    
    collection.insertMany( documents, function(err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null,result);
            }
    });
  }

  const findDocuments = function(arg, db, callback) {
    // if (err) throw err;
    var dbo = db.db("peerstreet");

    let query = {$or: [ {"cbsa_id": {$in: ['20700']}}, {"zip_code": {$in: [97345]}}] }

    // let query = {$text:{$search:"fl"}}
    
    dbo.collection("cbsa").find(query).toArray(function(err, result) {
        if (err) throw err;
        // console.log(result);
        db.close();
        callback(result);
      });
  }
  

app.get("/", function(req,res){

    MongoDbUtils.createCollection(function(err, res){
      console.log("=== create collections");
      console.log(res);
      MongoDbUtils.migrateDocuments(function(err, res){
          console.log("==== migrate Documents");
          console.log(err);
          console.log(res);
      });
    });
    


//  MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, db) {
//     if (err) throw err;

//     // createCollection(db,"cbsa", function(result){
//     //     console.log(result);
//     // });
//     // findDocuments({}, db, function(result){
//     //     console.log(result);
//     // });
    
    
//     // Create
//     createDocuments(sequelize).then(function(documents) {
//         console.log(documents);
//         // insertDocuments(db, documents, function(err, result) {
//         //     console.log(err);
//         //     console.log(result);  
//         // })

//     }).catch(function(error){
//        console.log(error); 
//     });

//  });

    res.send("Token generated!");
});

// app.use('/api', passport.authenticate('jwt', {session: false}), schoolV1);

// //app.use('/api',  schoolV1);

app.listen(port);