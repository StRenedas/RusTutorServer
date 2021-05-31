const mysql = require('mysql');
const config = require('./config');

module.exports = mysql.createPool ({
    host: config.HOST,
    user: config.DBUSER,
    password: config.DBPASSWORD,
    database: config.DBNAME,
    jwt: config.JWTSECRET,
    connectionLimit: 10
});

