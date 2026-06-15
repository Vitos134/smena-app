import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И МАСКИ
// ==========================================
const formatDate = (value) => {
    const digits = value.replace(/\D/g, ''); 
    let formatted = '';
    if (digits.length > 0) formatted += digits.substring(0, 2);
    if (digits.length > 2) formatted += '.' + digits.substring(2, 4);
    if (digits.length > 4) formatted += '.' + digits.substring(4, 8);
    return formatted;
};

const formatSnils = (value) => {
    if (!value) return '';
    const digits = value.toString().replace(/\D/g, ''); 
    let formatted = '';
    if (digits.length > 0) formatted += digits.substring(0, 3);
    if (digits.length > 3) formatted += '-' + digits.substring(3, 6);
    if (digits.length > 6) formatted += '-' + digits.substring(6, 9);
    if (digits.length > 9) formatted += ' ' + digits.substring(9, 11);
    return formatted;
};

const formatOms = (value) => {
    if (!value) return '';
    const digits = value.toString().replace(/\D/g, ''); 
    let formatted = '';
    if (digits.length > 0) formatted += digits.substring(0, 4);
    if (digits.length > 4) formatted += ' ' + digits.substring(4, 8);
    if (digits.length > 8) formatted += ' ' + digits.substring(8, 12);
    if (digits.length > 12) formatted += ' ' + digits.substring(12, 16);
    return formatted;
};

const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    let formatted = '+7';
    if (digits.length > 1) formatted += ' (' + digits.substring(1, 4);
    if (digits.length > 4) formatted += ') ' + digits.substring(4, 7);
    if (digits.length > 7) formatted += '-' + digits.substring(7, 9);
    if (digits.length > 9) formatted += '-' + digits.substring(9, 11);
    return formatted;
};

const getBadgeColor = (statusName) => {
    if (!statusName) return '#fd7e14';
    const lowerName = statusName.trim().toLowerCase();
    if (lowerName.includes('одобр') || lowerName.includes('опла')) return '#28a745';
    if (lowerName.includes('отклон')) return '#dc3545';
    return '#fd7e14';
};

