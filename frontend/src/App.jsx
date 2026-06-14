import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || ''); 
  const [userRole, setUserRole] = useState(Number(localStorage.getItem('userRole')) || null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  
  const [profile, setProfile] = useState({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fio: '', phone: '', address: '' });
  const [activeTab, setActiveTab] = useState('children');

  const [children, setChildren] = useState([]); 
  const [shifts, setShifts] = useState([]);
  const [selectedShifts, setSelectedShifts] = useState({});
  const [shiftDetails, setShiftDetails] = useState({}); 

  const [applications, setApplications] = useState([]); 
  const [documents, setDocuments] = useState({});
  const [uploadFiles, setUploadFiles] = useState({}); 
  const [uploadTypes, setUploadTypes] = useState({}); 

  const [showAddForm, setShowAddForm] = useState(false); 
  const [newFio, setNewFio] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newSnils, setNewSnils] = useState('');
  const [newOms, setNewOms] = useState('');
  const [newAdditionalInfo, setNewAdditionalInfo] = useState(''); 
  const [newChildAddress, setNewChildAddress] = useState('');
  const [formError, setFormError] = useState(''); 

  const [editingChildId, setEditingChildId] = useState(null);
  const [editChildForm, setEditChildForm] = useState({});

  // Новые состояния для добавления смен менеджером
  const [showAddShiftForm, setShowAddShiftForm] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [newShiftCode, setNewShiftCode] = useState('');
  const [newShiftStartDate, setNewShiftStartDate] = useState('');
  const [newShiftEndDate, setNewShiftEndDate] = useState('');

  const [adminApplications, setAdminApplications] = useState([]);
  const [expandedApp, setExpandedApp] = useState(null);
  const [rejectingAppId, setRejectingAppId] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [blacklistingChildId, setBlacklistingChildId] = useState(null);
  const [blacklistReasonText, setBlacklistReasonText] = useState('');

  const [payingApp, setPayingApp] = useState(null); 
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [showReport, setShowReport] = useState(false);

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

  const getPriceForAccommodation = (type) => {
    if (type === 'Корпус улучшенный') return 45000;
    if (type === 'Глэмпинг') return 55000;
    if (type === 'Корпус стандарт') return 35000;
    return 0;
  };

  const getBadgeColor = (statusName) => {
      if (!statusName) return '#fd7e14';
      const lowerName = statusName.trim().toLowerCase();
      if (lowerName.includes('одобр') || lowerName.includes('опла')) return '#28a745';
      if (lowerName.includes('отклон')) return '#dc3545';
      return '#fd7e14';
  };

  // ==========================================
  // СВЯЗЬ С СЕРВЕРОМ
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/login', { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) 
      });
      const data = await res.json();
      if (res.ok) { 
          setToken(data.token); setUserRole(data.role_id); localStorage.setItem('token', data.token); localStorage.setItem('userRole', data.role_id); setMessage('');
      } else { setMessage('Ошибка: ' + data.error); }
    } catch (error) { setMessage('Ошибка связи с сервером.'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/register', { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) 
      });
      const data = await res.json(); 
      if (res.ok) { 
          alert('Регистрация успешна! Теперь вы можете войти.'); 
          setIsRegisterMode(false); 
          setPassword(''); 
          setMessage(''); 
      } else { 
          setMessage('Ошибка: ' + (data.error || 'Не удалось зарегистрироваться.')); 
      }
    } catch (error) { 
        setMessage('Ошибка связи с сервером.'); 
    }
  };

  const handleResetPassword = async (e) => {
      e.preventDefault();
      try {
          const res = await fetch('http://localhost:5000/api/reset-password', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, newPassword: password })
          });
          const data = await res.json();
          if (res.ok) { alert(data.message); setIsResetMode(false); setPassword(''); setMessage(''); } 
          else { setMessage('Ошибка: ' + data.error); }
      } catch (err) { setMessage('Ошибка связи с сервером.'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('userRole');
    setToken(''); setUserRole(null); setChildren([]); setApplications([]); setAdminApplications([]); setPassword(''); setMessage('');
  };

  const fetchData = async () => {
    if (!token) return;
    if (userRole === 2) {
        const res = await fetch('http://localhost:5000/api/admin/applications', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setAdminApplications(await res.json());
        return; 
    }
    const profRes = await fetch('http://localhost:5000/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
    if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData);
        setProfileForm({ fio: profData.fio || '', phone: profData.phone || '', address: profData.address || '' });
    }
    const childRes = await fetch('http://localhost:5000/api/children', { headers: { 'Authorization': `Bearer ${token}` } });
    if (childRes.ok) {
        const childData = await childRes.json();
        setChildren(childData);
        childData.forEach(async (child) => {
            const docRes = await fetch(`http://localhost:5000/api/documents/${child.child_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (docRes.ok) { const docs = await docRes.json(); setDocuments(prev => ({ ...prev, [child.child_id]: docs })); }
        });
    }
    const shiftRes = await fetch('http://localhost:5000/api/shifts');
    if (shiftRes.ok) setShifts(await shiftRes.json());
    
    const appRes = await fetch('http://localhost:5000/api/applications', { headers: { 'Authorization': `Bearer ${token}` } });
    if (appRes.ok) setApplications(await appRes.json());
  };

  useEffect(() => { fetchData(); }, [token, userRole]);

  // Функция отправки новой смены на сервер менеджером
  const handleAddShiftSubmit = async (e) => {
      e.preventDefault();
      try {
          const res = await fetch('http://localhost:5000/api/admin/shifts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  program_name: newProgramName,
                  shift_code: newShiftCode,
                  start_date: newShiftStartDate,
                  end_date: newShiftEndDate
              })
          });
          const data = await res.json();
          if (res.ok) {
              alert('Новая программа смены успешно добавлена в базу данных!');
              setNewProgramName(''); setNewShiftCode(''); setNewShiftStartDate(''); setNewShiftEndDate('');
              setShowAddShiftForm(false);
              fetchData(); 
          } else {
              alert('Ошибка: ' + data.error);
          }
      } catch (err) { alert('Ошибка связи с сервером.'); }
  };

  // ==========================================
  // РОДИТЕЛЬСКИЙ ФУНКЦИОНАЛ
  // ==========================================
  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      try {
          const res = await fetch('http://localhost:5000/api/profile', {
              method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(profileForm)
          });
          if (res.ok) { setProfile({ ...profile, ...profileForm }); setIsEditingProfile(false); alert('Профиль успешно обновлен!'); }
      } catch (err) { alert('Ошибка связи с сервером.'); }
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    const cleanSnils = newSnils.replace(/\D/g, ''); const cleanOms = newOms.replace(/\D/g, '');
    if (cleanSnils.length !== 11) return setFormError('СНИЛС должен содержать 11 цифр!');
    if (cleanOms.length !== 16) return setFormError('ОМС должен содержать 16 цифр!');
    if (newBirthDate.length !== 10) return setFormError('Дата рождения должна быть в формате ДД.ММ.ГГГГ');
    setFormError('');

    const [day, month, year] = newBirthDate.split('.');
    const dbBirthDate = `${year}-${month}-${day}`;

    try {
      const res = await fetch('http://localhost:5000/api/children', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fio: newFio, birth_date: dbBirthDate, snils: newSnils, oms: newOms, additional_info: newAdditionalInfo, address: newChildAddress }),
      });
      const data = await res.json();
      if (res.ok) {
        setChildren([...children, data.child]); 
        setNewFio(''); setNewBirthDate(''); setNewSnils(''); setNewOms(''); setNewAdditionalInfo(''); setNewChildAddress(''); setShowAddForm(false);
      } else { setFormError(data.error); }
    } catch (err) { setFormError('Ошибка связи с сервером.'); }
  };

  const startEditingChild = (child) => {
      setEditingChildId(child.child_id);
      let formattedDate = '';
      if (child.birth_date) {
          const d = new Date(child.birth_date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          formattedDate = `${day}.${month}.${year}`;
      }
      setEditChildForm({ 
          fio: child.fio, birth_date: formattedDate, snils: formatSnils(child.snils), 
          oms: formatOms(child.oms || ''), additional_info: child.additional_info || '', address: child.address || '' 
      });
  };

  const handleEditChildSubmit = async (e, childId) => {
      e.preventDefault();
      const cleanSnils = editChildForm.snils.replace(/\D/g, ''); const cleanOms = editChildForm.oms.replace(/\D/g, '');
      if (cleanSnils.length !== 11) return alert('СНИЛС должен содержать 11 цифр!');
      if (cleanOms.length !== 16) return alert('ОМС должен содержать 16 цифр!');
      if (editChildForm.birth_date.length !== 10) return alert('Дата рождения должна быть в формате ДД.ММ.ГГГГ');

      const [day, month, year] = editChildForm.birth_date.split('.');
      const dbEditBirthDate = `${year}-${month}-${day}`;

      try {
          const res = await fetch(`http://localhost:5000/api/children/${childId}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ ...editChildForm, birth_date: dbEditBirthDate, snils: cleanSnils, oms: cleanOms })
          });
          const data = await res.json();
          if (res.ok) { alert('Анкета успешно обновлена!'); setEditingChildId(null); fetchData(); } 
          else { alert(data.error); }
      } catch (err) { alert('Ошибка связи с сервером.'); }
  };

  const handleDeleteChild = async (childId) => {
      if (!window.confirm('ВНИМАНИЕ! Вы точно хотите удалить анкету ребенка? Все связанные заявки и документы будут безвозвратно удалены!')) return;
      try {
          const res = await fetch(`http://localhost:5000/api/children/${childId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) { alert('Анкета ребенка успешно удалена!'); fetchData(); } 
      } catch (err) { alert('Ошибка связи с сервером.'); }
  };

  const handleApply = async (childId) => {
    const shiftId = selectedShifts[childId];
    const details = shiftDetails[childId] || {};

    if (!shiftId || !details.season || !details.accommodation || !details.shiftNum) {
        return alert("Пожалуйста, заполните все поля заявки (Смена, Сезон, Проживание, Номер смены)!");
    }

    try {
      const res = await fetch('http://localhost:5000/api/applications', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify({ 
            child_id: childId, shift_id: shiftId, season: details.season, accommodation_type: details.accommodation, shift_number: details.shiftNum
        })
      });
      if (res.ok) { 
          alert('Ваша заявка успешно подана! Вы можете отслеживать ее статус во вкладке "Мои заявки".'); 
          setSelectedShifts(prev => ({...prev, [childId]: ""}));
          setShiftDetails(prev => ({...prev, [childId]: {}}));
          fetchData(); 
          setActiveTab('applications');
      } else {
          const errorData = await res.json();
          alert('Ошибка: ' + (errorData.error || 'Не удалось подать заявку.'));
      }
    } catch (err) { alert('Ошибка при подаче заявки.'); }
  };

  const handleCancelApplication = async (appId) => {
      if (!window.confirm('Вы уверены, что хотите отменить эту заявку? Это действие необратимо!')) return;
      try {
          const res = await fetch(`http://localhost:5000/api/applications/${appId}`, {
              method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) { alert('Заявка успешно отменена!'); fetchData(); } 
      } catch (err) { alert('Ошибка связи с сервером.'); }
  };

  const handleUploadDocument = async (childId) => {
    const file = uploadFiles[childId]; const docType = uploadTypes[childId];
    if (!file || !docType) return alert("Выберите тип документа и сам файл для загрузки!");
    const formData = new FormData();
    formData.append('file', file); formData.append('child_id', childId); formData.append('document_type', docType);
    try {
      const res = await fetch('http://localhost:5000/api/documents', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (res.ok) {
        alert('Документ успешно загружен!');
        setDocuments({ ...documents, [childId]: [...(documents[childId] || []), data.document] });
        setUploadFiles({ ...uploadFiles, [childId]: null });
      }
    } catch (err) { alert('Ошибка при загрузке документа.'); }
  };

  const handleDeleteDocument = async (docId) => {
      if (!window.confirm('Вы уверены, что хотите безвозвратно удалить этот документ?')) return;
      try {
          const res = await fetch(`http://localhost:5000/api/documents/${docId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) { alert('Документ успешно удален!'); fetchData(); } 
      } catch (err) { alert('Ошибка связи с сервером.'); }
  };

  const handleProcessPayment = async (e) => {
      e.preventDefault();
      const cleanCard = cardNumber.replace(/\D/g, '');
      const cleanCvc = cardCvc.replace(/\D/g, '');
      if (cleanCard.length !== 16) return alert('Номер карты должен состоять из 16 цифр!');
      if (cleanCvc.length !== 3) return alert('CVC/CVV код должен состоять из 3 цифр!');

      try {
          const res = await fetch('http://localhost:5000/api/payments', {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ application_id: payingApp.app_id, amount: payingApp.price, card_number: cleanCard })
          });
          if (res.ok) {
              alert('Оплата успешно проведена! Путевка выкуплена.');
              setPayingApp(null); setCardNumber(''); setCardExpiry(''); setCardCvc(''); fetchData(); 
          } else {
              const data = await res.json(); alert('Ошибка при проведении платежа: ' + (data.error || 'Неизвестная ошибка.'));
          }
      } catch (err) { alert('Ошибка связи с платежным шлюзом.'); }
  };

  // ==========================================
  // МЕНЕДЖЕРСКИЙ ФУНКЦИОНАЛ
  // ==========================================
  const handleStatusChange = async (appId, newStatusId, reason = '') => {
      try {
          if (newStatusId === 1 && !window.confirm('Вы уверены, что хотите отменить решение и вернуть заявку в работу?')) return;
          const res = await fetch(`http://localhost:5000/api/admin/applications/${appId}/status`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
              body: JSON.stringify({ status_id: newStatusId, rejection_reason: reason })
          });
          if (res.ok) { setRejectingAppId(null); setRejectionReasonText(''); fetchData(); } 
          else { const data = await res.json(); alert('Ошибка сервера: ' + (data.error || 'Неизвестная ошибка.')); }
      } catch (err) { alert('Ошибка связи с сервером.'); }
  };

  const handleToggleBlacklist = async (childId, currentStatus, reason = '') => {
      if (currentStatus) { if (!window.confirm('Вы уверены, что хотите убрать этого ребенка из Черного списка?')) return; }
      try {
          const res = await fetch(`http://localhost:5000/api/admin/children/${childId}/blacklist`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
              body: JSON.stringify({ is_blacklisted: !currentStatus, blacklist_reason: reason })
          });
          if (res.ok) { setBlacklistingChildId(null); setBlacklistReasonText(''); fetchData(); } 
          else { const data = await res.json(); alert('Ошибка сервера: ' + (data.error || 'Неизвестная ошибка.')); }
      } catch (err) { alert('Ошибка связи с сервером.'); }
  };

  const uniqueShifts = Array.from(new Set(adminApplications.map(app => app.shift_code))).filter(Boolean);

  const filteredAdminApps = adminApplications.filter(app => {
      const matchesSearch = app.child_fio.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || app.status_name === statusFilter;
      const matchesShift = shiftFilter === '' || app.shift_code === shiftFilter;
      return matchesSearch && matchesStatus && matchesShift;
  });

  const totalApps = adminApplications.length;
  const inProgressApps = adminApplications.filter(app => app.status_name?.toLowerCase().includes('работ') || app.status_name?.toLowerCase().includes('нов')).length;
  const paidApps = adminApplications.filter(app => app.status_name?.toLowerCase().includes('опла')).length;
  const totalRevenue = adminApplications.reduce((sum, app) => {
      if (app.status_name?.toLowerCase().includes('опла') && app.payment_amount) return sum + Number(app.payment_amount);
      return sum;
  }, 0);

  const exportToCSV = () => {
      if (filteredAdminApps.length === 0) return alert('Нет данных для выгрузки!');
      const headers = ['Номер Заявки', 'ФИО Ребенка', 'Код Смены', 'Статус', 'Сумма оплаты (руб)', 'Черный список'];
      const rows = filteredAdminApps.map(app => [
          app.app_id, `"${app.child_fio}"`, `"${app.shift_code}"`, `"${app.status_name}"`, app.payment_amount || 0, app.is_blacklisted ? 'Да' : 'Нет'
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); 
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Отчет_Лагерь_${new Date().toLocaleDateString('ru-RU')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- ЭКРАН 1: АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ---
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-box">
            <h1 style={{ color: '#000', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '28px' }}>
                <span>🏕️</span> Лагерь "Орленок"
            </h1>
            <h2 style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '25px', fontWeight: '600' }}>
                {isResetMode ? 'Восстановление пароля' : (isRegisterMode ? 'Создание аккаунта' : 'Вход в личный кабинет')}
            </h2>
            
            <form onSubmit={isResetMode ? handleResetPassword : (isRegisterMode ? handleRegister : handleLogin)}>
                <input className="form-input" type="email" placeholder="Ваш Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input className="form-input" type="password" placeholder={isResetMode ? "Придумайте новый пароль" : "Пароль"} value={password} onChange={(e) => setPassword(e.target.value)} required />
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

  // --- ЭКРАН 2: ПАНЕЛЬ МЕНЕДЖЕРА ---
  if (userRole === 2) {
      if (showReport) {
          return (
              <div style={{ backgroundColor: '#fff', padding: '40px', minHeight: '100vh', color: '#333', fontFamily: 'Arial, sans-serif' }}>
                  <style>{`@media print { .no-print { display: none !important; } @page { margin: 1cm; } }`}</style>
                  <div className="no-print" style={{ display: 'flex', gap: '15px', marginBottom: '30px', justifyContent: 'center' }}>
                      <button onClick={() => window.print()} className="btn btn-danger" style={{ fontSize: '16px', padding: '12px 25px' }}>🖨️ Распечатать / Сохранить в PDF</button>
                      <button onClick={() => setShowReport(false)} className="btn btn-secondary" style={{ fontSize: '16px', padding: '12px 25px' }}>⬅ Вернуться в панель</button>
                  </div>
                  <h1 style={{ textAlign: 'center', color: '#007BFF', marginBottom: '5px', fontSize: '26px' }}>Сводный отчет по заявкам в лагерь</h1>
                  <div style={{ textAlign: 'center', fontStyle: 'italic', color: '#666', marginBottom: '30px', fontSize: '14px' }}>Дата формирования: {new Date().toLocaleString('ru-RU')}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                      <thead>
                          <tr>
                              <th style={{ border: '1px solid #aaa', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>№</th>
                              <th style={{ border: '1px solid #aaa', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>ФИО Ребенка</th>
                              <th style={{ border: '1px solid #aaa', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Смена / Сезон</th>
                              <th style={{ border: '1px solid #aaa', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Статус</th>
                              <th style={{ border: '1px solid #aaa', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Сумма (руб)</th>
                              <th style={{ border: '1px solid #aaa', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>В ЧС</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredAdminApps.map(app => (
                              <tr key={app.app_id}>
                                  <td style={{ border: '1px solid #aaa', padding: '10px' }}>{app.app_id}</td>
                                  <td style={{ border: '1px solid #aaa', padding: '10px' }}>{app.child_fio}</td>
                                  <td style={{ border: '1px solid #aaa', padding: '10px' }}>{app.shift_code} {app.season ? `(${app.season})` : ''}</td>
                                  <td style={{ border: '1px solid #aaa', padding: '10px' }}>{app.status_name}</td>
                                  <td style={{ border: '1px solid #aaa', padding: '10px' }}>{app.payment_amount ? app.payment_amount + ' ₽' : '-'}</td>
                                  <td style={{ border: '1px solid #aaa', padding: '10px', color: app.is_blacklisted ? 'red' : 'inherit' }}>{app.is_blacklisted ? 'Да' : 'Нет'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  <div style={{ textAlign: 'right', fontSize: '18px', fontWeight: 'bold', marginTop: '20px', borderTop: '2px solid #333', paddingTop: '15px' }}>
                      Итого оплачено: {totalRevenue.toLocaleString('ru-RU')} руб.
                  </div>
              </div>
          );
      }

      return (
          <div className="dashboard-container">
              <div className="header-bar">
                  <h1 style={{ color: '#000' }}>⚙️ Панель Менеджера</h1>
                  <button className="btn btn-danger" onClick={handleLogout}>Выйти из системы</button>
              </div>
              
              <div className="kpi-grid">
                  <div className="kpi-card kpi-blue">
                      <h3>Всего заявок</h3><p>{totalApps}</p>
                  </div>
                  <div className="kpi-card kpi-orange">
                      <h3>В работе</h3><p>{inProgressApps}</p>
                  </div>
                  <div className="kpi-card kpi-green">
                      <h3>Оплачено путевок</h3><p>{paidApps}</p>
                  </div>
                  <div className="kpi-card kpi-purple">
                      <h3>Выручка</h3><p>{totalRevenue.toLocaleString('ru-RU')} ₽</p>
                  </div>
              </div>

              {/* НОВАЯ КАРТОЧКА: УПРАВЛЕНИЕ ПРОГРАММАМИ СМЕН */}
              <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                      <h2 style={{ margin: 0 }}>🌲 Управление программами смен</h2>
                      <button className="btn btn-primary" onClick={() => setShowAddShiftForm(!showAddShiftForm)}>
                          {showAddShiftForm ? 'Скрыть форму' : '+ Создать программу смены'}
                      </button>
                  </div>

                  {showAddShiftForm && (
                      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8fafc', border: '1.5px solid var(--primary)', borderRadius: '12px' }}>
                          <form onSubmit={handleAddShiftSubmit}>
                              <div className="form-row">
                                  <input className="form-input" type="text" placeholder="Название программы (например: Космическая одиссея)" value={newProgramName} onChange={(e) => setNewProgramName(e.target.value)} required />
                                  <input className="form-input" type="text" placeholder="Код/Номер смены (например: СМ-1)" value={newShiftCode} onChange={(e) => setNewShiftCode(e.target.value)} required />
                              </div>
                              <div className="form-row">
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Дата начала смены:</label>
                                      <input className="form-input" type="date" value={newShiftStartDate} onChange={(e) => setNewShiftStartDate(e.target.value)} required />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Дата окончания смены:</label>
                                      <input className="form-input" type="date" value={newShiftEndDate} onChange={(e) => setNewShiftEndDate(e.target.value)} required />
                                  </div>
                              </div>
                              <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '12px' }}>Сохранить и запустить в систему</button>
                          </form>
                      </div>
                  )}
              </div>

              <div className="card">
                  <div className="tab-header">
                      <h2 style={{ margin: 0, textAlign: 'left' }}>База данных заявок</h2>
                      <div className="filters-container">
                          <input className="form-input" style={{ marginBottom: 0 }} type="text" placeholder="🔍 Поиск по ФИО..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                          <select className="form-input" style={{ marginBottom: 0 }} value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                              <option value="">Все смены</option>
                              {uniqueShifts.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                          </select>
                          <select className="form-input" style={{ marginBottom: 0 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                              <option value="">Все статусы</option>
                              <option value="В работе">В работе</option>
                              <option value="Одобрена">Одобрена</option>
                              <option value="Оплачена">Оплачена</option>
                              <option value="Отклонена">Отклонена</option>
                          </select>
                          <button className="btn btn-success" onClick={exportToCSV}>📥 Excel</button>
                          <button className="btn btn-primary" onClick={() => { setShowReport(true); window.scrollTo(0,0); }}>📄 PDF</button>
                      </div>
                  </div>

                  {filteredAdminApps.length === 0 ? ( 
                      <p style={{ textalign: 'center', color: '#666', padding: '20px' }}>По вашему запросу ничего не найдено.</p> 
                  ) : (
                      <div className="table-container">
                          <table className="modern-table">
                              <thead>
                                  <tr>
                                      <th style={{ width: '5%' }}>№</th>
                                      <th>ФИО Ребенка</th>
                                      <th>Инфо о путевке</th>
                                      <th style={{ textalign: 'center' }}>Статус</th>
                                      <th style={{ textalign: 'center' }}>Действия</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {filteredAdminApps.map((app) => (
                                      <React.Fragment key={app.app_id}>
                                          <tr style={{ backgroundColor: app.is_blacklisted ? '#fff3f3' : 'transparent' }}>
                                              <td style={{ textalign: 'center', fontWeight: 'bold', color: '#666' }}>{app.app_id}</td>
                                              <td>
                                                  <strong>{app.child_fio}</strong>
                                                  {app.is_blacklisted && <span style={{ color: 'var(--danger)', fontSize: '12px', display: 'block' }}>[ЧС] {app.blacklist_reason}</span>}
                                              </td>
                                              <td>
                                                  <div>{app.shift_code}</div>
                                                  {app.season && <div style={{ fontSize: '12px', color: '#666' }}>{app.season}, {app.accommodation_type}, сч. №{app.shift_number}</div>}
                                              </td>
                                              <td style={{ textalign: 'center' }}>
                                                  <span className="badge" style={{ backgroundColor: getBadgeColor(app.status_name) }}>{app.status_name}</span>
                                                  {app.status_name?.toLowerCase().includes('отклон') && app.rejection_reason && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '5px' }}>Отказ: {app.rejection_reason}</div>}
                                              </td>
                                              <td style={{ textalign: 'center' }}>
                                                  {rejectingAppId === app.app_id ? (
                                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                          <input className="form-input" style={{ padding: '6px', marginBottom: '0' }} type="text" placeholder="Причина отказа" value={rejectionReasonText} onChange={(e) => setRejectionReasonText(e.target.value)} />
                                                          <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                              <button className="btn btn-sm btn-danger" onClick={() => handleStatusChange(app.app_id, 3, rejectionReasonText)}>Ок</button>
                                                              <button className="btn btn-sm btn-secondary" onClick={() => setRejectingAppId(null)}>Отмена</button>
                                                          </div>
                                                      </div>
                                                  ) : (
                                                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                          <button className="btn btn-sm btn-primary" onClick={() => setExpandedApp(expandedApp === app.app_id ? null : app.app_id)}>
                                                              {expandedApp === app.app_id ? 'Скрыть' : 'Инфо'}
                                                          </button>
                                                          {app.status_name?.toLowerCase().includes('работ') && (
                                                              <>
                                                                  <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(app.app_id, 2)}>✔ Одобрить</button>
                                                                  <button className="btn btn-sm btn-danger" onClick={() => { setRejectingAppId(app.app_id); setRejectionReasonText(''); }}>✖ Отклонить</button>
                                                              </>
                                                          )}
                                                          {(app.status_name?.toLowerCase().includes('одобр') || app.status_name?.toLowerCase().includes('отклон')) && !app.card_mask && (
                                                               <button className="btn btn-sm btn-warning" onClick={() => handleStatusChange(app.app_id, 1, '')}>↩ Пересмотреть</button>
                                                          )}
                                                      </div>
                                                  )}
                                              </td>
                                          </tr>
                                          
                                          {expandedApp === app.app_id && (
                                              <tr style={{ backgroundColor: '#f8fafc' }}>
                                                  <td colSpan="5" style={{ padding: '25px' }}>
                                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
                                                          <div style={{ flex: 1, minWidth: '250px' }}>
                                                              <h4 style={{ color: 'var(--primary)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>👶 Анкета ребенка</h4>
                                                              <p><strong>Дата рождения:</strong> {new Date(app.birth_date).toLocaleDateString('ru-RU')}</p>
                                                              <p><strong>СНИЛС:</strong> {formatSnils(app.snils)}</p>
                                                              <p><strong>ОМС:</strong> {formatOms(app.oms || '')}</p>
                                                              <p><strong>Адрес:</strong> {app.child_address || 'Нет'}</p>
                                                              <p><strong>Доп. инфо:</strong> {app.additional_info || 'Нет'}</p>
                                                          </div>
                                                          {/* НОВЫЙ БЛОК: Просмотр документов менеджером */}
                                                              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                                  <h5 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '14px' }}>📎 Прикрепленные документы:</h5>
                                                                  {documents[app.child_id] && documents[app.child_id].length > 0 ? (
                                                                      <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                                                                          {documents[app.child_id].map(doc => (
                                                                              <li key={doc.document_id} style={{ margin_bottom: '5px', fontSize: '14px' }}>
                                                                                  📄 <a href={`http://localhost:5000${doc.file_path}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                                                                                      {doc.document_type}
                                                                                  </a>
                                                                              </li>
                                                                          ))}
                                                                      </ul>
                                                                  ) : (
                                                                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Документы не загружены</p>
                                                                  )}
                                                              </div>
                                                          <div style={{ flex: 1, minWidth: '250px' }}>
                                                              <h4 style={{ color: 'var(--primary)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>👨‍👩‍👦 Заявитель</h4>
                                                              <p><strong>ФИО:</strong> {app.parent_fio || <span style={{color: '#aaa'}}>Не заполнено</span>}</p>
                                                              <p><strong>Email:</strong> {app.parent_email}</p>
                                                              <p><strong>Телефон:</strong> {app.parent_phone || 'Нет'}</p>
                                                              <p><strong>Адрес:</strong> {app.parent_address || 'Нет'}</p>
                                                          </div>
                                                          {app.card_mask && (
                                                              <div style={{ flex: 1, minWidth: '250px' }}>
                                                                  <div className="receipt-box">
                                                                      <h4 style={{ color: 'var(--success)', margin: '0 0 10px 0' }}>🧾 Чек об оплате</h4>
                                                                      <p><strong>Сумма:</strong> {app.payment_amount} руб.</p>
                                                                      <p><strong>Карта:</strong> {app.card_mask}</p>
                                                                      <p><strong>Дата:</strong> {new Date(app.payment_date).toLocaleString('ru-RU')}</p>
                                                                  </div>
                                                              </div>
                                                          )}
                                                      </div>
                                                      <div style={{ textalign: 'right', marginTop: '15px' }}>
                                                          {app.is_blacklisted ? (
                                                              <button className="btn btn-sm btn-secondary" onClick={() => handleToggleBlacklist(app.child_id, app.is_blacklisted)}>⚖️ Убрать из ЧС</button>
                                                          ) : (
                                                              blacklistingChildId === app.child_id ? (
                                                                  <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                                                      <input className="form-input" style={{ width: '100%', maxWidth: '200px', padding: '6px', marginBottom: 0 }} type="text" placeholder="Причина ЧС" value={blacklistReasonText} onChange={(e) => setBlacklistReasonText(e.target.value)} />
                                                                      <button className="btn btn-sm btn-danger" onClick={() => handleToggleBlacklist(app.child_id, false, blacklistReasonText)}>В ЧС</button>
                                                                      <button className="btn btn-sm btn-secondary" onClick={() => setBlacklistingChildId(null)}>Отмена</button>
                                                                  </div>
                                                              ) : (
                                                                  <button className="btn btn-sm btn-danger" onClick={() => { setBlacklistingChildId(app.child_id); setBlacklistReasonText(''); }}>🚨 В черный список</button>
                                                              )
                                                          )}
                                                      </div>
                                                  </td>
                                              </tr>
                                          )}
                                      </React.Fragment>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- ЭКРАН 3: ЛИЧНЫЙ КАБИНЕТ РОДИТЕЛЯ ---
  return (
    <div className="dashboard-container parent-container">
      <div className="header-bar">
        <h1 style={{ color: '#000' }}>Личный кабинет Родителя</h1>
        <button className="btn btn-secondary" onClick={handleLogout}>Выйти</button>
      </div>

      {payingApp && (
          <div className="card" style={{ borderLeft: '5px solid var(--success)' }}>
              <h2 style={{ color: 'var(--success)', margin: '0 0 20px 0' }}>💳 Оплата путевки</h2>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                  <p style={{ margin: '5px 0' }}><strong>Ребенок:</strong> {payingApp.fio}</p>
                  <p style={{ margin: '5px 0' }}><strong>Смена:</strong> {payingApp.code}</p>
                  <p style={{ margin: '5px 0', fontSize: '20px' }}><strong>К оплате: <span style={{ color: 'var(--success)' }}>{payingApp.price} руб.</span></strong></p>
              </div>
              
              <form onSubmit={handleProcessPayment}>
                  <div className="form-row">
                      <input className="form-input" type="text" placeholder="Номер карты (16 цифр)" maxLength="16" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))} required />
                  </div>
                  <div className="form-row">
                      <input className="form-input" type="text" placeholder="ММ/ГГ" maxLength="5" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} required />
                      <input className="form-input" type="password" placeholder="CVC/CVV" maxLength="3" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))} required />
                  </div>
                  <div className="action-buttons">
                      <button type="submit" className="btn btn-success">Подтвердить платеж</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setPayingApp(null)}>Отмена</button>
                  </div>
              </form>
          </div>
      )}

      {/* ПАНЕЛЬ ВКЛАДОК */}
      <div className="tabs-container no-print">
          <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              👤 Мой профиль
          </button>
          <button className={`tab-button ${activeTab === 'children' ? 'active' : ''}`} onClick={() => setActiveTab('children')}>
              👦👧 Мои дети
          </button>
          <button className={`tab-button ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
              📝 Мои заявки
          </button>
      </div>

      <div className="card">
          
          {/* СОДЕРЖИМОЕ ВКЛАДКИ: ПРОФИЛЬ */}
          {activeTab === 'profile' && (
              <div>
                <div className="tab-header">
                    <div className="spacer"></div>
                    <h2>Мой профиль</h2>
                    <div className="actions">
                        <button className={`btn ${isEditingProfile ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setIsEditingProfile(!isEditingProfile)}>
                            {isEditingProfile ? 'Отменить' : 'Редактировать'}
                        </button>
                    </div>
                </div>

                {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-row">
                            <input className="form-input" type="text" placeholder="ФИО полностью" value={profileForm.fio} onChange={(e) => setProfileForm({...profileForm, fio: e.target.value})} required />
                            <input className="form-input" type="text" placeholder="Номер телефона" maxLength="18" value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: formatPhone(e.target.value)})} required />
                        </div>
                        <textarea className="form-input" placeholder="Адрес проживания (Заявителя)" value={profileForm.address} onChange={(e) => setProfileForm({...profileForm, address: e.target.value})} required />
                        <button type="submit" className="btn btn-success">Сохранить профиль</button>
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
          )}

          {/* СОДЕРЖИМОЕ ВКЛАДКИ: ДЕТИ */}
          {activeTab === 'children' && (
              <div>
                <div className="tab-header">
                    <div className="spacer"></div>
                    <h2>Мои дети</h2>
                    <div className="actions">
                        <button className="btn btn-primary" onClick={() => { setShowAddForm(!showAddForm); setFormError(''); }}>
                          {showAddForm ? 'Отменить' : '+ Добавить анкету'}
                        </button>
                    </div>
                </div>

                {showAddForm && (
                  <div style={{ padding: '20px', backgroundColor: '#f8fafc', border: '1.5px solid var(--primary)', borderRadius: '12px', marginBottom: '25px' }}>
                      <h3 style={{ margin: '0 0 20px 0' }}>Новая анкета</h3>
                      <form onSubmit={handleAddChild}>
                          <div className="form-row">
                              <input className="form-input" type="text" placeholder="ФИО ребенка" value={newFio} onChange={(e) => setNewFio(e.target.value)} required />
                              <input className="form-input" type="text" placeholder="Дата рождения (ДД.ММ.ГГГГ)" maxLength="10" value={newBirthDate} onChange={(e) => setNewBirthDate(formatDate(e.target.value))} required />
                          </div>
                          <div className="form-row">
                              <input className="form-input" type="text" placeholder="СНИЛС" maxLength="14" value={newSnils} onChange={(e) => setNewSnils(formatSnils(e.target.value))} required />
                              <input className="form-input" type="text" placeholder="Полис ОМС" maxLength="19" value={newOms} onChange={(e) => setNewOms(formatOms(e.target.value))} required />
                          </div>
                          <textarea className="form-input" placeholder="Адрес прописки (если отличается от вашего)" value={newChildAddress} onChange={(e) => setNewChildAddress(e.target.value)} />
                          <textarea className="form-input" placeholder="Особенности (аллергия, питание) / Доп. информация" value={newAdditionalInfo} onChange={(e) => setNewAdditionalInfo(e.target.value)} />
                          {formError && <p style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{formError}</p>}
                          <button type="submit" className="btn btn-primary">Сохранить анкету</button>
                      </form>
                  </div>
                )}

                {children.length === 0 ? ( 
                  <div style={{ textalign: 'center', padding: '30px', color: '#666' }}>Вы еще не добавили ни одной анкеты ребенка.</div> 
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {children.map((child) => (
                      <div key={child.child_id} style={{ padding: '20px', border: '1.5px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                        {editingChildId === child.child_id ? (
                            <form onSubmit={(e) => handleEditChildSubmit(e, child.child_id)}>
                                <h3 style={{ color: 'var(--primary)', margin: '0 0 20px 0' }}>Редактирование анкеты</h3>
                                <div className="form-row">
                                    <input className="form-input" type="text" value={editChildForm.fio} onChange={(e) => setEditChildForm({...editChildForm, fio: e.target.value})} required />
                                    <input className="form-input" type="text" placeholder="Дата рождения (ДД.ММ.ГГГГ)" maxLength="10" value={editChildForm.birth_date} onChange={(e) => setEditChildForm({...editChildForm, birth_date: formatDate(e.target.value)})} required />
                                </div>
                                <div className="form-row">
                                    <input className="form-input" type="text" placeholder="СНИЛС" maxLength="14" value={editChildForm.snils} onChange={(e) => setEditChildForm({...editChildForm, snils: formatSnils(e.target.value)})} required />
                                    <input className="form-input" type="text" placeholder="ОМС" maxLength="19" value={editChildForm.oms} onChange={(e) => setEditChildForm({...editChildForm, oms: formatOms(e.target.value)})} required />
                                </div>
                                <textarea className="form-input" placeholder="Адрес" value={editChildForm.address} onChange={(e) => setEditChildForm({...editChildForm, address: e.target.value})} />
                                <textarea className="form-input" placeholder="Доп. информация" value={editChildForm.additional_info} onChange={(e) => setEditChildForm({...editChildForm, additional_info: e.target.value})} />
                                <div className="action-buttons">
                                    <button type="submit" className="btn btn-success">Сохранить</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingChildId(null)}>Отмена</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                {/* НОВЫЙ UX ДИЗАЙН КАРТОЧКИ: Имя слева, Кнопки справа */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: '2px solid var(--border-color)', paddingBottom: '15px', marginBottom: '15px' }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '22px', margin: 0 }}>👶 {child.fio}</h3>
                                    <div className="action-buttons" style={{ margin: 0 }}>
                                        <button className="btn btn-sm btn-warning" onClick={() => startEditingChild(child)}>✏️ Изменить</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteChild(child.child_id)}>🗑 Удалить</button>
                                    </div>
                                </div>

                                {/* ДАННЫЕ РЕБЕНКА: В сетку из 2-х колонок на ПК */}
                                <div className="info-grid">
                                    <p style={{ margin: '5px 0' }}><strong>Дата рождения:</strong> {new Date(child.birth_date).toLocaleDateString('ru-RU')}</p>
                                    <p style={{ margin: '5px 0' }}><strong>СНИЛС:</strong> {formatSnils(child.snils)}</p>
                                    <p style={{ margin: '5px 0' }}><strong>Полис ОМС:</strong> {formatOms(child.oms || '')}</p>
                                    <p style={{ margin: '5px 0' }}><strong>Адрес прописки:</strong> {child.address || 'Не указан'}</p>
                                    <p style={{ margin: '5px 0', gridColumn: '1 / -1' }}><strong>Доп. инфо:</strong> {child.additional_info || 'Нет'}</p>
                                </div>

                                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#475569' }}>📎 Прикрепленные документы</h4>
                                    {documents[child.child_id] && documents[child.child_id].length > 0 ? (
                                        <ul style={{ listStyleType: 'none', padding: 0, margin: '0 0 15px 0' }}>
                                            {documents[child.child_id].map(doc => (
                                            <li key={doc.document_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                                                <a href={`http://localhost:5000${doc.file_path}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                                                    {doc.document_type}
                                                </a>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteDocument(doc.document_id)}>✖</button>
                                            </li>
                                            ))}
                                        </ul>
                                    ) : ( <p style={{ fontSize: '14px', color: '#94a3b8' }}>Документы пока не загружены.</p> )}

                                    <div className="form-row" style={{ alignItems: 'center' }}>
                                        <select className="form-input" style={{ marginBottom: 0, cursor: 'pointer' }} value={uploadTypes[child.child_id] || ""} onChange={(e) => setUploadTypes({...uploadTypes, [child.child_id]: e.target.value})}>
                                            <option value="" disabled>-- Выберите тип --</option>
                                            <option value="Свидетельство о рождении">Свидетельство о рождении</option>
                                            <option value="Полис ОМС">Полис ОМС</option>
                                            <option value="Мед. справка 079/у">Мед. справка 079/у</option>
                                        </select>
                                        <input type="file" className="form-input" style={{ marginBottom: 0, background: '#fff' }} onChange={(e) => setUploadFiles({...uploadFiles, [child.child_id]: e.target.files[0]})} />
                                        <button className="btn btn-secondary" onClick={() => handleUploadDocument(child.child_id)}>Загрузить</button>
                                    </div>
                                </div>

                                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <select 
                                        className="form-input" 
                                        style={{ marginBottom: 0, cursor: 'pointer' }} 
                                        value={selectedShifts[child.child_id] || ""} 
                                        onChange={(e) => setSelectedShifts({...selectedShifts, [child.child_id]: e.target.value})}
                                    >
                                        <option value="" disabled>-- Выберите программу смены --</option>
                                        {shifts.map(shift => (
                                            <option key={shift.shift_id} value={shift.shift_id}>
                                                {shift.program_name} (с {new Date(shift.start_date).toLocaleDateString('ru-RU')} по {new Date(shift.end_date).toLocaleDateString('ru-RU')})
                                            </option>
                                        ))}
                                    </select>

                                    <div className="form-row" style={{ marginBottom: 0 }}>
                                        <select 
                                            className="form-input" 
                                            style={{ marginBottom: 0, cursor: 'pointer' }}
                                            value={shiftDetails[child.child_id]?.season || ""} 
                                            onChange={(e) => setShiftDetails({...shiftDetails, [child.child_id]: {...(shiftDetails[child.child_id] || {}), season: e.target.value}})}
                                        >
                                            <option value="">Сезон</option>
                                            <option value="Лето">Лето</option>
                                            <option value="Осень">Осень</option>
                                            <option value="Зима">Зима</option>
                                            <option value="Весна">Весна</option>
                                        </select>

                                        <select 
                                            className="form-input" 
                                            style={{ marginBottom: 0, cursor: 'pointer' }}
                                            value={shiftDetails[child.child_id]?.accommodation || ""} 
                                            onChange={(e) => setShiftDetails({...shiftDetails, [child.child_id]: {...(shiftDetails[child.child_id] || {}), accommodation: e.target.value}})}
                                        >
                                            <option value="">Проживание</option>
                                            <option value="Корпус стандарт">Корпус стандарт</option>
                                            <option value="Корпус улучшенный">Корпус улучшенный</option>
                                            <option value="Глэмпинг">Глэмпинг</option>
                                        </select>

                                        <input 
                                            className="form-input" 
                                            style={{ marginBottom: 0 }}
                                            type="number" 
                                            placeholder="№ смены" 
                                            min="1"
                                            value={shiftDetails[child.child_id]?.shiftNum || ""} 
                                            onChange={(e) => setShiftDetails({...shiftDetails, [child.child_id]: {...(shiftDetails[child.child_id] || {}), shiftNum: e.target.value}})}
                                        />
                                    </div>

                                    {shiftDetails[child.child_id]?.accommodation && (
                                        <div style={{ textalign: 'center', margin: '15px 0', fontSize: '18px', color: '#475569' }}>
                                            Итоговая стоимость: <strong style={{ color: 'var(--success)', fontSize: '22px' }}>
                                                {getPriceForAccommodation(shiftDetails[child.child_id]?.accommodation).toLocaleString('ru-RU')} руб.
                                            </strong>
                                        </div>
                                    )}

                                    <button className="btn btn-primary" style={{ padding: '12px' }} onClick={() => handleApply(child.child_id)}>
                                        Подать заявку
                                    </button>
                                </div>
                            </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
          )}

          {/* СОДЕРЖИМОЕ ВКЛАДКИ: ЗАЯВКИ */}
          {activeTab === 'applications' && (
              <div>
                <h2 style={{ margin: '0 0 20px 0', textalign: 'center' }}>Статус поданных заявок</h2>
                
                {applications.length === 0 ? ( 
                    <p style={{ color: '#666', textalign: 'center' }}>У вас пока нет активных заявок.</p> 
                ) : (
                    <div className="table-container">
                        <table className="modern-table">
                        <thead>
                            <tr>
                            <th>ФИО Ребенка</th>
                            <th>Инфо о путевке</th>
                            <th>Статус</th>
                            <th style={{ textalign: 'center' }}>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map((app) => (
                            <tr key={app.app_id}>
                                <td><strong>{app.fio}</strong></td>
                                <td>
                                    <div>{app.code}</div>
                                    {app.season && <div style={{ fontSize: '12px', color: '#666' }}>{app.season}, {app.accommodation_type}, сч. №{app.shift_number}</div>}
                                </td>
                                <td>
                                    <span className="badge" style={{ backgroundColor: getBadgeColor(app.status_name) }}>{app.status_name}</span>
                                    {app.status_name?.toLowerCase().includes('отклон') && app.rejection_reason && (
                                        <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '5px', fontWeight: 'bold' }}>Причина: {app.rejection_reason}</div>
                                    )}
                                    {app.card_mask && (
                                        <div className="receipt-box">
                                            <p style={{ color: 'var(--success)', margin: '0 0 5px 0', fontWeight: 'bold' }}>✅ Оплачено</p>
                                            <p style={{ margin: '2px 0' }}>Сумма: {app.amount || app.price} ₽</p>
                                            <p style={{ margin: '2px 0' }}>Карта: {app.card_mask}</p>
                                        </div>
                                    )}
                                </td>
                                <td style={{ textalign: 'center' }}>
                                    <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                        {app.status_name?.toLowerCase().includes('одобр') && !app.card_mask && (
                                            <button className="btn btn-sm btn-success" onClick={() => { setPayingApp(app); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>💳 Оплатить</button>
                                        )}
                                        {!app.status_name?.toLowerCase().includes('опла') && !app.card_mask && (
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleCancelApplication(app.app_id)}>✖ Отменить</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                )}
              </div>
          )}
      </div>
    </div>
  );
}

export default App;