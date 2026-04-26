const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2'); // Explicitly required for Vercel bundling
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    database: process.env.DB_NAME || 'railway',
    username: process.env.DB_USER || 'railway',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD,
    host: process.env.DB_HOST || 'shortline.proxy.rlwy.net',
    port: process.env.DB_PORT || 35346,
};

const connectionString = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    dialectModule: mysql2, // Critical fix for Vercel
    logging: false,
    dialectOptions: {
        connectTimeout: 60000,
        ssl: {
            rejectUnauthorized: false
        }
    }
});

const connectDB = async () => {
    try {
        const hostInfo = connectionString ? 'URL' : `${dbConfig.host}:${dbConfig.port}`;
        console.log(`Attempting to connect to MySQL via ${hostInfo} as user ${dbConfig.username}...`);
        await sequelize.authenticate();
        console.log('✅ MySQL Connected (Sequelize)');
    } catch (error) {
        console.error('❌ MySQL Connection Error:', error.message);
        if (error.original) {
            console.error('Details:', error.original.sqlMessage || error.original.message);
        }
        console.log('Current Config (Masked Password):', {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.username,
            database: dbConfig.database,
            hasPassword: !!dbConfig.password
        });
    }
};

module.exports = { sequelize, connectDB };
