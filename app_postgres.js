const express     = require("express");
const app         = express();
const port        = 8000;
const Sequelize = require('sequelize');
const csv = require('csv-parser');
const fs = require('fs');
const async = require('async');
const parse = require( 'csv-parse');
const axios = require( 'axios' );

const request = require('request'),   // this is an alternative for getting HTTP requests, but I wanted to keep it localized to my machine and the heroku instance for security and bandwith purposes.
//cbsa = './zip_to_cbsa.csv',
cbsa = 'https://s3.amazonaws.com/peerstreet-static/engineering/zip_to_msa/zip_to_cbsa.csv',
//msa = './cbsa_to_msa.csv',
msa = 'https://s3.amazonaws.com/peerstreet-static/engineering/zip_to_msa/cbsa_to_msa.csv',
MetStatString = 'Metropolitan Statistical Area';


// Local
const sequelize = new Sequelize('peerstreet', process.env.DB_USER, 'password', {
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




// var schoolV1 = require("./routes/school/school_routes_v1");
const cors = require('cors');


// ===== HTTPS START =========================================================
// const fs = require('fs'),
// https = require('https');
// https.createServer({  
//     key: fs.readFileSync('../ssh-key/mapin7.key'),
//     cert: fs.readFileSync('../ssh-key/mapin7.crt')
// }, app).listen(port);
// ===== HTTPS END =========================================================



app.use(cors({
    allowedHeaders: ["Origin, X-Requested-With, Content-Type, Accept"],
  }))

 
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '50mb'})); // support json encoded bodies
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000000 })); // support encoded bodies

app.use(function(req, res, next) {
 res.header("Access-Control-Allow-Origin", "*");
 res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 next();
});


// class SyncToDB {
//     constructor(sequelize, list){
//         let insertString = "insert into zip_to_cbsa (zip_code, cbsa_id) values ";
//         let valueString = list.reduce((ac, o,i, a) => {
//              let tail = (i == (a.length -1)) ?  "" : ", " ;
//              return ac + "("+ String(o.zip) + "," +  String(o.cbsa) + ")" + tail;
//         }, "");
//         this.sequelize = sequelize;
//         this.query = insertString   +  valueString.trim() ;
//         console.log(this.query);
//     }

//     sync(callback) {
//         console.log(this.query);
//         return this.sequelize.query(this.query);
//         // this.sequelize.query(this.query).then(function(result) {
//         //     callback(null,result[0]);
      
//         //   }).catch(function(error) {
//         //     callback(error);
//         //   });

//     }
// }

const SyncToDB = function (sequelize, list) { 
    let insertString = "insert into zip_to_cbsa (zip_code, cbsa_id) values ";
    let valueString = list.reduce((ac, o,i, a) => {
         let tail = (i == (a.length -1)) ?  "" : ", " ;
         return ac + "("+ String(o.zip) + "," +  String(o.cbsa) + ")" + tail;
    }, "");

    // this.sequelize = sequelize;
    let query = insertString   +  valueString.trim()  +  ";";

    this.sync = function(callback) {
        console.log(query);
        // return sequelize.query(query);
       sequelize.query(query).then(function(result) {
        callback(null,result[1]);
       }).catch(function(error) {
        callback(error);
       });
    }
}


// const SyncToCBSADB = function (sequelize, list) { 
//     let insertString = "insert into cbsa_to_msa (zip_code, cbsa_id) values ";
//     let valueString = list.reduce((ac, o,i, a) => {
//          let tail = (i == (a.length -1)) ?  "" : ", " ;
//          return ac + "("+ String(o.zip) + "," +  String(o.cbsa) + ")" + tail;
//     }, "");

//     // this.sequelize = sequelize;
//     let query = insertString   +  valueString.trim()  +  ";";

//     this.sync = function(callback) {
//         console.log(query);
//         // return sequelize.query(query);
//        sequelize.query(query).then(function(result) {
//         callback(null,result[1]);
//        }).catch(function(error) {
//         callback(error);
//        });
//     }
// }


function getZipToCBSA () {
    fs.createReadStream('./data/zip_to_cbsa.csv')
    .pipe(csv())
    .on('data', (row) => {
        // let keys = Object.keys(row);
        // console.log
        if (row['CBSA'] != '99999') {
            keyIndex++;
            tempList.push({zip:row['ZIP'], cbsa: row['CBSA']})
            if (keyIndex%pageLimit == 0) {
                obj = new SyncToDB(sequelize, tempList);
                taskList.push(obj.sync);
                count++;
                tempList = [];
            }

        }
     
    })
    .on('end', () => {
      if (tempList.length > 0) {
        obj = new SyncToDB(sequelize, tempList);
        taskList.push(obj.sync);
      }

      console.log(taskList);
      console.log(" task size: " + taskList.length);

    //   async.series(taskList,function(err, results){
    //     if(err){
    //       console.log(err);
    //     }else{
    //        console.log("done")
    //        console.log(results);
    //       // syncMissingMappingData(args);
    //     }
    //     //console.log(results);
    //     //console.log(JSON.stringify(fields));
    //   });

    });



}


