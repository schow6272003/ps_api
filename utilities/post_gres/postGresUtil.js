'use strict';
const Sequelize = require('sequelize');
const parse = require( 'csv-parse');
const axios = require( 'axios' );
require('dotenv').config();
const cbsaUrl = process.env.cbsa;
const msaUrl = process.env.msa;
const MetStatString = process.env.MetStatString;

function PostGresUtils(){};

const connectToPostGres = () => {
  let promise = new Promise((resolve, reject) => {
    let sequelize;
    if (process.env.DATABASE_URL) {
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect:  'postgres',
        protocol: 'postgres'
      });
    } else {
     sequelize = new Sequelize(process.env.DB, process.env.DB_USER, process.env.DB_PASS, {
       host: process.env.DB_HOST,
       port: 5432,
       dialect: 'postgres',
       logging: false,
       pool: { max: 90,
               min: 0,
               idle: 10000
             }
     });
    }
    resolve(sequelize);
  });
  return promise;
};

const getZipToCBSA = () => {
  let promise = new Promise((resolve, reject) => {
        readCSV(cbsaUrl, (error, response) => {
          if (error) {
            reject(error);
          } else {
            let zipHash = {},
                cbsaHash = {},
                zipKey = response.keys[0],
                records = response.records,
                result = {};
                
            for (let i = 0; i < records.length; i++ ) {
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
        readCSV(msaUrl, (error, response) => {
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
              if (row['LSAD'] == MetStatString)  { 
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

const readCSV = async (path, callback) => {
  let record, output=[], keys;
  try {
    const res = await axios( { url: path, method: 'GET', responseType: 'blob' } );
    parse( res.data, {
      columns: true,
      skip_empty_lines: true
    }).on('readable', function() {
      while (record = this.read()) {
        output.push(record);
      }
    }).on('end', function() {
      keys = Object.keys(output[0]);
      callback(null, {records: output, keys: keys});
    });
   } catch ( e ) {
    callback(e);
   }
};

const cleanTables = (sequelize) => {
  let promise = new Promise((resolve,reject) => {
      let promises = [];
      let tables = ["cbsa_to_msa", "population", "zip_to_cbsa"]
      
      for (let i = 0; i < tables.length ; i++) {
        promises.push( sequelize.query("delete from " + tables[i]) );
      }

      Promise.all(promises).then((res) => {
        resolve(res)
      }).catch((err) => {
        reject(err)
      })
  });
  return promise;
};

const SyncToMSADB = (sequelize, arg) => {
  let promise = new Promise((resolve, reject) => {
      let keys = Object.keys(arg.cbsaMap);
      let zipKeys = Object.keys(arg.zipMap);
      let zipMap = arg.zipMap;
      let cbsaMap = arg.cbsaMap;
      let records = [];
      let replacementArray = [];
      let replacementPopulation = [];
      let replacementZip = [];
      let timeNow = new Date();
 
      for (let i = 0 ; i < keys.length ; i++) {
        let key = keys[i];
        if (cbsaMap[key].mapTo) {
          records.push(cbsaMap[key]);
        }
      }
       
      let replacmentString = records.map(a => '(?)').join(',');
      let insertString = 'insert into cbsa_to_msa ( name, cbsa_id, created_at, updated_at ) values '+ replacmentString;
 
      records.forEach((r) => {
        let name = (r.name) ?   r.name  : null ;
        let cbsa_id = (r.mapTo) ?  r.mapTo : null;
        let popeEstimates = r.popeEstimates;
        for (let i = 0; i < popeEstimates.length ; i++) {
          replacementPopulation.push([popeEstimates[i][0],cbsa_id, popeEstimates[i][1], timeNow, timeNow]);
        }
        replacementArray.push([name, cbsa_id, timeNow, timeNow]);
      })
 
       // population estimate
      let replacementStringPop = replacementPopulation.map(a => '(?)').join(',');
      let instertStringPop =  'insert into population ( year, cbsa_id, number, created_at, updated_at  ) values '+ replacementStringPop;
 
       // zip 
      zipKeys.forEach((key) => {
        let cbsaId = zipMap[key];
        if (cbsaMap[cbsaId].mapTo) {
          replacementZip.push([key, cbsaMap[cbsaId].mapTo, timeNow, timeNow]);
        }
      });
       
      let replacementStringZip = replacementZip.map(a => '(?)').join(',');
      let instertStringZip = 'insert into zip_to_cbsa ( zip_code, cbsa_id, created_at, updated_at ) values '+ replacementStringZip;
 
      cleanTables(sequelize).then((res) => {
        return sequelize.query(insertString, {replacements: replacementArray,type: Sequelize.QueryTypes.INSERT});
      }).then((response) => {
        return  sequelize.query(instertStringPop, { replacements: replacementPopulation, type: Sequelize.QueryTypes.INSERT })
      }).then((response) => {
        return  sequelize.query(instertStringZip, { replacements: replacementZip, type: Sequelize.QueryTypes.INSERT })
      }).then((response) => {
        resolve(response);
      }).catch((error) => {
        reject(error);
      });
    });
  return promise;
};

PostGresUtils.sync = (callback) => {
  let sequelize;
  connectToPostGres()
  .then((res) => {
    sequelize = res;
    return getZipToCBSA();
  }).then((res) => {
    return getCBSAToMSA(res);
  }).then((res) => {
    return SyncToMSADB(sequelize, res);        
  }).then((res) =>{
    callback(null,res);
  }).catch((err) => {
    callback(err);
  });
};

module.exports = PostGresUtils;