// ==========================================
// ГЛАВНЫЙ КОМПОНЕНТ APP
// ==========================================
function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || ''); 
  const [userRole, setUserRole] = useState(Number(localStorage.getItem('userRole')) || null);
  const [activeTab, setActiveTab] = useState('children');

  const fetchAPI = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setToken('');
    setUserRole(null);
  };

  if (!token) return <AuthScreen setToken={setToken} setUserRole={setUserRole} fetchAPI={fetchAPI} />;

  if (userRole === 2) return <AdminDashboard fetchAPI={fetchAPI} token={token} handleLogout={handleLogout} />;

  return (
    <div className="dashboard-container parent-container">
      <div className="header-bar">
        <h1 style={{ color: '#000' }}>Личный кабинет Родителя</h1>
        <button className="btn btn-secondary" onClick={handleLogout}>Выйти</button>
      </div>

      <div className="tabs-container no-print">
          <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 Мой профиль</button>
          <button className={`tab-button ${activeTab === 'children' ? 'active' : ''}`} onClick={() => setActiveTab('children')}>👦👧 Мои дети</button>
          <button className={`tab-button ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>📝 Мои заявки</button>
      </div>

      <div className="card">
          {activeTab === 'profile' && <Profile fetchAPI={fetchAPI} />}
          {activeTab === 'children' && <Children fetchAPI={fetchAPI} />}
          {activeTab === 'applications' && <Applications fetchAPI={fetchAPI} />}
      </div>
    </div>
  );
}

// ==========================================
// 1. КОМПОНЕНТ АВТОРИЗАЦИИ
// ==========================================
function AuthScreen({ setToken, setUserRole, fetchAPI }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [pdConsent, setPdConsent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        if (isResetMode) {
            await fetchAPI('/reset-password', { method: 'POST', body: JSON.stringify({ email, newPassword: password }) });
            alert('Пароль изменен!');
            setIsResetMode(false); setPassword(''); setMessage('');
        } else if (isRegisterMode) {
            if (!pdConsent) return setMessage('Необходимо согласие на обработку ПД!');
            await fetchAPI('/register', { method: 'POST', body: JSON.stringify({ email, password }) });
            alert('Регистрация успешна!');
            setIsRegisterMode(false); setPassword(''); setMessage('');
        } else {
            const data = await fetchAPI('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            setToken(data.token);
            setUserRole(data.role_id);
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role_id);
        }
    } catch (err) { setMessage('Ошибка: ' + err.message); }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
          <h1 style={{ color: '#000', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '28px' }}>
              <span>🏕️</span> Лагерь "Смена"
          </h1>
          <h2 style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '25px', fontWeight: '600' }}>
              {isResetMode ? 'Восстановление пароля' : (isRegisterMode ? 'Создание аккаунта' : 'Вход в личный кабинет')}
          </h2>
          
          <form onSubmit={handleSubmit}>
              <input className="form-input" type="email" placeholder="Ваш Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="form-input" type="password" placeholder={isResetMode ? "Придумайте новый пароль" : "Пароль"} value={password} onChange={(e) => setPassword(e.target.value)} required />
              
              {isRegisterMode && (
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '15px', textAlign: 'left' }}>
                      <input type="checkbox" checked={pdConsent} onChange={e => setPdConsent(e.target.checked)} required style={{ marginRight: '8px' }} />
                      Согласен на обработку персональных данных
                  </label>
              )}

              <button type="submit" className={`btn ${isResetMode ? 'btn-warning' : (isRegisterMode ? 'btn-success' : 'btn-primary')}`} style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
                  {isResetMode ? 'Сохранить пароль' : (isRegisterMode ? 'Зарегистрироваться' : 'Войти в кабинет')}
              </button>
          </form>
          
          {message && <p style={{ color: 'var(--danger)', marginTop: '15px', fontWeight: 'bold' }}>{message}</p>}
          
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(isRegisterMode || isResetMode) ? (
              <span onClick={() => { setIsRegisterMode(false); setIsResetMode(false); setMessage(''); }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>⬅ Вернуться ко входу</span>
          ) : (
              <>
                  <span onClick={() => { setIsRegisterMode(true); setMessage(''); }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>Нет аккаунта? Зарегистрироваться</span>
                  <span onClick={() => { setIsResetMode(true); setMessage(''); }} style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>Забыли пароль?</span>
              </>
          )}
          </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. ПРОФИЛЬ РОДИТЕЛЯ
// ==========================================
function Profile({ fetchAPI }) {
  const [profile, setProfile] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ fio: '', phone: '', address: '' });

  useEffect(() => {
      fetchAPI('/profile').then(data => { setProfile(data); setForm({ fio: data.fio || '', phone: data.phone || '', address: data.address || '' }); }).catch(console.error);
  }, []);

  const handleUpdate = async (e) => {
      e.preventDefault();
      try {
          await fetchAPI('/profile', { method: 'PUT', body: JSON.stringify(form) });
          setProfile({ ...profile, ...form });
          setIsEditing(false);
          alert('Профиль обновлен!');
      } catch (err) { alert(err.message); }
  };

  return (
      <div>
        <div className="tab-header">
            <div className="spacer"></div><h2>Мой профиль</h2>
            <div className="actions">
                <button className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'Отменить' : 'Редактировать'}</button>
            </div>
        </div>
        {isEditing ? (
            <form onSubmit={handleUpdate}>
                <div className="form-row">
                    <input className="form-input" type="text" placeholder="ФИО полностью" value={form.fio} onChange={(e) => setForm({...form, fio: e.target.value})} required />
                    <input className="form-input" type="text" placeholder="Номер телефона" value={form.phone} onChange={(e) => setForm({...form, phone: formatPhone(e.target.value)})} required />
                </div>
                <textarea className="form-input" placeholder="Адрес проживания" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} required />
                <button type="submit" className="btn btn-success">Сохранить</button>
            </form>
        ) : (
            <div className="info-grid">
                <p><strong>ФИО:</strong> {profile.fio || <span style={{ color: 'var(--danger)' }}>Не заполнено</span>}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Телефон:</strong> {profile.phone || 'Не указан'}</p>
                <p><strong>Адрес:</strong> {profile.address || 'Не указан'}</p>
            </div>
        )}
      </div>
  );
}

// ==========================================
// 3. АНКЕТЫ ДЕТЕЙ И ДОКУМЕНТЫ
// ==========================================
function Children({ fetchAPI }) {
  const [children, setChildren] = useState([]);
  const [documents, setDocuments] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ fio: '', birth_date: '', snils: '', oms: '', address: '', additional_info: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploadFiles, setUploadFiles] = useState({});
  const [uploadTypes, setUploadTypes] = useState({});

  const loadData = async () => {
      try {
          const childData = await fetchAPI('/children');
          setChildren(childData);
          childData.forEach(async (child) => {
              const docs = await fetchAPI(`/documents/${child.child_id}`);
              setDocuments(prev => ({ ...prev, [child.child_id]: docs }));
          });
      } catch (e) { console.error(e); }
  };
  useEffect(() => { loadData(); }, []);

  const handleAdd = async (e) => {
      e.preventDefault();
      const cleanSnils = form.snils.replace(/\D/g, ''); const cleanOms = form.oms.replace(/\D/g, '');
      if (cleanSnils.length !== 11) return alert('СНИЛС должен содержать 11 цифр!');
      if (cleanOms.length !== 16) return alert('ОМС должен содержать 16 цифр!');
      if (form.birth_date.length !== 10) return alert('Дата рождения должна быть в формате ДД.ММ.ГГГГ');
      const [day, month, year] = form.birth_date.split('.');
      try {
          await fetchAPI('/children', { method: 'POST', body: JSON.stringify({ ...form, birth_date: `${year}-${month}-${day}`, snils: cleanSnils, oms: cleanOms }) });
          alert('Анкета добавлена!');
          setForm({ fio: '', birth_date: '', snils: '', oms: '', address: '', additional_info: '' });
          setShowAddForm(false);
          loadData();
      } catch (err) { alert(err.message); }
  };

  const handleEdit = async (e, childId) => {
      e.preventDefault();
      const cleanSnils = editForm.snils.replace(/\D/g, ''); const cleanOms = editForm.oms.replace(/\D/g, '');
      if (editForm.birth_date.length !== 10) return alert('Дата рождения должна быть в формате ДД.ММ.ГГГГ');
      const [day, month, year] = editForm.birth_date.split('.');
      try {
          await fetchAPI(`/children/${childId}`, { method: 'PUT', body: JSON.stringify({ ...editForm, birth_date: `${year}-${month}-${day}`, snils: cleanSnils, oms: cleanOms }) });
          alert('Анкета обновлена!'); setEditingId(null); loadData();
      } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
      if (!window.confirm('ВНИМАНИЕ! Вы точно хотите удалить анкету?')) return;
      try { await fetchAPI(`/children/${id}`, { method: 'DELETE' }); loadData(); } catch (err) { alert(err.message); }
  };

  const handleUpload = async (childId) => {
      const file = uploadFiles[childId]; const docType = uploadTypes[childId];
      if (!file || !docType) return alert("Выберите тип документа и файл!");
      const formData = new FormData();
      formData.append('file', file); formData.append('child_id', childId); formData.append('document_type', docType);
      try {
          await fetchAPI('/documents', { method: 'POST', body: formData });
          alert('Документ загружен!'); setUploadFiles({...uploadFiles, [childId]: null}); loadData();
      } catch (err) { alert(err.message); }
  };

  const handleDeleteDoc = async (docId) => {
      if (!window.confirm('Удалить документ?')) return;
      try { await fetchAPI(`/documents/${docId}`, { method: 'DELETE' }); loadData(); } catch (err) { alert(err.message); }
  };

  return (
      <div>
          <div className="tab-header">
              <div className="spacer"></div><h2>Мои дети</h2>
              <div className="actions">
                <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>{showAddForm ? 'Отменить' : '+ Добавить анкету'}</button>
              </div>
          </div>

          {showAddForm && (
              <div style={{ padding: '20px', backgroundColor: '#f8fafc', border: '1.5px solid var(--primary)', borderRadius: '12px', marginBottom: '25px' }}>
                  <form onSubmit={handleAdd}>
                      <div className="form-row">
                          <input className="form-input" type="text" placeholder="ФИО ребенка" value={form.fio} onChange={(e) => setForm({...form, fio: e.target.value})} required />
                          <input className="form-input" type="text" placeholder="Дата рождения (ДД.ММ.ГГГГ)" value={form.birth_date} onChange={(e) => setForm({...form, birth_date: formatDate(e.target.value)})} required />
                      </div>
                      <div className="form-row">
                          <input className="form-input" type="text" placeholder="СНИЛС" value={form.snils} onChange={(e) => setForm({...form, snils: formatSnils(e.target.value)})} required />
                          <input className="form-input" type="text" placeholder="Полис ОМС" value={form.oms} onChange={(e) => setForm({...form, oms: formatOms(e.target.value)})} required />
                      </div>
                      <textarea className="form-input" placeholder="Адрес прописки (оставьте пустым для копирования вашего адреса)" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
                      <textarea className="form-input" placeholder="Доп. информация (аллергии и т.д.)" value={form.additional_info} onChange={(e) => setForm({...form, additional_info: e.target.value})} />
                      <button type="submit" className="btn btn-primary">Сохранить анкету</button>
                  </form>
              </div>
          )}

          {children.length === 0 ? <p style={{textAlign: 'center'}}>Анкет нет.</p> : children.map(child => (
              <div key={child.child_id} style={{ padding: '20px', border: '1.5px solid var(--border-color)', borderRadius: '12px', marginBottom: '15px' }}>
                  {editingId === child.child_id ? (
                      <form onSubmit={(e) => handleEdit(e, child.child_id)}>
                          <div className="form-row">
                              <input className="form-input" type="text" value={editForm.fio} onChange={(e) => setEditForm({...editForm, fio: e.target.value})} required />
                              <input className="form-input" type="text" placeholder="ДД.ММ.ГГГГ" value={editForm.birth_date} onChange={(e) => setEditForm({...editForm, birth_date: formatDate(e.target.value)})} required />
                          </div>
                          <div className="form-row">
                              <input className="form-input" type="text" value={editForm.snils} onChange={(e) => setEditForm({...editForm, snils: formatSnils(e.target.value)})} required />
                              <input className="form-input" type="text" value={editForm.oms} onChange={(e) => setEditForm({...editForm, oms: formatOms(e.target.value)})} required />
                          </div>
                          <textarea className="form-input" placeholder="Адрес" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                          <textarea className="form-input" placeholder="Доп инфо" value={editForm.additional_info} onChange={(e) => setEditForm({...editForm, additional_info: e.target.value})} />
                          <div className="action-buttons"><button type="submit" className="btn btn-success">Сохранить</button><button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Отмена</button></div>
                      </form>
                  ) : (
                      <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' }}>
                              <h3 style={{ color: 'var(--primary)', margin: 0 }}>👶 {child.fio}</h3>
                              <div className="action-buttons" style={{ margin: 0 }}>
                                  <button className="btn btn-sm btn-warning" onClick={() => {
                                      const d = new Date(child.birth_date);
                                      setEditForm({...child, birth_date: `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`, snils: formatSnils(child.snils), oms: formatOms(child.oms)});
                                      setEditingId(child.child_id);
                                  }}>✏️</button>
                                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(child.child_id)}>🗑</button>
                              </div>
                          </div>
                          <div className="info-grid">
                              <p><strong>Дата рождения:</strong> {new Date(child.birth_date).toLocaleDateString('ru-RU')}</p>
                              <p><strong>СНИЛС:</strong> {formatSnils(child.snils)}</p>
                              <p><strong>Полис ОМС:</strong> {formatOms(child.oms)}</p>
                              <p><strong>Адрес:</strong> {child.address}</p>
                          </div>

                          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                              <h4 style={{margin: '0 0 10px 0'}}>📎 Обязательные документы для заявки:</h4>
                              <p style={{fontSize: '13px', color: '#666', marginTop: 0}}>Свидетельство о рождении, Полис ОМС, Мед. справка 079/у</p>
                              <ul style={{ listStyleType: 'none', padding: 0 }}>
                                  {(documents[child.child_id] || []).map(doc => (
                                      <li key={doc.document_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#fff', border: '1px solid #ddd', marginBottom: '5px', borderRadius: '6px' }}>
                                          <a href={`http://localhost:5000${doc.file_path}`} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: '600', textDecoration: 'none'}}>{doc.document_type}</a>
                                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteDoc(doc.document_id)}>✖</button>
                                      </li>
                                  ))}
                              </ul>
                              <div className="form-row" style={{ marginTop: '10px', alignItems: 'center' }}>
                                  <select className="form-input" style={{marginBottom: 0}} value={uploadTypes[child.child_id] || ""} onChange={(e) => setUploadTypes({...uploadTypes, [child.child_id]: e.target.value})}>
                                      <option value="" disabled>-- Выберите тип --</option>
                                      <option value="Свидетельство о рождении">Свидетельство о рождении</option>
                                      <option value="Полис ОМС">Полис ОМС</option>
                                      <option value="Мед. справка 079/у">Мед. справка 079/у</option>
                                  </select>
                                  <input type="file" className="form-input" style={{marginBottom: 0, background: '#fff'}} onChange={(e) => setUploadFiles({...uploadFiles, [child.child_id]: e.target.files[0]})} />
                                  <button className="btn btn-secondary" onClick={() => handleUpload(child.child_id)}>Загрузить</button>
                              </div>
                          </div>
                      </>
                  )}
              </div>
          ))}
      </div>
  );
}

