require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Используем bcrypt, который мы уже установили
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const dns = require('dns');
const dnsPromises = dns.promises;

// Принудительно заставляем Node.js использовать публичные DNS Google
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

// ==========================================
// БАЗОВЫЕ НАСТРОЙКИ СЕРВЕРА И БД
// ==========================================
app.use(cors()); 
app.use(express.json()); 

// Подключение к БД напрямую здесь (заменяет старый ./db.js)
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'smena_db',
    password: process.env.DB_PASSWORD || 'Jndfkbrjpkbyf214', // 
    port: process.env.DB_PORT || 5432,
});

// Настройка папки для загрузки файлов (Multer)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir)); 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Защита от кириллицы в названиях файлов
        cb(null, Date.now() + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8'));
    }
});
const upload = multer({ storage: storage });

// Наша прослойка авторизации (заменяет старый ./auth.js)
const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Доступ запрещен, токен не предоставлен' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Неверный или просроченный токен' });
        req.user = user;
        next();
    });
};

// ==========================================
// 1. МАРШРУТЫ АВТОРИЗАЦИИ
// ==========================================

// Регистрация с DNS-проверкой и транзакциями
app.post('/api/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password } = req.body;
        const emailParts = email.split('@');
        if (emailParts.length !== 2) {
            return res.status(400).json({ error: 'Неверный формат email.' });
        }
        const domain = emailParts[1];

        // DNS-запрос
        try {
            const mxRecords = await dnsPromises.resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                return res.status(400).json({ error: 'Этот домен не принимает почту!' });
            }
        } catch (dnsErr) {
            if (dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'ENODATA') {
                return res.status(400).json({ error: 'Указан несуществующий домен почты!' });
            }
            console.warn('Сбой при проверке DNS. Пропускаем:', dnsErr.message);
        }

        await client.query('BEGIN'); // Старт транзакции
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Создаем пользователя (убрал ошибочный UPDATE, который тут был раньше)
        const newUser = await client.query(
            'INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, 1) RETURNING *', 
            [email, hashedPassword]
        );

        await client.query('COMMIT'); // Успех!
        res.status(201).json({ message: 'Регистрация успешна!' });
    } catch (err) {
        await client.query('ROLLBACK'); // Откат в случае ошибки
        console.error('Ошибка регистрации:', err.message);
        if (err.code === '23505') { 
            return res.status(400).json({ error: 'Пользователь с таким Email уже существует!' });
        }
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    } finally {
        client.release();
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Неверная почта или пароль' });
        }
        
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Неверная почта или пароль' });
        }

        // ВАЖНО: сохраняем user_id в токен, чтобы работало везде
        const token = jwt.sign(
            { user_id: user.rows[0].user_id, role_id: user.rows[0].role_id }, 
            process.env.JWT_SECRET || 'secret_key', 
            { expiresIn: '24h' }
        );
        
        res.json({ token, role_id: user.rows[0].role_id });
    } catch (err) {
        console.error('Ошибка входа:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь с таким email не найден в системе!' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);

        res.json({ message: 'Пароль успешно изменен! Теперь вы можете войти.' });
    } catch (err) {
        console.error('Ошибка сброса пароля:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при сбросе пароля' });
    }
});


