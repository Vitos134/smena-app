const jwt = require('jsonwebtoken');
require('dotenv').config();

// Эта функция и есть наш "охранник"
module.exports = function (req, res, next) {
    try {
        // 1. Ищем браслет в заголовках запроса (обычно он передается со словом Bearer)
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(403).json({ error: 'Нет доступа. Вы не вошли в систему!' });
        }

        // 2. Отделяем само слово "Bearer " от токена
        const token = authHeader.split(' ')[1];

        // 3. Проверяем токен нашей секретной печатью из .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Если всё отлично, записываем данные родителя (его ID) в запрос и открываем дверь (next)
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(403).json({ error: 'Браслет недействителен или просрочен!' });
    }
};