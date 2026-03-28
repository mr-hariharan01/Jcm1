const API_BASE = '/api';
let holdTimer;
let holdPct = 0;

const $ = (id) => document.getElementById(id);
const token = () => localStorage.getItem('token');
const role = () => localStorage.getItem('role');

function showToast(message, isError = false) {
  const t = $('toast');
  t.textContent = message;
  t.style.borderColor = isError ? '#ff4d6d' : '#2f4f80';
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}
function setLoading(show) { $('loading').classList.toggle('hidden', !show); }

async function api(path, options = {}) {
  try {
    setLoading(true);
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

function dueInfo(lastRechargeDate) {
  const d = new Date(lastRechargeDate);
  d.setDate(d.getDate() + 28);
  const diff = Math.ceil((d - new Date()) / 86400000);
  return { dueDate: d.toISOString().slice(0, 10), diff, expired: diff < 0 };
}

function startHold() {
  holdPct = 0;
  holdTimer = setInterval(() => {
    holdPct += 5;
    $('holdProgress').style.width = `${holdPct}%`;
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
  }
}

async function customerLogin() {
  const customerId = $('custId').value.trim().toUpperCase();
  const password = $('custPass').value;
  if (!/^JCM\d{3}$/.test(customerId)) return showToast('Invalid customer ID format', true);
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: customerId, password }),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    showToast('Connected ✅');
    render();
  } catch (e) {
    showToast(e.message, true);
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
    render();
  } catch (e) {
    showToast(e.message, true);
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  render();
}

async function loadCustomerDashboard() {
  const profile = await api('/customer/profile');
  const payments = await api('/customer/payments');
  const info = dueInfo(profile.lastRechargeDate);

  $('custTitle').textContent = `Welcome, ${profile.name}`;
  $('custProfile').innerHTML = `
    <div><b>ID:</b> ${profile.customerId}</div>
    <div><b>Plan:</b> ${profile.plan}</div>
    <div><b>Last Recharge:</b> ${profile.lastRechargeDate.slice(0,10)}</div>
    <div><b>Due Date:</b> ${info.dueDate}</div>
    <div><b>Status:</b> ${info.expired ? 'Expired' : 'Active'}</div>
  `;

  $('expiredBanner').classList.toggle('hidden', !info.expired);
  $('reminderBanner').textContent = info.diff >= 0 && info.diff <= 3 ? `Expires in ${info.diff} day(s)` : '';
  $('reminderBanner').classList.toggle('hidden', !(info.diff >= 0 && info.diff <= 3));

  $('paymentHistory').innerHTML = `<table><tr><th>Date</th><th>Txn</th><th>Amount</th><th>Status</th></tr>${payments
    .map((p) => `<tr><td>${p.date.slice(0,10)}</td><td>${p.transactionId}</td><td>₹${p.amount}</td><td>${p.status}</td></tr>`)
    .join('')}</table>`;
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
    showToast('Payment submitted as pending');
    await loadCustomerDashboard();
  } catch (e) {
    showToast(e.message, true);
  }
}

async function loadAdminDashboard() {
  const customers = await api('/admin/customers');
  const pendingPayments = await api('/admin/payments?status=Pending');

  $('tab-customers').innerHTML = `
    <h3>Customers</h3>
    <div class="row two">
      <input id="newName" placeholder="Name" />
      <input id="newCustomerId" placeholder="JCM003" />
      <input id="newPhone" placeholder="Phone" />
      <input id="newPlan" placeholder="Plan" />
      <input id="newPassword" placeholder="Password" />
      <button id="addCustomerBtn">Add Customer</button>
    </div>
    <table><tr><th>ID</th><th>Name</th><th>Plan</th><th>Status</th><th>Delete</th></tr>
      ${customers.map((c) => `<tr><td>${c.customerId}</td><td>${c.name}</td><td>${c.plan}</td><td>${c.status}</td><td><button onclick="deleteCustomer('${c._id}')">Delete</button></td></tr>`).join('')}
    </table>
  `;
  $('addCustomerBtn').onclick = addCustomer;

  $('tab-payments').innerHTML = `<h3>Pending Payments</h3><table><tr><th>Customer</th><th>Txn</th><th>Amount</th><th>Action</th></tr>${pendingPayments
    .map((p) => `<tr><td>${p.customerId}</td><td>${p.transactionId}</td><td>₹${p.amount}</td><td><button onclick="approvePayment('${p._id}')">Approve</button></td></tr>`)
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
    await loadAdminDashboard();
  } catch (e) {
    showToast(e.message, true);
  }
}

async function deleteCustomer(id) {
  try {
    await api(`/admin/customer/${id}`, { method: 'DELETE' });
    showToast('Customer deleted');
    await loadAdminDashboard();
  } catch (e) {
    showToast(e.message, true);
  }
}
window.deleteCustomer = deleteCustomer;

async function approvePayment(id) {
  try {
    await api(`/payment/approve/${id}`, { method: 'PUT' });
    showToast('Payment approved');
    await loadAdminDashboard();
  } catch (e) {
    showToast(e.message, true);
  }
}
window.approvePayment = approvePayment;

function initTabs() {
  document.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      document.querySelectorAll('.tabpane').forEach((p) => p.classList.add('hidden'));
      document.getElementById(`tab-${t.dataset.tab}`).classList.remove('hidden');
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
    try { await loadCustomerDashboard(); } catch (e) { showToast(e.message, true); }
  }
  if (isAdmin) {
    try { await loadAdminDashboard(); } catch (e) { showToast(e.message, true); }
  }
}

$('holdBtn').addEventListener('mousedown', startHold);
$('holdBtn').addEventListener('touchstart', startHold);
['mouseup', 'mouseleave', 'touchend'].forEach((e) => $('holdBtn').addEventListener(e, stopHold));
$('adminLoginBtn').onclick = adminLogin;
$('logoutCust').onclick = logout;
$('logoutAdmin').onclick = logout;
$('submitPayment').onclick = submitPayment;

initTabs();
render();
