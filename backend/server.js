require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db'); 
const auth = require('./auth'); 
const dns = require('dns');
const dnsPromises = dns.promises;

// Принудительно заставляем Node.js использовать публичные DNS Google
// Это решает проблему ECONNREFUSED на локальных компьютерах
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

// ==========================================
// БАЗОВЫЕ НАСТРОЙКИ СЕРВЕРА
// ==========================================
app.use(cors()); 
app.use(express.json()); 

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
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });


// ==========================================
// 1. МАРШРУТЫ АВТОРИЗАЦИИ
// ==========================================

// --- РЕГИСТРАЦИЯ С УМНОЙ ПРОВЕРКОЙ ДОМЕНА И ТРАНЗАКЦИЯМИ ---
app.post('/api/register', async (req, res) => {
    // Выделяем отдельного "клиента" базы данных для транзакции
    const client = await pool.connect();

    try {
        const { email, password } = req.body;

        // 1. Проверяем формат и вытаскиваем домен
        const emailParts = email.split('@');
        if (emailParts.length !== 2) {
            return res.status(400).json({ error: 'Неверный формат email.' });
        }
        const domain = emailParts[1];

        // 2. DNS-запрос: спрашиваем у интернета, существует ли домен
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

        // ==========================================
        // 3. НАЧАЛО ТРАНЗАКЦИИ (Защита от мусорных данных)
        // ==========================================
        await client.query('BEGIN');

        // Шаг А: Создаем пользователя
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await client.query(
            'INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, 1) RETURNING *', 
            [email, hashedPassword]
        );

        // Шаг Б: Создаем профиль (Передаем пустые строки, чтобы избежать ошибки NOT NULL)
        await client.query(
            'INSERT INTO profiles (user_id, fio, phone, address) VALUES ($1, $2, $3, $4)', 
            [newUser.rows[0].user_id, '', '', '']
        );

        // Шаг В: Если обе команды прошли успешно — сохраняем всё!
        await client.query('COMMIT');
        // ==========================================

        res.status(201).json({ message: 'Регистрация успешна!' });
    } catch (err) {
        // ЕСЛИ БЫЛА ОШИБКА (на любом шаге) — ОТМЕНЯЕМ И УДАЛЯЕМ ПОЛЬЗОВАТЕЛЯ ИЗ БАЗЫ!
        await client.query('ROLLBACK');

        console.error('Ошибка регистрации:', err.message);
        if (err.code === '23505') { 
            return res.status(400).json({ error: 'Пользователь с таким Email уже существует!' });
        }
        
        // ВЫВОДИМ ТОЧНУЮ ОШИБКУ, ЧТОБЫ НЕ ГАДАТЬ
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    } finally {
        // Обязательно возвращаем клиента обратно пулу (освобождаем память)
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

        const token = jwt.sign(
            { userId: user.rows[0].user_id, roleId: user.rows[0].role_id }, 
            process.env.JWT_SECRET, 
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [hashedPassword, email]
        );

        res.json({ message: 'Пароль успешно изменен! Теперь вы можете войти.' });
    } catch (err) {
        console.error('Ошибка сброса пароля:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при сбросе пароля' });
    }
});


// ==========================================
// 2. МАРШРУТЫ ПРОФИЛЯ РОДИТЕЛЯ
// ==========================================

