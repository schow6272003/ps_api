const PostGresUtils = require('../model/post_gres/postGresUtil.js');

PostGresUtils.sync(function(err, res){
    console.log("==== migrate data to postgress");
    if (err) {
      console.log(err);
    } else {
      console.log(res);
    }
}); 