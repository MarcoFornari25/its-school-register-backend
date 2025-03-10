require("dotenv").config();
const mysql = require('mysql2');

var connection = mysql.createPool({
    host: process.env.HOST,
    // port: 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    multipleStatements: true
});

connection.getConnection((err) => {
    if (err) console.log(JSON.stringify(err));
    else {
        console.log('Connected!')
    }
});

module.exports = connection.promise();