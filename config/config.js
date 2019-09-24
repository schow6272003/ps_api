module.exports = {
  development: {
    username: "postgres",
    password: "password",
    database: "peerstreet",
    host: "127.0.0.1",
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
    use_env_variable: process.env.DATABASE_URL
  }
};