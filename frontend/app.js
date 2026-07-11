const API_BASE = '/api';
const UPI_ID = 'jegan@upi';
let holdTimer;
let holdPct = 0;
const notifications = [];

const $ = (id) => document.getElementById(id);
const token = () => localStorage.getItem('token');
const role = () => localStorage.getItem('role');
const customerIdFromToken = () => localStorage.getItem('customerId');

function showToast(message, isError = false) {
  const t = $('toast');
  t.textContent = message;
  t.style.borderColor = isError ? '#ff4d6d' : '#2f4f80';
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

function setLoading(show) { $('loading').classList.toggle('hidden', !show); }

async function api(path, options = {}) {
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API request failed');
    return data;
  } finally {
    setLoading(false);
  }
}

function addNotification(msg) {
  notifications.unshift({ msg, time: new Date().toLocaleString(), read: false });
  $('notifCount').textContent = notifications.filter((x) => !x.read).length;
  $('notifCount').classList.toggle('hidden', notifications.length === 0);
}

function dueInfo(lastRechargeDate) {
  const due = new Date(lastRechargeDate);
  due.setDate(due.getDate() + 28);
  const diff = Math.ceil((due - new Date()) / 86400000);
  return { dueDate: due.toISOString().slice(0, 10), diff, expired: diff < 0 };
}

function startHold() {
  holdPct = 0;
  $('holdBtn').classList.add('glow');
  holdTimer = setInterval(() => {
    holdPct += 5;
    $('holdProgress').style.width = `${holdPct}%`;
    if (navigator.vibrate) navigator.vibrate(15);
    if (holdPct >= 100) {
      clearInterval(holdTimer);
      customerLogin();
    }
  }, 80);
}

function stopHold() {
  clearInterval(holdTimer);
  if (holdPct < 100) {
    holdPct = 0;
    $('holdProgress').style.width = '0%';
    $('holdBtn').classList.remove('glow');
  }
}

async function customerLogin() {
  const customerId = $('custId').value.trim().toUpperCase();
  const password = $('custPass').value;
  if (!/^JCM\d{3}$/.test(customerId)) return showToast('Customer ID must be JCM001 format', true);

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: customerId, password }),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('customerId', data.customerId || customerId);
    addNotification('Connected successfully');
    showToast('Connected ✅');
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function adminLogin() {
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: $('adminEmail').value.trim(), password: $('adminPass').value }),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.removeItem('customerId');
    showToast('Admin logged in');
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('customerId');
  notifications.length = 0;
  render();
}

