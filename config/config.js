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
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB,
    host: process.env.DB_HOST,
    dialect: "postgres",
    operatorsAliases: false
  }
};