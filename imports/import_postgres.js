'use strict';
const PostGresUtils = require('../utilities/post_gres/postGresUtil.js');

PostGresUtils.sync((err, res) => {
  console.log("==== migrate data to postgress");
  if (err) {
    console.log(err);
  } else {
    console.log(res);
  }
}); 