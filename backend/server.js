require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Используем bcrypt, который мы установили
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const dns = require('dns');
const dnsPromises = dns.promises;
const ExcelJS = require('exceljs'); // Библиотека для выгрузки отчетов в Excel (FR-21)

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
    password: process.env.DB_PASSWORD || 'Jndfkbrjpkbyf214', 
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

// Регистрация с DNS-проверкой существования домена и транзакциями
app.post('/api/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password } = req.body;
        const emailParts = email.split('@');
        if (emailParts.length !== 2) {
            return res.status(400).json({ error: 'Неверный формат email.' });
        }
        const domain = emailParts[1];

        // DNS-запрос (Проверка существования почтового домена)
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
        
        // Создаем пользователя в таблице users
        const newUser = await client.query(
            'INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, 1) RETURNING *', 
            [email, hashedPassword]
        );

        await client.query('COMMIT'); // Завершаем транзакцию при успехе
        res.status(201).json({ message: 'Регистрация успешна!' });
    } catch (err) {
        await client.query('ROLLBACK'); // Откат изменений в БД в случае ошибки
        console.error('Ошибка регистрации:', err.message);
        if (err.code === '23505') { 
            return res.status(400).json({ error: 'Пользователь с таким Email уже существует!' });
        }
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    } finally {
        client.release();
    }
});

// Вход в систему (Логин)
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

        // Записываем user_id и role_id в токен
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

// Сброс и восстановление пароля
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
// 2. МАРШРУТЫ ПРОФИЛЯ РОДИТЕЛЯ
// ==========================================

// Получить данные профиля
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

// Обновить данные профиля
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

// Получить список детей текущего родителя
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

