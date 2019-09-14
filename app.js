const express     = require("express");
const app         = express();
// const port        = 8000;
const http = require('http');
const port = process.env.PORT || 3000
const fs          = require('fs');
const CBSAV1 = require("./routes/cbsa/cbsa_routes_v1");
const cors = require('cors');
const bodyParser = require('body-parser');


// ===== HTTPS START =========================================================

// https = require('https');
// https.createServer({  
//     key: fs.readFileSync('../ssh-key/mapin7.key'),
//     cert: fs.readFileSync('../ssh-key/mapin7.crt')
// }, app).listen(port);

 const server = http.createServer(app);
  server.listen(port);
// ===== HTTPS END =========================================================


app.use(bodyParser.json({limit: '50mb'})); // support json encoded bodies
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000000 })); // support encoded bodies

app.use(function(req, res, next) {
 res.header("Access-Control-Allow-Origin", "*");
 res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 next();
});


app.get("/", function(req,res){
    res.send("Hello World!");
});

app.use('/api', CBSAV1);


// app.listen(port);