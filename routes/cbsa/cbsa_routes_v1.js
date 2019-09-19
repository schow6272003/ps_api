const express = require("express");
const router = express.Router();
const MongoDbUtils = require('./../../model/mongo_db/mondbUtil.js');

router.get("/cbsa", function(req, res, next) {
  let request = (Object.keys(req.body).length > 0) ? req.body : req.query;
  MongoDbUtils.searchDocuments(request)
   .then(function(response) {
    res.status(response.status).json(response.result);
   }).catch(function(err) {
    res.status(err.status).json({message: err.message});
   })
 });

router.get("/", function(req, res, next) {});

module.exports = router;
