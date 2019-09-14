const MongoDbUtils = require('../model/mongo_db/mondbUtil.js');

// Create mongodb database, collection and 
// migrate CBSA records from Postgres database.
MongoDbUtils.createCollection(function(err, res){
  console.log("=== create collection");
  if (err) {
    console.log(err);
  } else {
    console.log(res);
  }

  MongoDbUtils.migrateDocuments(function(err, res){
    console.log("==== migrate documents");
    if (err) {
      console.log(err);
    } else {
      console.log(res);
    }
  });
});

