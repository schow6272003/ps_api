'use strict';
const express = require("express");
const router = express.Router();
const MongoDbUtils = require('../../utilities/mongo_db/mondbUtil.js');

router.get("/v1/cbsa/find", (req, res, next) => {
  let request = (Object.keys(req.body).length > 0) ? req.body : req.query;
  if (request.reddis_option == "no") {
    MongoDbUtils.searchDocumentsNoRedis(request)
    .then((response) => {
      res.status(response.status).json(response.result);
    }).catch((err) => {
      res.status(err.status).json({message: err.message});
    })
  } else {
    MongoDbUtils.searchDocuments(request)
    .then((response) => {
      res.status(response.status).json({data: response.result});
    }).catch((err) => {
      res.status(err.status).json({message: err.message});
    })
  }
});

router.get("/find_all", (req, res, next) => {
  MongoDbUtils.showAll({}, (err, data) => {
    res.send(data);
  });
});

router.get("/", (req, res, next) => {});

module.exports = router;