// ==========================================
// 2. ПРОФИЛЬ РОДИТЕЛЯ
// ==========================================
app.get('/api/profile', auth, async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT email, phone, fio, address FROM users WHERE user_id = $1', 
            [req.user.user_id]
        );
        res.json(user.rows[0]);
    } catch (err) {
        console.error('Ошибка загрузки профиля:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/profile', auth, async (req, res) => {
    try {
        const { fio, phone, address } = req.body;
        await pool.query(
            'UPDATE users SET fio = $1, phone = $2, address = $3 WHERE user_id = $4',
            [fio, phone, address, req.user.user_id]
        );
        res.json({ message: 'Профиль успешно обновлен!' });
    } catch (err) {
        console.error('Ошибка обновления профиля:', err.message);
        res.status(500).json({ error: 'Ошибка обновления профиля' });
    }
});


// ==========================================
// 3. МАРШРУТЫ РАБОТЫ С ДЕТЬМИ (CRUD)
// ==========================================
app.get('/api/children', auth, async (req, res) => {
    try {
        const children = await pool.query(
            'SELECT * FROM children WHERE parent_id = $1 ORDER BY child_id ASC', 
            [req.user.user_id]
        );
        res.json(children.rows);
    } catch (err) {
        console.error('Ошибка получения списка детей:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/children', auth, async (req, res) => {
    try {
        // Подсасывание адреса реализовано
        let { fio, birth_date, snils, oms, additional_info, address } = req.body;

        const existingChild = await pool.query('SELECT * FROM children WHERE snils = $1', [snils]);
        if (existingChild.rows.length > 0) {
            return res.status(400).json({ error: 'Ребенок с таким СНИЛС уже добавлен в систему!' });
        }

        if (!address || address.trim() === '') {
            const parentData = await pool.query('SELECT address FROM users WHERE user_id = $1', [req.user.user_id]);
            if (parentData.rows.length > 0 && parentData.rows[0].address) {
                address = parentData.rows[0].address; 
            }
        }

        const newChild = await pool.query(
            'INSERT INTO children (parent_id, fio, birth_date, snils, oms, additional_info, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [req.user.user_id, fio, birth_date, snils, oms, additional_info, address]
        );
        res.status(201).json({ message: 'Ребенок успешно добавлен', child: newChild.rows[0] });
    } catch (err) {
        console.error('Ошибка добавления ребенка:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/children/:id', auth, async (req, res) => {
    try {
        const { fio, birth_date, snils, oms, additional_info, address } = req.body;
        const { id } = req.params;

        const existingChild = await pool.query(
            'SELECT * FROM children WHERE snils = $1 AND child_id != $2', 
            [snils, id]
        );
        if (existingChild.rows.length > 0) {
            return res.status(400).json({ error: 'Этот СНИЛС уже привязан к другой анкете!' });
        }

        const updatedChild = await pool.query(
            'UPDATE children SET fio = $1, birth_date = $2, snils = $3, oms = $4, additional_info = $5, address = $6 WHERE child_id = $7 AND parent_id = $8 RETURNING *',
            [fio, birth_date, snils, oms, additional_info, address, id, req.user.user_id]
        );
        res.json({ message: 'Анкета успешно обновлена', child: updatedChild.rows[0] });
    } catch (err) {
        console.error('Ошибка обновления анкеты ребенка:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при обновлении' });
    }
});

app.delete('/api/children/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM documents WHERE child_id = $1', [id]);
        await pool.query('DELETE FROM applications WHERE child_id = $1', [id]);
        await pool.query('DELETE FROM children WHERE child_id = $1 AND parent_id = $2', [id, req.user.user_id]);
        res.json({ message: 'Анкета ребенка успешно удалена' });
    } catch (err) {
        console.error('Ошибка удаления ребенка:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при удалении' });
    }
});


// ==========================================
// 4. СМЕНЫ И ДОКУМЕНТЫ
// ==========================================
app.get('/api/shifts', async (req, res) => {
    try {
        // Запрос адаптирован: program_name теперь хранится прямо в shifts
        const shifts = await pool.query('SELECT shift_id, start_date, end_date, shift_code, program_name FROM shifts');
        res.json(shifts.rows);
    } catch (err) {
        console.error('Ошибка получения смен:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/documents', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не был загружен' });
        
        const fileUrl = '/uploads/' + req.file.filename;
        const newDoc = await pool.query(
            'INSERT INTO documents (child_id, document_type, file_path) VALUES ($1, $2, $3) RETURNING *', 
            [req.body.child_id, req.body.document_type, fileUrl]
        );
        res.status(201).json({ document: newDoc.rows[0] });
    } catch (err) {
        console.error('Ошибка загрузки файла:', err.message);
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
});

app.get('/api/documents/:childId', auth, async (req, res) => {
    try {
        const docs = await pool.query('SELECT * FROM documents WHERE child_id = $1', [req.params.childId]);
        res.json(docs.rows);
    } catch (err) {
        console.error('Ошибка получения документов:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/documents/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await pool.query('SELECT * FROM documents WHERE document_id = $1', [id]);
        
        if (doc.rows.length > 0) {
            const filePath = path.join(__dirname, doc.rows[0].file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Физически удаляем файл с компьютера
            }
            await pool.query('DELETE FROM documents WHERE document_id = $1', [id]);
            res.json({ message: 'Документ успешно удален' });
        } else {
            res.status(404).json({ error: 'Документ не найден' });
        }
    } catch (err) {
        console.error('Ошибка удаления документа:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при удалении документа' });
    }
});


// ==========================================
// 5. ЗАЯВКИ РОДИТЕЛЯ
// ==========================================
app.post('/api/applications', async (req, res) => {
    try {
        const { child_id, shift_id, season, accommodation_type, shift_number } = req.body;
        
        let price = 35000;
        if (accommodation_type === 'Корпус улучшенный') price = 45000;
        if (accommodation_type === 'Глэмпинг') price = 55000;

        const newApp = await pool.query(
            `INSERT INTO applications (child_id, shift_id, season, accommodation_type, shift_number, price, status_id) 
            VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING *`,
            [child_id, shift_id, season, accommodation_type, shift_number || 1, price]
        );
        res.status(201).json({ message: 'Заявка успешно создана', application: newApp.rows[0] });
    } catch (err) {
        console.error('Ошибка подачи заявки:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при подаче заявки.' });
    }
});

app.get('/api/applications', auth, async (req, res) => {
    try {
        // Запрос адаптирован: Оплата берется прямо из таблицы заявок
        const apps = await pool.query(`
            SELECT 
                a.app_id, c.fio, s.shift_code as code, a.price,
                st.status_name, a.rejection_reason,
                a.payment_amount as amount, a.card_mask, a.payment_date
            FROM applications a 
            JOIN children c ON a.child_id = c.child_id 
            JOIN shifts s ON a.shift_id = s.shift_id 
            JOIN statuses st ON a.status_id = st.status_id 
            WHERE c.parent_id = $1 
            ORDER BY a.app_id DESC
        `, [req.user.user_id]);
        res.json(apps.rows);
    } catch (err) {
        console.error('Ошибка получения заявок родителя:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/applications/:id', auth, async (req, res) => {
    try {
        const appCheck = await pool.query(`
            SELECT a.app_id FROM applications a 
            JOIN children c ON a.child_id = c.child_id 
            WHERE a.app_id = $1 AND c.parent_id = $2
        `, [req.params.id, req.user.user_id]);

        if (appCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Заявка не найдена или нет прав на отмену.' });
        }

        await pool.query('DELETE FROM applications WHERE app_id = $1', [req.params.id]);
        res.json({ message: 'Заявка успешно отменена!' });
    } catch (err) {
        console.error('Ошибка отмены заявки:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// ==========================================
// 6. АДМИН-ПАНЕЛЬ (ДЛЯ МЕНЕДЖЕРОВ)
// ==========================================
app.get('/api/admin/applications', auth, async (req, res) => {
    try {
        if (req.user.role_id !== 2) return res.status(403).json({ error: 'Доступ запрещен.' });
        
        const apps = await pool.query(`
            SELECT 
                a.app_id, a.rejection_reason, c.child_id, c.fio as child_fio, 
                c.birth_date, c.snils, c.oms, c.additional_info, c.address as child_address, 
                c.is_blacklisted, c.blacklist_reason, u.email as parent_email, 
                u.phone as parent_phone, u.fio as parent_fio, u.address as parent_address, 
                s.shift_code, st.status_name,
                a.payment_amount, a.card_mask, a.payment_date
            FROM applications a 
            JOIN children c ON a.child_id = c.child_id 
            JOIN users u ON c.parent_id = u.user_id 
            JOIN shifts s ON a.shift_id = s.shift_id 
            JOIN statuses st ON a.status_id = st.status_id 
            ORDER BY a.app_id DESC
        `);
        res.json(apps.rows);
    } catch (err) {
        console.error('Ошибка сборки данных для админа:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/applications/:id/status', auth, async (req, res) => {
    try {
        if (req.user.role_id !== 2) return res.status(403).json({ error: 'Доступ запрещен.' });
        const { status_id, rejection_reason } = req.body;

        await pool.query(
            'UPDATE applications SET status_id = $1, rejection_reason = $2 WHERE app_id = $3', 
            [status_id, rejection_reason || null, req.params.id]
        );
        res.json({ message: 'Статус успешно изменен!' });
    } catch (err) {
        console.error('Ошибка изменения статуса заявки:', err.message);
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
});

app.put('/api/admin/children/:id/blacklist', auth, async (req, res) => {
    try {
        if (req.user.role_id !== 2) return res.status(403).json({ error: 'Доступ запрещен.' });
        const { is_blacklisted, blacklist_reason } = req.body;

        await pool.query(
            'UPDATE children SET is_blacklisted = $1, blacklist_reason = $2 WHERE child_id = $3', 
            [is_blacklisted, is_blacklisted ? blacklist_reason : null, req.params.id]
        );
        res.json({ message: 'ЧС обновлен!' });
    } catch (err) {
        console.error('Ошибка обновления ЧС:', err.message);
        res.status(500).json({ error: 'Ошибка обновления ЧС' });
    }
});

app.post('/api/admin/shifts', async (req, res) => {
    try {
        const { program_name, shift_code, start_date, end_date } = req.body;
        const result = await pool.query(
            'INSERT INTO shifts (program_name, shift_code, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
            [program_name, shift_code, start_date, end_date]
        );
        res.status(201).json({ message: 'Смена добавлена', shift: result.rows[0] });
    } catch (err) {
        console.error('Ошибка добавления смены:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при добавлении смены.' });
    }
});

// ==========================================
// 7. СИСТЕМА ОПЛАТЫ (ЭКВАЙРИНГ)
// ==========================================
app.post('/api/payments', auth, async (req, res) => {
    try {
        const { application_id, amount, card_number } = req.body;
        const cardMask = '**** **** **** ' + card_number.slice(-4);

        // Обновляем заявку напрямую, так как таблица payments удалена из БД
        await pool.query(
            'UPDATE applications SET status_id = 4, payment_amount = $1, card_mask = $2, payment_date = NOW() WHERE app_id = $3',
            [amount, cardMask, application_id]
        );

        res.json({ message: 'Оплата успешно прошла! Чек сохранен в системе.' });
    } catch (err) {
        console.error('Ошибка при оплате:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при обработке платежа' });
    }
});

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { 
    console.log(`Сервер "Смена" запущен и слушает порт ${PORT}`); 
});