const SyncToCBSADB = function (sequelize, list) { 
        let replacmentString = list.map(a => '(?)').join(',');
        let insertString = 'insert into cbsa_to_msa ( name, cbsa_id,  mdiv ) values '+ replacmentString;

        let replacementArray =  [];
        
        list.forEach((r) => {
            let name = (r.name) ?   r.name  : null ;
            let mdiv = (r.mdiv) ?   r.mdiv  : null;
            let cbsa_id = (r.cbsa_id) ?  r.cbsa_id : null;
            replacementArray.push([name, cbsa_id, mdiv])
        })
        
        this.sync = function(callback) {
            sequelize.query(insertString, {
                replacements: replacementArray,
                type: Sequelize.QueryTypes.INSERT
             }).then(function(result) {
                callback(null,result);
            }).catch(function(error) {
                callback(error);
            });
        }
    }
    

app.get("/former", function(req,res){
    let pageLimit = 500;
    let tempList = [];
    let tempObj = {};
    let keyIndex = 0 ;
    let count =  0;
    let taskList = [];
    let obj;
    

    fs.createReadStream('./data/cbsa_to_msa.csv')
    .pipe(csv())
    .on('data', (row) => {
        if (row['LSAD'] == 'Metropolitan Statistical Area')  {
            keyIndex++;
            let keys = Object.keys(row).filter((key) => {return key.includes("POPESTIMATE")} ); 
            let popeEstimates = keys.map((key) => { return [key.split("POPESTIMATE")[1], row[key]] });
            
            // console.log(row['MDIV']);
            tempList.push({
                  cbsa_id:  row['CBSA'],
                  mdiv:  row['MDIV'],
                  name:  row['NAME']
            });

            tempObj[row['CBSA'] + "_" + row['MDIV']] = popeEstimates;
            // console.log(tempList);
          if (keyIndex%pageLimit == 0) {

                obj = new SyncToCBSADB(sequelize, tempList);
                taskList.push(obj.sync);
                tempList = [];
            }
        }

     
    })
    .on('end', () => {
      if (tempList.length > 0) {
        obj = new SyncToCBSADB(sequelize, tempList);
        taskList.push(obj.sync);
      }

    //   console.log(taskList);
      console.log(" task size: " + taskList.length);

      async.series(taskList,function(err, results){
        if(err){
          console.log(err);
        }else{
           console.log("done")
           console.log(results);
          // syncMissingMappingData(args);
        }
        //console.log(results);
        //console.log(JSON.stringify(fields));
      });

    });

    




    res.send("Token generated!");
});



