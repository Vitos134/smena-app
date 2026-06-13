const { Pool } = require('pg');
require('dotenv').config();

// Создаем "бассейн" подключений, используя настройки из нашего сейфа (.env)
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

// Разрешаем другим файлам (например, server.js) использовать это подключение
module.exports = pool;