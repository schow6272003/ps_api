const express = require("express");
const router = express.Router();
const MongoDbUtils = require('./../../model/mongo_db/mondbUtil.js');
const PostGresUtils = require('./../../model/post_gres/postGresUtil.js');

router.get("/cbsa", function(req, res, next) {
  let request = (Object.keys(req.body).length > 0) ? req.body : req.query;
  MongoDbUtils.searchDocuments(request)
   .then(function(response) {
    res.send(response);
   }).catch(function(error) {
    res.send(error);
   })
 });

 router.get("/", function(req, res, next) {
  PostGresUtils.sync(function(err, response){
    console.log(response);
    res.send("hello");
  }); 

  
 });

module.exports = router;