var fileStream = (path, callback) => {
    request(path, (err, res, data) => {
      if (err) {
        res.send(err);
      }

      //  console.log(path);
      callback(data);
    });
  }

  var getMETA = function (cbsaHash, zipToCBSA, callback) {
    // let promise = new Promise((resolve, reject) => {
        fileStream(msa, (data) => {
            let msaLines = data.split('\r');
            console.log(msaLines);
        });
    // });

    // return promise
  };


  const readCSV = async (path, callback) => {
    let record, output=[], keys;
    try {
        const res = await axios( { url: path, method: 'GET', responseType: 'blob' } );
         parse( res.data, {
           columns: true,
           skip_empty_lines: true
         } ).on('readable', function(){
            while (record = this.read()) {
              output.push(record)
            }
          })
          .on('end', function(){
              keys = Object.keys(output[0]);
              callback(null, {records: output, keys: keys});
          });
      } catch ( e ) {
        callback(e);
      }
  }

 const getZipToCBSA2 = () => {
    let promise = new Promise((resolve, reject) => {
        readCSV(cbsa, (error, response) => {
          if (error) {
                reject(error);
          } else {
            let zipHash = {},
                cbsaHash = {},
                zipKey = response.keys[0],
                records = response.records,
                result = {};
                
                for (i = 0; i < records.length; i++ ) {
                   let row = records[i];
                   if (row['CBSA'] != '99999') {
                       zipHash[row[zipKey]] = row['CBSA'];
                       cbsaHash[row['CBSA']] = {origin: row['CBSA'], mapTo: null, name: null, popeEstimates: []};
                   }
                }
               result = {cbsaHash: cbsaHash, zipHash: zipHash};
        
            resolve(result);
          }
        });
    })
    return promise;
 };


 const getCBSAToMSA = (arg) => {
    let promise = new Promise((resolve, reject) => {
        readCSV(msa, (error, response) => {
          if (error) {
                reject(error);
          } else {
               let cbsaHash = arg.cbsaHash,
                   zipHash = arg.zipHash,
                   records =  response.records,
                   popKeys =  response.keys.filter((key) => {return key.includes("POPESTIMATE")} ),
                   result = {}; 
  
            for (let i = 0 ; i < records.length ; i++) {
                let row = records[i];
                if (row['LSAD'] == 'Metropolitan Statistical Area')  { 
                    let popeEstimates = popKeys.map((key) => { return [key.split("POPESTIMATE")[1], row[key]] }),
                       cbsa = row['CBSA'].trim(),
                       mdiv = row['MDIV'].trim();
                      if (cbsaHash[mdiv]) {
                         cbsaHash[mdiv].mapTo = mdiv;
                         cbsaHash[mdiv].name = row['NAME'];
                         cbsaHash[mdiv].popeEstimates = popeEstimates;
                      } else if (cbsaHash[cbsa])  {
                         cbsaHash[cbsa].mapTo = cbsa;
                         cbsaHash[cbsa].name = row['NAME'];
                         cbsaHash[cbsa].popeEstimates = popeEstimates;
                     }
                }
            }
            result = {cbsaMap:cbsaHash, zipMap: zipHash};        
            resolve(result);
          }
        });
    })
    
    return promise;
 };

 const SyncToMSADB  = (sequelize, arg) => {
   let promise = new Promise((resolve, reject)  => {
      let keys = Object.keys(arg.cbsaMap);
      let zipKeys = Object.keys(arg.zipMap);
      let zipMap = arg.zipMap;
      let cbsaMap = arg.cbsaMap;
      let records = [];
      let replacementArray = [];
      let replacementPopulation = [];
      let replacementZip = [];

      for (let i = 0 ; i < keys.length ; i++) {
        let key = keys[i];
        if (cbsaMap[key].mapTo)  {
          records.push(cbsaMap[key]);
        }
      }
      
      let replacmentString = records.map(a => '(?)').join(',');
      let insertString = 'insert into cbsa_to_msa ( name, cbsa_id ) values '+ replacmentString;

      records.forEach((r) => {
        let name = (r.name) ?   r.name  : null ;
        let cbsa_id = (r.mapTo) ?  r.mapTo : null;
        let popeEstimates = r.popeEstimates;
        for (let i = 0; i < popeEstimates.length ; i++) {
          replacementPopulation.push([popeEstimates[i][0],cbsa_id, popeEstimates[i][1]]);
        }

        replacementArray.push([name, cbsa_id]);
      })


      // population estimate
      let replacementStringPop = replacementPopulation.map(a => '(?)').join(',');
      let instertStringPop =  'insert into population ( year, cbsa_id, number ) values '+ replacementStringPop;

      // zip 

      zipKeys.forEach((key) => {
          let cbsaId = zipMap[key];
          if (cbsaMap[cbsaId].mapTo) {
            replacementZip.push([key, cbsaMap[cbsaId].mapTo]);
          }
      });
      
      let replacementStringZip = replacementZip.map(a => '(?)').join(',');
      let instertStringZip =  'insert into zip_to_cbsa ( zip_code, cbsa_id ) values '+ replacementStringZip;

      // console.log(replacementZip);
      
      sequelize.query(insertString, {
        replacements: replacementArray,
        type: Sequelize.QueryTypes.INSERT
      }).then(function(response) {
        return  sequelize.query(instertStringPop, { replacements: replacementPopulation, type: Sequelize.QueryTypes.INSERT })
      }).then((response) => {
        return  sequelize.query(instertStringZip, { replacements: replacementZip, type: Sequelize.QueryTypes.INSERT })
      }).then((response)=> {
        resolve(response);
      }).catch(function(error) {
        reject(error);
      });
   });
   return promise;
 }

app.get("/", function(req,res){
    getZipToCBSA2().then((response) => {
       return getCBSAToMSA(response);
    }).then((response)=> {
      return SyncToMSADB(sequelize, response);        
    }).then((response) => {
       console.log(response);
    }).catch((error) => {
      console.log(error);
    });
    res.send("Token generated!");
});

// app.use('/api', passport.authenticate('jwt', {session: false}), schoolV1);

// //app.use('/api',  schoolV1);

app.listen(port);