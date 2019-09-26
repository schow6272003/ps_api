# PeerStreet Node Restful API Server 

## Overview
This is to implement Restful API server for PeerStreet Challenge.

### Repositories:
  - [PeerStreet Challenge](https://github.com/schow6272003/peer_street_challenge)
  - [Ruby Client Gem](https://github.com/schow6272003/ps_gem.git)
  - [Demo Site](https://github.com/schow6272003/ps_app)

## Features
  - User can search CBSA records with either zip code, cbsa code or MSA name.
  - multiple values are alowed  on zip code and cbsa code fields.
  - Enable to use keyword to search against MSA name.
  
 ## Stack
   - Node.js
   - Postgres 
   - MongoDB
   - Redis

## Design
### Database:
The tasks of querying(input) and storage(ouput) are designated to two separate resources respectfully. Postgres handles storage of CBSA data fetched remotely via  AWS Url. The records from Postgres are parsed into Json format and migrated to MongoDB. Incoming api requests are handled by MongoDB. Redis caching is used to enhance performance.
### Data Import:
CBSA raw data are pulled remotely via AWS Url and dumped into Postgres for storage. 
### Security:
- Cross-origin resource sharing enable.
- HTTPS/SSL.
- Rating Limiting set to 10 calls.
- Basic security measures are put in place using Node plug-in "helmet".
### Versioning:
Versioning is defined on uri, in order to facilitate and manage future updates on API.
eg: /api/v1/cpsa/....
### Improvemnts: 
- Backend jobs to do regular update on databases.
- AWS Beantalk and DynamoDB instead of Heroku for better scaling and performance.
- Add pagination to endpoint.
- Add authentication to secure endpoint.

## Usage
 
 ### Endpoint
```
url: "https://pstreet-api.herokuapp.com/api/v1/cbsa/find"
method: Get
```
##### Fields Definition:
| Items  | Description | Type  | 
| :------------ |:---------------:| -----:|
| cbsa_ids      | CBSA Codes| Array | 
| zip_codes     | Zip Codes   |  Array|
| name          | MSA Name  |  String |

##### Request Url Example:<br>
```
https://pstreet-api.herokuapp.com/api/v1/cbsa/find?cbsa_ids[]=11260
```
```javascript
{
  cbsa_ids: [11260, 1150],
  zip_codes: [91820, 3433],
  name: "Mar Visa"
}
 ```

### Response
   
 #### Fields Definition:

   | Items | Description | Type |
   | :------------ |:--------------- |:----- |
   | id   | Primary Key | String|
   | count | # of Records | Integer|
   | records[][cbsa_id] | CBSA Code | Integer|
   | records[][zip_code] |  Zip Code | Array |
   | records[][name] | MSA Name | String|
   | records[][pop_estimate] | Populations | Array |
   | records[][pop_estimate][year] | Year | Integer|
   | records[][pop_estimate][number] | # of Population Per Year | Integer|


#### Returned Json response:
```javascript
{
  "data": {
    "count": 1,
    "records": [
      {
        "_id": "5d88ddf2a6016f5e876ee85b",
        "cbsa_id": 11260,
        "name": "Anchorage, AK",
        "zip_code": [ 99501,99502,99503],
        "pop_estimate": [
          {
            "year": 2010,
            "number": 383166
          },
          {
            "year": 2011,
            "number": 388174
          },
          {
            "year": 2012,
            "number": 392404
          },
          {
            "year": 2013,
            "number": 397414
          },
          {
            "year": 2014,
            "number": 398642
          },
          {
            "year": 2015,
            "number": 399790
          }
        ]
      }
    ]
  }
}
```

<details>
<summary>Installation Steps</summary>

#### 1. Install and Run PostgreSQL
Refer to Postgres documentation for setup instructions on local machine.
https://www.postgresql.org/docs/

#### 2. Install and Run MongoDB 
Refer to Postgres documentation for setup instructions on local machine.
https://docs.mongodb.com/

#### 3. Install and Run Redis 
Refer to Postgres documentation for setup instructions on local machine.
https://redis.io/documentation

#### 4. Setup and Run Node.js
- ##### Pull base code from git repository to your local machine
```
git clone https://github.com/schow6272003/ps_api
cd ps_api
```
- ##### Install Node dependencies
```
npm install
```
- ##### Create .env file
```
DB= (Postgres database name)
DB_HOST= (Postgres database host)
DB_USER= (Postgres database username)
DB_PASS= (Postgres database password)
cbsa=https://s3.amazonaws.com/peerstreet-static/engineering/zip_to_msa/zip_to_cbsa.csv
msa=https://s3.amazonaws.com/peerstreet-static/engineering/zip_to_msa/cbsa_to_msa.csv
MetStatString='Metropolitan Statistical Area'
MONGODB= (Mongodb database name)
MONGDB_COLLECTION= (Mongodb collection)
MONGODB_HOST= (Mongodb database host)
```
- ##### Setup Config.js for Sequelizer
```javascript
require('dotenv').config();
module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB,
    host: process.env.DB_HOST,
    dialect: "postgres",
    operatorsAliases: false
  },
  test: {
    username: 'database_test',
    password: null,
    database: 'database_test',
    host: '127.0.0.1',
    dialect: 'postgres'
  },
  production: {
    username: 'database_production',
    password: null,
    database: 'database_production',
    host: 'database_production_host',
    dialect: "postgres",
    operatorsAliases: false
  }
};
```
- ##### Setup .sequelizerc 
```javascript
const path = require('path');
module.exports = {
  'config': path.resolve('config', 'config.js')
}
```

- ##### Setup .babelrc for Babel 
```javascript
{
  "presets": [
    "@babel/preset-env"
  ]
}
```

- ##### Run migrations on Postgres with Sequelizer
```
npx sequelize db:migrate
```

- ##### Fetch CBSA data remotely to Postgres database
```
node imports/import_postgres.js
```
- ##### Import and parse CBSA data to Mongodb from Postgres
```
node imports/import_mongodb.js
```
- ##### Run Node.js Server
```
nodemon app.js
```
</details>