app.get('/api/profile', auth, async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT email, phone, fio, address FROM users WHERE user_id = $1', 
            [req.user.userId]
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
            [fio, phone, address, req.user.userId]
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
            [req.user.userId]
        );
        res.json(children.rows);
    } catch (err) {
        console.error('Ошибка получения списка детей:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/children', auth, async (req, res) => {
    try {
        const { fio, birth_date, snils, oms, additional_info, address } = req.body;

        const existingChild = await pool.query('SELECT * FROM children WHERE snils = $1', [snils]);
        if (existingChild.rows.length > 0) {
            return res.status(400).json({ error: 'Ребенок с таким СНИЛС уже добавлен в систему!' });
        }

        const newChild = await pool.query(
            'INSERT INTO children (parent_id, fio, birth_date, snils, oms, additional_info, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [req.user.userId, fio, birth_date, snils, oms, additional_info, address]
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
            [fio, birth_date, snils, oms, additional_info, address, id, req.user.userId]
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
        await pool.query('DELETE FROM children WHERE child_id = $1 AND parent_id = $2', [id, req.user.userId]);
        
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
        const query = `
            SELECT s.shift_id, s.start_date, s.end_date, s.price, p.name as program_name 
            FROM shifts s 
            JOIN programs p ON s.program_id = p.program_id
        `;
        const shifts = await pool.query(query);
        res.json(shifts.rows);
    } catch (err) {
        console.error('Ошибка получения смен:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/documents', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }
        
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
        const docs = await pool.query(
            'SELECT * FROM documents WHERE child_id = $1', 
            [req.params.childId]
        );
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
                fs.unlinkSync(filePath);
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

app.post('/api/applications', auth, async (req, res) => {
    try {
        const { child_id, shift_id, season, accommodation_type, shift_number } = req.body;
        const newApp = await pool.query(
            'INSERT INTO applications (child_id, shift_id, status_id, season, accommodation_type, shift_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', 
            [child_id, shift_id, 1, season, accommodation_type, shift_number]
        );
        res.status(201).json({ application: newApp.rows[0] });
    } catch (err) {
        console.error('Ошибка подачи заявки:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ИЗМЕНЕНО: Добавлено приклеивание чека (amount, card_mask, payment_date)
app.get('/api/applications', auth, async (req, res) => {
    try {
        const apps = await pool.query(`
            SELECT 
                a.application_id as app_id, 
                c.fio, 
                s.code, 
                s.price,
                st.name as status_name, 
                a.rejection_reason,
                p.amount,
                p.card_mask,
                p.payment_date
            FROM applications a 
            JOIN children c ON a.child_id = c.child_id 
            JOIN shifts s ON a.shift_id = s.shift_id 
            JOIN application_statuses st ON a.status_id = st.status_id 
            LEFT JOIN payments p ON a.application_id = p.application_id
            WHERE c.parent_id = $1 
            ORDER BY a.application_id DESC
        `, [req.user.userId]);
        res.json(apps.rows);
    } catch (err) {
        console.error('Ошибка получения заявок родителя:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/applications/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const appCheck = await pool.query(`
            SELECT a.application_id 
            FROM applications a 
            JOIN children c ON a.child_id = c.child_id 
            WHERE a.application_id = $1 AND c.parent_id = $2
        `, [id, req.user.userId]);

        if (appCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Заявка не найдена или у вас нет прав на ее отмену.' });
        }

        await pool.query('DELETE FROM applications WHERE application_id = $1', [id]);
        res.json({ message: 'Заявка успешно отменена!' });
    } catch (err) {
        console.error('Ошибка отмены заявки:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при отмене заявки' });
    }
});


// ==========================================
// 6. АДМИН-ПАНЕЛЬ (ТОЛЬКО ДЛЯ МЕНЕДЖЕРОВ)
// ==========================================

// ИЗМЕНЕНО: Добавлено приклеивание чека (payment_amount, card_mask, payment_date)
app.get('/api/admin/applications', auth, async (req, res) => {
    try {
        if (req.user.roleId !== 2) {
            return res.status(403).json({ error: 'Доступ запрещен.' });
        }
        
        const apps = await pool.query(`
            SELECT 
                a.application_id as app_id, 
                a.rejection_reason, 
                c.child_id, 
                c.fio as child_fio, 
                c.birth_date, 
                c.snils, 
                c.oms, 
                c.additional_info, 
                c.address as child_address, 
                c.is_blacklisted, 
                c.blacklist_reason, 
                u.email as parent_email, 
                u.phone as parent_phone, 
                u.fio as parent_fio, 
                u.address as parent_address, 
                s.code as shift_code, 
                st.name as status_name,
                p.amount as payment_amount,
                p.card_mask,
                p.payment_date
            FROM applications a 
            JOIN children c ON a.child_id = c.child_id 
            JOIN users u ON c.parent_id = u.user_id 
            JOIN shifts s ON a.shift_id = s.shift_id 
            JOIN application_statuses st ON a.status_id = st.status_id 
            LEFT JOIN payments p ON a.application_id = p.application_id
            ORDER BY a.application_id DESC
        `);
        res.json(apps.rows);
    } catch (err) {
        console.error('Ошибка сборки данных для админа:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/applications/:id/status', auth, async (req, res) => {
    try {
        if (req.user.roleId !== 2) {
            return res.status(403).json({ error: 'Доступ запрещен.' });
        }
        
        const { status_id, rejection_reason } = req.body;

        await pool.query(
            'UPDATE applications SET status_id = $1, rejection_reason = $2 WHERE application_id = $3', 
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
        if (req.user.roleId !== 2) {
            return res.status(403).json({ error: 'Доступ запрещен.' });
        }
        
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


// ==========================================
// 7. СИСТЕМА ОПЛАТЫ (ЭКВАЙРИНГ)
// ==========================================

app.post('/api/payments', auth, async (req, res) => {
    try {
        const { application_id, amount, card_number } = req.body;
        
        const cardMask = '**** **** **** ' + card_number.slice(-4);

        await pool.query(
            'INSERT INTO payments (application_id, amount, card_mask) VALUES ($1, $2, $3)',
            [application_id, amount, cardMask]
        );

        await pool.query(
            'UPDATE applications SET status_id = 4 WHERE application_id = $1',
            [application_id]
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
    console.log(`Сервер запущен и слушает порт ${PORT}`); 
});