// Добавить новую анкету ребенка (С автоматическим "подсасыванием" адреса)
app.post('/api/children', auth, async (req, res) => {
    try {
        let { fio, birth_date, snils, oms, additional_info, address } = req.body;

        const existingChild = await pool.query('SELECT * FROM children WHERE snils = $1', [snils]);
        if (existingChild.rows.length > 0) {
            return res.status(400).json({ error: 'Ребенок с таким СНИЛС уже добавлен в систему!' });
        }

        // Если адрес прописки ребенка не введен — автоматически берем адрес родителя
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

// Отредактировать анкету ребенка
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

// Удалить анкету ребенка (Каскадно чистит документы и заявки)
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
// 4. МАРШРУТЫ СМЕН И ДОКУМЕНТОВ
// ==========================================

// Получить список всех доступных смен
app.get('/api/shifts', async (req, res) => {
    try {
        const shifts = await pool.query('SELECT shift_id, start_date, end_date, shift_code, program_name, capacity FROM shifts');
        res.json(shifts.rows);
    } catch (err) {
        console.error('Ошибка получения смен:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузка нового файла/скана документа для ребенка через Multer
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

// Получить список загруженных документов ребенка
app.get('/api/documents/:childId', auth, async (req, res) => {
    try {
        const docs = await pool.query('SELECT * FROM documents WHERE child_id = $1', [req.params.childId]);
        res.json(docs.rows);
    } catch (err) {
        console.error('Ошибка получения документов:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить документ (Чистит и запись в БД, и физический файл с жесткого диска)
app.delete('/api/documents/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await pool.query('SELECT * FROM documents WHERE document_id = $1', [id]);
        
        if (doc.rows.length > 0) {
            const filePath = path.join(__dirname, doc.rows[0].file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Удаляем физически с компьютера
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

// Подать новую заявку на смену (Умная проверка мест, ЧС и ДОКУМЕНТОВ)
app.post('/api/applications', auth, async (req, res) => {
    try {
        const { child_id, shift_id, season, accommodation_type, shift_number, friend_request } = req.body;

        // --- ПРОВЕРКА 1: Черный список ---
        const childCheck = await pool.query(
            'SELECT is_blacklisted, blacklist_reason FROM children WHERE child_id = $1 AND parent_id = $2',
            [child_id, req.user.user_id]
        );
        if (childCheck.rows.length === 0) return res.status(404).json({ error: 'Анкета ребенка не найдена.' });
        
        if (childCheck.rows[0].is_blacklisted) {
            return res.status(403).json({ 
                error: `Подача заявки заблокирована! Ребенок в черном списке. Причина: ${childCheck.rows[0].blacklist_reason}` 
            });
        }

        // --- ПРОВЕРКА 2: Наличие всех обязательных документов (FR-05) ---
        const docsCheck = await pool.query('SELECT document_type FROM documents WHERE child_id = $1', [child_id]);
        const uploadedTypes = docsCheck.rows.map(d => d.document_type);
        const requiredTypes = ['Свидетельство о рождении', 'Полис ОМС', 'Мед. справка 079/у'];
        
        // Ищем, каких обязательных документов не хватает
        const missingDocs = requiredTypes.filter(type => !uploadedTypes.includes(type));

        if (missingDocs.length > 0) {
            return res.status(400).json({ 
                error: `Отказ системы! Для подачи заявки необходимо загрузить недостающие документы: ${missingDocs.join(', ')}` 
            });
        }

        // --- ПРОВЕРКА 3: Контроль свободных мест ---
        const shiftData = await pool.query('SELECT capacity FROM shifts WHERE shift_id = $1', [shift_id]);
        if (shiftData.rows.length === 0) return res.status(404).json({ error: 'Указанная смена не найдена.' });
        const maxCapacity = shiftData.rows[0].capacity;

        const countApps = await pool.query(
            'SELECT COUNT(*) FROM applications WHERE shift_id = $1 AND status_id IN (1, 2, 4)', 
            [shift_id]
        );
        const currentOccupied = parseInt(countApps.rows[0].count);
        if (currentOccupied >= maxCapacity) {
            return res.status(400).json({ error: 'К сожалению, на выбранную смену больше нет свободных мест!' });
        }

        // --- РАСЧЕТ СТОИМОСТИ ---
        let price = 35000;
        if (accommodation_type === 'Корпус улучшенный') price = 45000;
        if (accommodation_type === 'Глэмпинг') price = 55000;

        // --- СОХРАНЕНИЕ ЗАЯВКИ ---
        const newApp = await pool.query(
            `INSERT INTO applications (child_id, shift_id, season, accommodation_type, shift_number, price, status_id, friend_request) 
            VALUES ($1, $2, $3, $4, $5, $6, 1, $7) RETURNING *`,
            [child_id, shift_id, season, accommodation_type, shift_number || 1, price, friend_request || null]
        );
        res.status(201).json({ message: 'Заявка успешно создана', application: newApp.rows[0] });
    } catch (err) {
        console.error('Ошибка подачи заявки:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при подаче заявки.' });
    }
});

// Получить список всех заявок текущего родителя
app.get('/api/applications', auth, async (req, res) => {
    try {
        const apps = await pool.query(`
            SELECT 
                a.app_id, c.fio, s.shift_code as code, a.price, a.accommodation_type,
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

// Отменить (удалить) заявку родителем
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
// 6. АДМИН-ПАНЕЛЬ (ТОЛЬКО ДЛЯ МЕНЕДЖЕРОВ)
// ==========================================

// Получить абсолютно все заявки в системе для панели менеджера
app.get('/api/admin/applications', auth, async (req, res) => {
    try {
        if (req.user.role_id !== 2) return res.status(403).json({ error: 'Доступ запрещен.' });
        
        const apps = await pool.query(`
            SELECT 
                a.app_id, a.rejection_reason, c.child_id, c.fio as child_fio, 
                c.birth_date, c.snils, c.oms, c.additional_info, c.address as child_address, 
                c.is_blacklisted, c.blacklist_reason, u.email as parent_email, 
                u.phone as parent_phone, u.fio as parent_fio, u.address as parent_address, 
                s.shift_code, st.status_name, a.friend_request, a.accommodation_type,
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

// НОВЫЙ МАРШРУТ: Получить базу АБСОЛЮТНО ВСЕХ ДЕТЕЙ для менеджера (даже без активных заявок)
app.get('/api/admin/children', auth, async (req, res) => {
    try {
        if (req.user.role_id !== 2) return res.status(403).json({ error: 'Доступ запрещен.' });
        
        const children = await pool.query(`
            SELECT 
                c.child_id, c.fio as child_fio, c.birth_date, c.snils, c.oms, 
                c.additional_info, c.address as child_address, 
                c.is_blacklisted, c.blacklist_reason, 
                u.fio as parent_fio, u.phone as parent_phone, u.email as parent_email 
            FROM children c 
            JOIN users u ON c.parent_id = u.user_id 
            ORDER BY c.child_id DESC
        `);
        res.json(children.rows);
    } catch (err) {
        console.error('Ошибка сборки базы детей:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Изменить статус заявки (Одобрить / Отклонить с указанием причины)
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

// Управление Черным Списком детей (Блокировка / Разблокировка)
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

// Добавление новой смены менеджером (С возможностью указать лимит мест capacity)
app.post('/api/admin/shifts', async (req, res) => {
    try {
        const { program_name, shift_code, start_date, end_date, capacity } = req.body;
        
        if (!program_name || !shift_code || !start_date || !end_date) {
            return res.status(400).json({ error: 'Пожалуйста, заполните все обязательные поля!' });
        }

        const finalCapacity = capacity ? parseInt(capacity) : 30; // 30 мест по умолчанию, если не указано

        const result = await pool.query(
            'INSERT INTO shifts (program_name, shift_code, start_date, end_date, capacity) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [program_name, shift_code, start_date, end_date, finalCapacity]
        );
        res.status(201).json({ message: 'Смена успешно добавлена', shift: result.rows[0] });
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

        // Обновляем заявку напрямую и записываем чек, так как отдельная таблица удалена ради удобства
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
// 8. ЭКСПОРТ ОТЧЕТОВ В EXCEL (FR-21)
// ==========================================
app.get('/api/admin/export/applications', auth, async (req, res) => {
    try {
        if (req.user.role_id !== 2) return res.status(403).json({ error: 'Доступ запрещен.' });

        const apps = await pool.query(`
            SELECT 
                a.app_id, c.fio as child_fio, c.birth_date, c.snils, 
                u.fio as parent_fio, u.phone, u.email,
                s.shift_code, a.accommodation_type, st.status_name, 
                a.price, a.payment_amount, a.friend_request, a.created_at
            FROM applications a 
            JOIN children c ON a.child_id = c.child_id 
            JOIN users u ON c.parent_id = u.user_id 
            JOIN shifts s ON a.shift_id = s.shift_id 
            JOIN statuses st ON a.status_id = st.status_id 
            ORDER BY a.app_id DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Реестр заявок');

        worksheet.columns = [
            { header: '№ Заявки', key: 'app_id', width: 10 },
            { header: 'Дата подачи', key: 'created_at', width: 15 },
            { header: 'ФИО Ребенка', key: 'child_fio', width: 35 },
            { header: 'СНИЛС', key: 'snils', width: 15 },
            { header: 'Родитель', key: 'parent_fio', width: 35 },
            { header: 'Телефон', key: 'phone', width: 18 },
            { header: 'Смена', key: 'shift_code', width: 15 },
            { header: 'Условия', key: 'accommodation_type', width: 20 },
            { header: 'Статус', key: 'status_name', width: 20 },
            { header: 'Сумма к оплате', key: 'price', width: 15 },
            { header: 'Оплачено', key: 'payment_amount', width: 15 },
            { header: 'Пожелания (друг)', key: 'friend_request', width: 25 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.addRows(apps.rows);

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { 
                const dateCell = row.getCell('created_at');
                if (dateCell.value) {
                    const date = new Date(dateCell.value);
                    dateCell.value = date.toLocaleDateString('ru-RU');
                }
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('Реестр_заявок_Смена.xlsx'));

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Ошибка выгрузки Excel:', err.message);
        res.status(500).json({ error: 'Ошибка сервера при выгрузке отчета' });
    }
});

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { 
    console.log(`Сервер "Смена" успешно запущен и слушает порт ${PORT}`); 
});