// ==========================================
// 4. ЗАЯВКИ И ОПЛАТА РОДИТЕЛЯ
// ==========================================
function Applications({ fetchAPI }) {
  const [apps, setApps] = useState([]);
  const [children, setChildren] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState({ child_id: '', shift_id: '', season: '', accommodation_type: '', friend_request: '' });
  const [payingApp, setPayingApp] = useState(null);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });

  const loadData = async () => {
      try {
          setApps(await fetchAPI('/applications'));
          setChildren(await fetchAPI('/children'));
          setShifts(await fetchAPI('/shifts'));
      } catch (e) { console.error(e); }
  };
  useEffect(() => { loadData(); }, []);

  const handleApply = async (e) => {
      e.preventDefault();
      try {
          await fetchAPI('/applications', { method: 'POST', body: JSON.stringify(form) });
          alert('Заявка успешно подана! Ожидайте подтверждения менеджера.'); 
          loadData();
          setForm({ child_id: '', shift_id: '', season: '', accommodation_type: '', friend_request: '' });
      } catch (err) { alert(err.message); }
  };

  const handlePayment = async (e) => {
      e.preventDefault();
      try {
          await fetchAPI('/payments', { method: 'POST', body: JSON.stringify({ application_id: payingApp.app_id, amount: payingApp.price, card_number: card.number.replace(/\D/g, '') }) });
          alert('Оплата прошла успешно!'); setPayingApp(null); loadData();
      } catch (err) { alert(err.message); }
  };

  return (
      <div>
          {payingApp && (
              <div className="card" style={{ borderLeft: '5px solid var(--success)', marginBottom: '20px' }}>
                  <h2 style={{ color: 'var(--success)' }}>💳 Оплата путевки</h2>
                  <p>Сумма к оплате: <strong>{payingApp.price} руб.</strong></p>
                  <form onSubmit={handlePayment}>
                      <input className="form-input" type="text" placeholder="Номер карты (16 цифр)" maxLength="19" value={card.number} onChange={e => setCard({...card, number: e.target.value})} required />
                      <div className="form-row">
                          <input className="form-input" type="text" placeholder="ММ/ГГ" maxLength="5" value={card.expiry} onChange={e => setCard({...card, expiry: e.target.value})} required />
                          <input className="form-input" type="password" placeholder="CVC" maxLength="3" value={card.cvc} onChange={e => setCard({...card, cvc: e.target.value})} required />
                      </div>
                      <div className="action-buttons">
                        <button type="submit" className="btn btn-success">Подтвердить платеж</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setPayingApp(null)}>Отмена</button>
                      </div>
                  </form>
              </div>
          )}

          <h2 style={{ marginBottom: '15px' }}>Подать заявку на смену</h2>
          <form onSubmit={handleApply} style={{ marginBottom: '30px', background: '#f8fafc', padding: '20px', borderRadius: '10px' }}>
              <div className="form-row">
                  <select className="form-input" value={form.child_id} onChange={e => setForm({...form, child_id: e.target.value})} required>
                      <option value="">-- Ребенок --</option>
                      {children.map(c => <option key={c.child_id} value={c.child_id}>{c.fio}</option>)}
                  </select>
                  <select className="form-input" value={form.shift_id} onChange={e => setForm({...form, shift_id: e.target.value})} required>
                      <option value="">-- Смена --</option>
                      {shifts.map(s => <option key={s.shift_id} value={s.shift_id}>{s.program_name} (Мест: {s.capacity})</option>)}
                  </select>
              </div>
              <div className="form-row">
                  <select className="form-input" value={form.accommodation_type} onChange={e => setForm({...form, accommodation_type: e.target.value})} required>
                      <option value="">-- Условия проживания --</option>
                      <option value="Корпус стандарт">Стандарт (35 000 руб)</option>
                      <option value="Корпус улучшенный">Улучшенный (45 000 руб)</option>
                      <option value="Глэмпинг">Глэмпинг (55 000 руб)</option>
                  </select>
                  <select className="form-input" value={form.season} onChange={e => setForm({...form, season: e.target.value})} required>
                      <option value="">-- Сезон --</option>
                      <option value="Лето">Лето</option><option value="Осень">Осень</option><option value="Зима">Зима</option><option value="Весна">Весна</option>
                  </select>
              </div>
              <input className="form-input" type="text" placeholder="С кем хочу быть в отряде (ФИО друга - необязательно)" value={form.friend_request} onChange={e => setForm({...form, friend_request: e.target.value})} />
              
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '15px' }}>
                  <input type="checkbox" required style={{ marginRight: '8px' }} />
                  Согласен с условиями бронирования и правилами лагеря
              </label>

              <button type="submit" className="btn btn-primary">Забронировать</button>
          </form>

          <h2>Мои заявки</h2>
          <div className="table-container">
            <table className="modern-table">
                <thead>
                    <tr>
                        <th style={{textAlign: 'center'}}>Ребенок</th>
                        <th style={{textAlign: 'center'}}>Смена</th>
                        <th style={{textAlign: 'center'}}>Статус</th>
                        <th style={{textAlign: 'center'}}>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {apps.length === 0 ? <tr><td colSpan="4" style={{textAlign: 'center', color: '#666'}}>Заявок пока нет.</td></tr> : apps.map(app => (
                        <tr key={app.app_id}>
                            <td style={{textAlign: 'center'}}><strong>{app.fio}</strong></td>
                            <td style={{textAlign: 'center'}}>{app.code} <div style={{fontSize: '12px', color: '#666'}}>{app.accommodation_type}</div></td>
                            <td style={{textAlign: 'center'}}>
                                <span className="badge" style={{ backgroundColor: getBadgeColor(app.status_name) }}>{app.status_name}</span>
                                {app.rejection_reason && <div style={{color:'var(--danger)', fontSize:'12px', marginTop:'5px'}}>Отказ: {app.rejection_reason}</div>}
                                {app.card_mask && <div style={{color:'var(--success)', fontSize:'12px', marginTop:'5px', fontWeight:'bold'}}>Оплачено: {app.amount} ₽</div>}
                            </td>
                            <td style={{textAlign: 'center'}}>
                                <div className="action-buttons" style={{justifyContent: 'center'}}>
                                    {app.status_name === 'Одобрена' && !app.card_mask && <button className="btn btn-sm btn-success" onClick={() => { setPayingApp(app); window.scrollTo(0,0); }}>💳 Оплатить</button>}
                                    {!app.card_mask && <button className="btn btn-sm btn-secondary" onClick={async () => {
                                        if(!window.confirm('Отменить заявку?')) return;
                                        try { await fetchAPI(`/applications/${app.app_id}`, { method: 'DELETE' }); loadData(); } catch(e){ alert(e.message); }
                                    }}>✖ Отменить</button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      </div>
  );
}

// ==========================================
// 5. ПАНЕЛЬ МЕНЕДЖЕРА
// ==========================================
function AdminDashboard({ fetchAPI, token, handleLogout }) {
  const [apps, setApps] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [shiftForm, setShiftForm] = useState({ program_name: '', shift_code: '', start_date: '', end_date: '', capacity: '' });
  
  // Состояния для развертывания информации о ребенке
  const [expandedApp, setExpandedApp] = useState(null);
  const [childDocs, setChildDocs] = useState([]);

  // Состояния для инлайн-ЧС (Опциональный ввод)
  const [blacklistingChildId, setBlacklistingChildId] = useState(null);
  const [blacklistReasonText, setBlacklistReasonText] = useState('');

  const loadData = async () => {
      try {
          setApps(await fetchAPI('/admin/applications'));
          setShifts(await fetchAPI('/shifts'));
      } catch (e) { console.error(e); }
  };
  useEffect(() => { loadData(); }, []);

  const totalApps = apps.length;
  const inProgressApps = apps.filter(a => a.status_name?.includes('работ')).length;
  const paidApps = apps.filter(a => a.status_name?.includes('опла')).length;
  const totalRevenue = apps.reduce((sum, a) => sum + (a.payment_amount ? Number(a.payment_amount) : 0), 0);

  const changeStatus = async (id, status, reason = '') => {
      try {
          await fetchAPI(`/admin/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status_id: status, rejection_reason: reason }) });
          loadData();
      } catch (e) { alert(e.message); }
  };

  const toggleBlacklist = async (childId, isListed, reasonFromInput = '') => {
      if (isListed) {
          if (!window.confirm('Вы уверены, что хотите убрать ребенка из Черного списка?')) return;
      }

      try {
          await fetchAPI(`/admin/children/${childId}/blacklist`, { 
              method: 'PUT', 
              body: JSON.stringify({ 
                  is_blacklisted: !isListed, 
                  blacklist_reason: isListed ? null : (reasonFromInput.trim() || 'Причина не указана менеджером') 
              }) 
          });
          
          alert(isListed ? 'Ребенок убран из ЧС' : 'Ребенок добавлен в Черный список');
          setBlacklistingChildId(null);
          setBlacklistReasonText('');
          loadData();
      } catch (e) { 
          alert('Ошибка сервера: ' + e.message); 
      }
  };

  const handleAddShift = async (e) => {
      e.preventDefault();
      try {
          await fetchAPI('/admin/shifts', { method: 'POST', body: JSON.stringify(shiftForm) });
          alert('Смена создана!'); setShiftForm({ program_name: '', shift_code: '', start_date: '', end_date: '', capacity: '' }); loadData();
      } catch (e) { alert(e.message); }
  };

  const handleExportExcel = async () => {
      try {
          const res = await fetch(`${API_URL}/admin/export/applications`, { headers: { 'Authorization': `Bearer ${token}` } });
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a'); link.href = url; link.download = 'Реестр_Смена.xlsx'; link.click();
      } catch(e) { alert('Ошибка выгрузки Excel'); }
  };

  const toggleExpandInfo = async (app) => {
      if (expandedApp === app.app_id) {
          setExpandedApp(null);
      } else {
          try {
              const docs = await fetchAPI(`/documents/${app.child_id}`);
              setChildDocs(docs);
              setExpandedApp(app.app_id);
          } catch(e) { console.error(e); }
      }
  };

  if (showReport) {
      return (
          <div style={{ padding: '40px', background: '#fff' }}>
              <style>{`@media print { .no-print { display: none !important; } }`}</style>
              <div className="no-print" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <button onClick={() => window.print()} className="btn btn-danger">🖨️ Печать PDF</button>
                  <button onClick={() => setShowReport(false)} className="btn btn-secondary">⬅ Назад</button>
              </div>
              <h1 style={{ textAlign: 'center' }}>Сводный отчет по заявкам</h1>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }} border="1" cellPadding="10">
                  <thead><tr style={{ background: '#eee' }}><th>ID</th><th>ФИО Ребенка</th><th>Смена</th><th>Статус</th><th>Оплата</th></tr></thead>
                  <tbody>
                      {apps.map(a => <tr key={a.app_id}><td>{a.app_id}</td><td>{a.child_fio}</td><td>{a.shift_code}</td><td>{a.status_name}</td><td>{a.payment_amount || '-'}</td></tr>)}
                  </tbody>
              </table>
              <h3 style={{ textAlign: 'right', marginTop: '20px' }}>Итого выручка: {totalRevenue.toLocaleString('ru-RU')} руб.</h3>
          </div>
      );
  }

  return (
      <div className="dashboard-container">
          <div className="header-bar">
              <h1 style={{color: '#000'}}>⚙️ Панель Менеджера</h1>
              <button className="btn btn-danger" onClick={handleLogout}>Выйти</button>
          </div>

          <div className="kpi-grid">
              <div className="kpi-card kpi-blue"><h3>Всего заявок</h3><p>{totalApps}</p></div>
              <div className="kpi-card kpi-orange"><h3>В работе</h3><p>{inProgressApps}</p></div>
              <div className="kpi-card kpi-green"><h3>Оплачено путевок</h3><p>{paidApps}</p></div>
              <div className="kpi-card kpi-purple"><h3>Выручка</h3><p>{totalRevenue.toLocaleString('ru-RU')} ₽</p></div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
              <h2>🌲 Создать смену</h2>
              <form onSubmit={handleAddShift}>
                  <div className="form-row">
                      <input className="form-input" type="text" placeholder="Программа (например: IT-Смена)" value={shiftForm.program_name} onChange={e=>setShiftForm({...shiftForm, program_name: e.target.value})} required/>
                      <input className="form-input" type="text" placeholder="Код (например: ЛЕТО-01)" value={shiftForm.shift_code} onChange={e=>setShiftForm({...shiftForm, shift_code: e.target.value})} required/>
                  </div>
                  <div className="form-row">
                      <input className="form-input" type="date" value={shiftForm.start_date} onChange={e=>setShiftForm({...shiftForm, start_date: e.target.value})} required/>
                      <input className="form-input" type="date" value={shiftForm.end_date} onChange={e=>setShiftForm({...shiftForm, end_date: e.target.value})} required/>
                      <input className="form-input" type="number" placeholder="Лимит мест (по умолч. 30)" value={shiftForm.capacity} onChange={e=>setShiftForm({...shiftForm, capacity: e.target.value})}/>
                  </div>
                  <button className="btn btn-success">Добавить в систему</button>
              </form>
          </div>

          <div className="card">
              <div className="tab-header" style={{ marginBottom: '15px' }}>
                  <h2 style={{margin: 0}}>База заявок</h2>
                  <div className="actions">
                      <button className="btn btn-success" onClick={handleExportExcel}>📥 Excel</button>
                      <button className="btn btn-primary" onClick={() => setShowReport(true)}>📄 PDF Отчет</button>
                  </div>
              </div>
              
              <div className="table-container">
                  <table className="modern-table">
                      <thead>
                          <tr>
                              <th style={{textAlign: 'center'}}>ID</th>
                              <th style={{textAlign: 'center'}}>Ребенок</th>
                              <th style={{textAlign: 'center'}}>Смена / Друзья</th>
                              <th style={{textAlign: 'center'}}>Статус</th>
                              <th style={{textAlign: 'center'}}>Действия</th>
                          </tr>
                      </thead>
                      <tbody>
                          {apps.map(app => (
                              <React.Fragment key={app.app_id}>
                                  <tr style={{ background: app.is_blacklisted ? '#fff3f3' : '' }}>
                                      <td style={{textAlign: 'center'}}><strong>{app.app_id}</strong></td>
                                      <td style={{textAlign: 'center'}}>
                                          <strong>{app.child_fio}</strong><br/>
                                          <span style={{ fontSize: '12px', color: '#666' }}>{formatSnils(app.snils)}</span>
                                          {app.is_blacklisted && <span style={{color:'var(--danger)', display:'block', fontSize:'12px', fontWeight:'bold'}}>[ЧС] {app.blacklist_reason}</span>}
                                      </td>
                                      <td style={{textAlign: 'center'}}>{app.shift_code} <br/><span style={{fontSize:'12px', color: '#666'}}>Друг: {app.friend_request || '-'}</span></td>
                                      <td style={{textAlign: 'center'}}>
                                          <span className="badge" style={{ backgroundColor: getBadgeColor(app.status_name) }}>{app.status_name}</span>
                                          {app.payment_amount && <div style={{fontSize:'12px', marginTop:'5px', color:'var(--success)', fontWeight:'bold'}}>{app.payment_amount} ₽</div>}
                                      </td>
                                      <td style={{textAlign: 'center'}}>
                                          <div className="action-buttons" style={{justifyContent: 'center'}}>
                                              <button className="btn btn-sm btn-primary" onClick={() => toggleExpandInfo(app)}>
                                                  {expandedApp === app.app_id ? 'Скрыть инфо' : 'ℹ️ Инфо'}
                                              </button>
                                              
                                              {app.status_name?.includes('работ') && (
                                                  <>
                                                      <button className="btn btn-sm btn-success" onClick={() => changeStatus(app.app_id, 2)}>✔</button>
                                                      <button className="btn btn-sm btn-danger" onClick={() => { const r = prompt('Причина отказа:'); if(r) changeStatus(app.app_id, 3, r); }}>✖</button>
                                                  </>
                                              )}
                                              
                                              {/* Умная инлайн кнопка ЧС */}
                                              {app.is_blacklisted ? (
                                                  <button className="btn btn-sm btn-secondary" onClick={() => toggleBlacklist(app.child_id, true)}>Из ЧС</button>
                                              ) : (
                                                  blacklistingChildId === app.child_id ? (
                                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
                                                          <input 
                                                              className="form-input" 
                                                              style={{ padding: '6px', marginBottom: '0', fontSize: '13px' }} 
                                                              type="text" 
                                                              placeholder="Причина (опционально)" 
                                                              value={blacklistReasonText} 
                                                              onChange={(e) => setBlacklistReasonText(e.target.value)} 
                                                          />
                                                          <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                              <button className="btn btn-sm btn-danger" onClick={() => toggleBlacklist(app.child_id, false, blacklistReasonText)}>Ок</button>
                                                              <button className="btn btn-sm btn-secondary" onClick={() => { setBlacklistingChildId(null); setBlacklistReasonText(''); }}>Отмена</button>
                                                          </div>
                                                      </div>
                                                  ) : (
                                                      <button className="btn btn-sm btn-warning" onClick={() => { setBlacklistingChildId(app.child_id); setBlacklistReasonText(''); }}>В ЧС</button>
                                                  )
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                                  {expandedApp === app.app_id && (
                                      <tr style={{ backgroundColor: '#f8fafc' }}>
                                          <td colSpan="5" style={{ padding: '20px' }}>
                                              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', textAlign: 'left' }}>
                                                  <div style={{ flex: 1, minWidth: '250px' }}>
                                                      <h4 style={{ color: 'var(--primary)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>👶 Данные ребенка</h4>
                                                      <p><strong>Дата рождения:</strong> {new Date(app.birth_date).toLocaleDateString('ru-RU')}</p>
                                                      <p><strong>СНИЛС:</strong> {formatSnils(app.snils)}</p>
                                                      <p><strong>ОМС:</strong> {formatOms(app.oms)}</p>
                                                      <p><strong>Адрес:</strong> {app.child_address || 'Нет данных'}</p>
                                                      <p><strong>Доп. инфо:</strong> {app.additional_info || 'Нет данных'}</p>
                                                  </div>
                                                  <div style={{ flex: 1, minWidth: '250px' }}>
                                                      <h4 style={{ color: 'var(--primary)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>👨‍👩‍👦 Заявитель</h4>
                                                      <p><strong>ФИО:</strong> {app.parent_fio}</p>
                                                      <p><strong>Телефон:</strong> {app.parent_phone || 'Не указан'}</p>
                                                      <p><strong>Email:</strong> {app.parent_email}</p>
                                                      <p><strong>Адрес:</strong> {app.parent_address || 'Не указан'}</p>
                                                  </div>
                                                  <div style={{ flex: 1, minWidth: '250px' }}>
                                                      <h4 style={{ color: 'var(--primary)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>📎 Документы</h4>
                                                      {childDocs.length > 0 ? (
                                                          <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                                                              {childDocs.map(doc => (
                                                                  <li key={doc.document_id} style={{ marginBottom: '8px' }}>
                                                                      📄 <a href={`http://localhost:5000${doc.file_path}`} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none'}}>{doc.document_type}</a>
                                                                  </li>
                                                              ))}
                                                          </ul>
                                                      ) : <p style={{color: '#666', fontSize: '14px'}}>Документы не загружены</p>}
                                                  </div>
                                              </div>
                                          </td>
                                      </tr>
                                  )}
                              </React.Fragment>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );
}

export default App;