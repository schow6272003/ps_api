'use strict';
const express = require("express");
const router = express.Router();
const MongoDbUtils = require('../../utilities/mongo_db/mondbUtil.js');

router.get("/cbsa", function(req, res, next) {
  let request = (Object.keys(req.body).length > 0) ? req.body : req.query;
  if (request.reddis_option == "no") {
    console.log(request);
    MongoDbUtils.searchDocumentsNoRedis(request)
    .then(function(response) {
     res.status(response.status).json(response.result);
    }).catch(function(err) {
     res.status(err.status).json({message: err.message});
    })
  } else {
    MongoDbUtils.searchDocuments(request)
    .then(function(response) {
     res.status(response.status).json(response.result);
    }).catch(function(err) {
     res.status(err.status).json({message: err.message});
    })
  }
});

 router.get("/find_all", function(req, res, next) {
  MongoDbUtils.showAll({}, function(err, data){
    res.send(data);
  });
 });

router.get("/", function(req, res, next) {});

module.exports = router;