function drawStatusChart(payments) {
  const canvas = $('statusChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const approved = payments.filter((p) => p.status === 'Approved').length;
  const pending = payments.filter((p) => p.status === 'Pending').length;
  const total = Math.max(approved + pending, 1);

  canvas.width = canvas.offsetWidth;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0f2446';
  ctx.fillRect(0, 0, w, h);

  const barW = 120;
  const ax = w * 0.25;
  const px = w * 0.60;
  const maxH = h - 40;

  const ah = (approved / total) * maxH;
  const ph = (pending / total) * maxH;
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(ax, h - ah - 20, barW, ah);
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(px, h - ph - 20, barW, ph);

  ctx.fillStyle = '#eaf2ff';
  ctx.font = '14px Segoe UI';
  ctx.fillText(`Approved (${approved})`, ax, h - 2);
  ctx.fillText(`Pending (${pending})`, px, h - 2);
}

async function loadCustomerDashboard() {
  const customerId = customerIdFromToken();
  const profile = await api(`/customer/${customerId}`);
  const payments = await api('/customer/payments');
  const info = dueInfo(profile.lastRechargeDate);

  $('custTitle').textContent = `Welcome, ${profile.name}`;
  $('custProfile').innerHTML = `
    <div class="stats">
      <div class="stat"><small>ID</small><div><b>${profile.customerId}</b></div></div>
      <div class="stat"><small>Plan</small><div><b>${profile.plan}</b></div></div>
      <div class="stat"><small>Last Recharge</small><div><b>${profile.lastRechargeDate.slice(0,10)}</b></div></div>
      <div class="stat"><small>Due Date</small><div><b>${info.dueDate}</b></div></div>
    </div>
    <div style="margin-top:10px"><span class="pill ${info.expired ? 'bad' : 'ok'}">${info.expired ? 'Expired' : 'Active'}</span></div>
  `;

  $('expiredBanner').classList.toggle('hidden', !info.expired);
  const expiring = info.diff >= 0 && info.diff <= 3;
  $('reminderBanner').textContent = expiring ? `⚠️ Plan expires in ${info.diff} day(s)` : '';
  $('reminderBanner').classList.toggle('hidden', !expiring);

  $('paymentHistory').innerHTML = `<table><tr><th>Date</th><th>Txn ID</th><th>Amount</th><th>Status</th></tr>${payments
    .map((p) => `<tr><td>${p.date.slice(0, 10)}</td><td>${p.transactionId}</td><td>₹${p.amount}</td><td>${p.status}</td></tr>`)
    .join('')}</table>`;

  const tickets = await api('/ticket/my');
  $('ticketHistory').innerHTML = tickets.length
    ? `<table><tr><th>Subject</th><th>Message</th><th>Status</th><th>Reply</th></tr>${tickets
        .map((t) => `<tr><td>${t.subject}</td><td>${t.message}</td><td>${t.status}</td><td>${t.reply || '-'}</td></tr>`)
        .join('')}</table>`
    : '<small>No tickets yet.</small>';

  drawStatusChart(payments);
}

async function submitPayment() {
  try {
    await api('/payment', {
      method: 'POST',
      body: JSON.stringify({
        transactionId: $('txnId').value.trim(),
        amount: Number($('amount').value),
      }),
    });
    addNotification('Payment submitted and pending approval');
    showToast('Payment submitted');
    loadCustomerDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
}

function openUpi() {
  const amount = Number($('amount').value || 0);
  const customerId = customerIdFromToken() || 'JCM000';
  window.location.href = `upi://pay?pa=${UPI_ID}&pn=JeganCable&am=${amount}&tn=${customerId}`;
}

async function submitTicket() {
  try {
    await api('/ticket', {
      method: 'POST',
      body: JSON.stringify({
        subject: $('ticketSubject').value.trim(),
        message: $('ticketMessage').value.trim(),
      }),
    });
    showToast('Ticket submitted');
    addNotification('Ticket created successfully');
    $('ticketSubject').value = '';
    $('ticketMessage').value = '';
    loadCustomerDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function loadAdminDashboard() {
  const customers = await api('/admin/customers');
  const payments = await api('/admin/payments');
  const tickets = await api('/admin/tickets');

  const active = customers.filter((c) => !dueInfo(c.lastRechargeDate).expired).length;
  const expired = customers.length - active;
  const pending = payments.filter((p) => p.status === 'Pending').length;

  $('tab-overview').innerHTML = `
    <div class="stats">
      <div class="stat"><small>Total Customers</small><div><b>${customers.length}</b></div></div>
      <div class="stat"><small>Active</small><div><b>${active}</b></div></div>
      <div class="stat"><small>Expired</small><div><b>${expired}</b></div></div>
      <div class="stat"><small>Pending Payments</small><div><b>${pending}</b></div></div>
    </div>`;

  $('tab-customers').innerHTML = `
    <h3>Customers</h3>
    <div class="row three">
      <input id="newName" placeholder="Name" />
      <input id="newCustomerId" placeholder="JCM003" />
      <input id="newPhone" placeholder="Phone" />
      <input id="newPlan" placeholder="Plan" />
      <input id="newPassword" placeholder="Password" />
      <button id="addCustomerBtn">Add Customer</button>
    </div>
    <table><tr><th>ID</th><th>Name</th><th>Phone</th><th>Plan</th><th>Status</th><th>Delete</th></tr>
      ${customers
        .map((c) => {
          const isExpired = dueInfo(c.lastRechargeDate).expired;
          return `<tr><td>${c.customerId}</td><td>${c.name}</td><td>${c.phone}</td><td>${c.plan}</td><td>${isExpired ? 'Expired' : 'Active'}</td><td><button onclick="deleteCustomer('${c._id}')">Delete</button></td></tr>`;
        })
        .join('')}
    </table>`;

  $('addCustomerBtn').onclick = addCustomer;

  $('tab-payments').innerHTML = `<h3>Payments</h3>
    <table><tr><th>Customer</th><th>Txn</th><th>Amount</th><th>Status</th><th>Action</th></tr>
      ${payments
        .map((p) => `<tr><td>${p.customerId}</td><td>${p.transactionId}</td><td>₹${p.amount}</td><td>${p.status}</td><td>${p.status === 'Pending' ? `<button onclick="approvePayment('${p._id}')">Approve</button>` : '-'}</td></tr>`)
        .join('')}
    </table>`;

  $('tab-tickets').innerHTML = `<h3>Tickets</h3><table><tr><th>Customer</th><th>Subject</th><th>Message</th><th>Status</th><th>Reply</th></tr>
  ${tickets
    .map((t) => `<tr><td>${t.customerId}</td><td>${t.subject}</td><td>${t.message}</td><td>${t.status}</td><td>${t.status === 'Open' ? `<input id='reply-${t._id}' placeholder='Reply'><button onclick="replyTicket('${t._id}')">Send</button>` : t.reply || '-'}</td></tr>`)
    .join('')}</table>`;
}

async function addCustomer() {
  try {
    await api('/admin/customer', {
      method: 'POST',
      body: JSON.stringify({
        name: $('newName').value.trim(),
        customerId: $('newCustomerId').value.trim().toUpperCase(),
        phone: $('newPhone').value.trim(),
        plan: $('newPlan').value.trim(),
        password: $('newPassword').value,
      }),
    });
    showToast('Customer added');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteCustomer(id) {
  try {
    await api(`/admin/customer/${id}`, { method: 'DELETE' });
    showToast('Customer deleted');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
}
window.deleteCustomer = deleteCustomer;

async function approvePayment(id) {
  try {
    await api(`/payment/approve/${id}`, { method: 'PUT' });
    showToast('Payment approved');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
}
window.approvePayment = approvePayment;

async function replyTicket(id) {
  try {
    const reply = $(`reply-${id}`).value.trim();
    await api(`/ticket/reply/${id}`, { method: 'PUT', body: JSON.stringify({ reply }) });
    showToast('Reply sent');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
}
window.replyTicket = replyTicket;

function openNotifications() {
  if (!notifications.length) return showToast('No notifications');
  const text = notifications.map((n) => `• ${n.msg} (${n.time})`).join('\n');
  alert(text);
  notifications.forEach((n) => {
    n.read = true;
  });
  $('notifCount').classList.add('hidden');
}

function initTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tabpane').forEach((p) => p.classList.add('hidden'));
      $(`tab-${tab.dataset.tab}`).classList.remove('hidden');
    };
  });
}

async function render() {
  const isCustomer = role() === 'customer';
  const isAdmin = role() === 'admin';

  $('loginCard').classList.toggle('hidden', isCustomer || isAdmin);
  $('customerDash').classList.toggle('hidden', !isCustomer);
  $('adminDash').classList.toggle('hidden', !isAdmin);

  if (isCustomer) {
    try {
      await loadCustomerDashboard();
    } catch (error) {
      showToast(error.message, true);
    }
  }

  if (isAdmin) {
    try {
      await loadAdminDashboard();
    } catch (error) {
      showToast(error.message, true);
    }
  }
}

$('holdBtn').addEventListener('mousedown', startHold);
$('holdBtn').addEventListener('touchstart', startHold);
['mouseup', 'mouseleave', 'touchend'].forEach((e) => $('holdBtn').addEventListener(e, stopHold));
$('adminLoginBtn').onclick = adminLogin;
$('logoutCust').onclick = logout;
$('logoutAdmin').onclick = logout;
$('submitPayment').onclick = submitPayment;
$('submitTicket').onclick = submitTicket;
$('payNow').onclick = openUpi;
$('notifBtn').onclick = openNotifications;

initTabs();
render();
