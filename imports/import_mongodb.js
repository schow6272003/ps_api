'use strict';
const MongoDbUtils = require('../utilities/mongo_db/mondbUtil.js');

// Create mongodb database, collection and 
// migrate CBSA records from Postgres database.
MongoDbUtils.createCollection((err, res) => {
  console.log("=== create collection");
  if (err) {
    console.log(err);
  } else {
    console.log(res);
  }

  MongoDbUtils.migrateDocuments((err, res) => {
    console.log("==== migrate documents");
    if (err) {
      console.log(err);
    } else {
      console.log(res);
    }
  });
});

