const API_BASE = (window.location.port !== '5000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'))
  ? 'http://localhost:5000'
  : '';

const loginForm = document.getElementById('login-form');

if (loginForm) {
  // === LOGIN PAGE LOGIC (admin.html) ===
  console.log('[INIT] Login page detected.');

  // Display file warning box if opened directly via file://
  const fileWarningBox = document.getElementById('file-warning-box');
  if (fileWarningBox && window.location.protocol === 'file:') {
    fileWarningBox.style.display = 'block';
  }

  // Check login page store status indicator
  const loginStoreStatus = document.getElementById('login-store-status');
  if (loginStoreStatus) {
    fetch(`${API_BASE}/api/health`)
      .then(res => res.json())
      .then(healthData => {
        if (healthData && healthData.success) {
          return fetch(`${API_BASE}/api/store/status`)
            .then(res => res.json())
            .catch(() => fetch(`${API_BASE}/status`).then(res => res.json()))
            .then(data => {
              if (data.isOpen) {
                loginStoreStatus.innerHTML = '<span style="color: #2e7d32;">🟢 Store Open</span>';
              } else {
                loginStoreStatus.innerHTML = '<span style="color: #c62828;">🔴 Store Closed</span>';
              }
            });
        } else {
          loginStoreStatus.innerHTML = '<span style="color: #777;">⚪ Status Offline</span>';
        }
      })
      .catch(() => {
        loginStoreStatus.innerHTML = '<span style="color: #777;">⚪ Status Offline</span>';
      });
  }

  // Check if already authenticated, auto redirect to dashboard
  if (localStorage.getItem('adminToken')) {
    console.log('[INIT] Admin already logged in. Redirecting to dashboard...');
    window.location.href = 'dashboard.html';
  }

  const errorBox = document.getElementById('error-box');
  const errorMessage = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');

  function showError(msg) {
    if (errorMessage && errorBox) {
      errorMessage.textContent = msg;
      errorBox.style.display = 'flex';
      errorBox.style.animation = 'none';
      errorBox.offsetHeight; // trigger reflow
      errorBox.style.animation = '';
    }
  }

  function hideError() {
    if (errorBox) {
      errorBox.style.display = 'none';
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Authenticating...';
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
      console.log('[AUTH] Sending login request to /api/auth/login...');
      let res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
      }

      const data = await res.json();
      console.log('[AUTH] Login response received:', data);
      
      if (res.ok && data.success) {
        localStorage.setItem('adminToken', data.token);
        console.log('[AUTH] Token stored successfully. Redirecting...');
        window.location.href = 'dashboard.html';
      } else {
        showError(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      console.error('[AUTH] Login request failed:', err);
      try {
        const healthRes = await fetch(`${API_BASE}/api/health`);
        const healthData = await healthRes.json();
        if (healthData && healthData.success) {
          showError('Unable to log in. Please check network connection.');
        } else {
          showError('Server not running');
        }
      } catch (healthErr) {
        showError('Server not running');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify Credentials';
    }
  });
} else {
  // === DASHBOARD PAGE LOGIC (dashboard.html) ===
  console.log('[INIT] Dashboard page detected. Checking authentication...');
  if (!localStorage.getItem('adminToken')) {
    console.log('[INIT] Access denied: No adminToken found in localStorage. Redirecting to login page.');
    window.location.href = 'admin.html';
  } else {
    console.log('[INIT] Access granted: Admin credentials found.');
  }

// Toast controller
function showToast(message, isError = false) {
  console.log(`[TOAST] Showing message: "${message}" (isError=${isError})`);
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.backgroundColor = isError ? '#c62828' : '#111111';
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Auth helpers
function getToken() {
  return localStorage.getItem('adminToken');
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Log out action
const logoutBtn = document.getElementById('logout-button');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    console.log('[AUTH] Logging out admin session...');
    localStorage.removeItem('adminToken');
    showToast('Logged out successfully.');
    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 500);
  });
}

// API Error Interceptor
function handleFetchError(res) {
  if (res.status === 401 || res.status === 403) {
    console.warn(`[AUTH] Session validation failed on server (Status: ${res.status}). Cleaning token...`);
    localStorage.removeItem('adminToken');
    showToast('Session expired. Please log in again.', true);
    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 1200);
    return true;
  }
  return false;
}

// ================= BOOKING MANAGEMENT SYSTEM =================
let bookingState = {
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  status: 'all',
  search: '',
  activeBookingId: null
};

async function loadBookingStats() {
  try {
    const res = await fetch(`${API_BASE}/api/bookings/stats/summary`, {
      headers: getAuthHeaders()
    });
    if (handleFetchError(res)) return;
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('stat-total').textContent = data.stats.total || 0;
      document.getElementById('stat-pending').textContent = data.stats.pending || 0;
      document.getElementById('stat-confirmed').textContent = data.stats.confirmed || 0;
      document.getElementById('stat-upcoming').textContent = data.stats.upcoming || 0;
    }
  } catch (err) {
    console.error('[BOOKINGS] Failed to load summary stats:', err);
  }
}

async function loadBookingsList() {
  const tbody = document.getElementById('booking-table-body');
  if (!tbody) return;

  try {
    const params = new URLSearchParams({
      page: bookingState.currentPage,
      limit: bookingState.limit,
      status: bookingState.status,
      search: bookingState.search
    });

    const res = await fetch(`${API_BASE}/api/bookings?${params.toString()}`, {
      headers: getAuthHeaders()
    });

    if (handleFetchError(res)) return;

    const data = await res.json();

    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #c62828;">${data.message || 'Error loading bookings'}</td></tr>`;
      return;
    }

    bookingState.totalPages = data.totalPages || 1;
    updatePaginationUI(data.totalBookings || 0, data.bookings ? data.bookings.length : 0);

    if (!data.bookings || data.bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #777;">No appointment requests found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.bookings.map(b => {
      const eventDateStr = b.eventDate ? new Date(b.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
      const createdStr = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';
      const statusClass = b.status || 'pending';

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${escapeHtml(b.customerName)}</div>
            ${b.email ? `<div style="font-size: 0.75rem; color: #666;">${escapeHtml(b.email)}</div>` : ''}
          </td>
          <td><a href="tel:${b.phone}" style="color: var(--rosegold); font-weight: 500; text-decoration: none;">${escapeHtml(b.phone)}</a></td>
          <td><span style="font-weight: 500;">${eventDateStr}</span></td>
          <td>${escapeHtml(b.service)}</td>
          <td><span class="status-badge ${statusClass}">${statusClass}</span></td>
          <td><span style="font-size: 0.78rem; color: #777;">${createdStr}</span></td>
          <td>
            <div class="action-btn-group">
              <button type="button" class="btn-tb-action" onclick="openBookingModal('${b._id}')" title="View & Edit Details">
                <i class="bx bx-show"></i>
              </button>
              <select onchange="updateBookingStatusDirect('${b._id}', this.value)" style="padding: 4px 6px; font-size: 0.75rem; border-radius: 6px; border: 1px solid rgba(200,155,109,0.3);">
                <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirm</option>
                <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>Complete</option>
                <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Cancel</option>
              </select>
              <button type="button" class="btn-tb-action del" onclick="deleteBookingDirect('${b._id}')" title="Delete Booking">
                <i class="bx bx-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('[BOOKINGS] Failed to load bookings list:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #c62828;">Server connection error</td></tr>`;
  }
}

function updatePaginationUI(totalBookings, countOnPage) {
  const infoSpan = document.getElementById('booking-pagination-info');
  const pageBadge = document.getElementById('current-page-num');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (infoSpan) infoSpan.textContent = `Showing ${countOnPage} of ${totalBookings} requests`;
  if (pageBadge) pageBadge.textContent = bookingState.currentPage;

  if (prevBtn) prevBtn.disabled = (bookingState.currentPage <= 1);
  if (nextBtn) nextBtn.disabled = (bookingState.currentPage >= bookingState.totalPages);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function updateBookingStatusDirect(id, status) {
  console.log(`[BOOKINGS] Updating status of ${id} to ${status}`);
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status })
    });
    if (handleFetchError(res)) return;
    const data = await res.json();
    if (data.success) {
      showToast(`Booking status updated to ${status}`);
      loadBookingStats();
      loadBookingsList();
    } else {
      showToast(data.message || 'Failed to update status', true);
    }
  } catch (err) {
    console.error('[BOOKINGS] Status update failed:', err);
    showToast('Server connection failed', true);
  }
}

async function deleteBookingDirect(id) {
  if (!confirm('Are you sure you want to delete this appointment request?')) return;
  console.log(`[BOOKINGS] Deleting booking ${id}`);
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (handleFetchError(res)) return;
    const data = await res.json();
    if (data.success) {
      showToast('Appointment request deleted successfully');
      loadBookingStats();
      loadBookingsList();
    } else {
      showToast(data.message || 'Failed to delete booking', true);
    }
  } catch (err) {
    console.error('[BOOKINGS] Delete failed:', err);
    showToast('Server connection failed', true);
  }
}

async function openBookingModal(id) {
  bookingState.activeBookingId = id;
  const modal = document.getElementById('booking-detail-modal');
  const modalContent = document.getElementById('modal-booking-content');
  const statusSelect = document.getElementById('modal-status-select');
  const notesTextarea = document.getElementById('modal-admin-notes');

  if (!modal || !modalContent) return;

  modalContent.innerHTML = '<div style="text-align: center; padding: 20px;">Loading details...</div>';
  modal.classList.add('open');

  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
      headers: getAuthHeaders()
    });
    if (handleFetchError(res)) return;
    const data = await res.json();

    if (!data.success || !data.booking) {
      modalContent.innerHTML = '<div style="color: #c62828; text-align: center;">Error fetching booking details</div>';
      return;
    }

    const b = data.booking;
    const eventDateStr = b.eventDate ? new Date(b.eventDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
    const createdStr = b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN') : 'N/A';

    modalContent.innerHTML = `
      <div class="detail-row"><span class="detail-label">Customer:</span><span class="detail-val" style="font-weight: 600;">${escapeHtml(b.customerName)}</span></div>
      <div class="detail-row"><span class="detail-label">Phone:</span><span class="detail-val"><a href="tel:${b.phone}" style="color: var(--rosegold); text-decoration: none;">${escapeHtml(b.phone)}</a></span></div>
      <div class="detail-row"><span class="detail-label">Email:</span><span class="detail-val">${b.email ? escapeHtml(b.email) : '<i style="color:#999;">None provided</i>'}</span></div>
      <div class="detail-row"><span class="detail-label">Event Date:</span><span class="detail-val" style="font-weight: 600;">${eventDateStr}</span></div>
      <div class="detail-row"><span class="detail-label">Service:</span><span class="detail-val">${escapeHtml(b.service)}</span></div>
      <div class="detail-row"><span class="detail-label">Event Details:</span><span class="detail-val">${b.message ? escapeHtml(b.message) : '<i style="color:#999;">No extra message</i>'}</span></div>
      <div class="detail-row"><span class="detail-label">Submitted:</span><span class="detail-val" style="font-size: 0.82rem; color: #777;">${createdStr}</span></div>
    `;

    if (statusSelect) statusSelect.value = b.status || 'pending';
    if (notesTextarea) notesTextarea.value = b.adminNotes || '';

  } catch (err) {
    console.error('[BOOKINGS] Error opening modal:', err);
    modalContent.innerHTML = '<div style="color: #c62828; text-align: center;">Connection error</div>';
  }
}

function closeBookingModal() {
  const modal = document.getElementById('booking-detail-modal');
  if (modal) modal.classList.remove('open');
  bookingState.activeBookingId = null;
}

// Bind Booking Control Event Listeners
function initBookingControls() {
  const searchInput = document.getElementById('booking-search-input');
  const statusFilter = document.getElementById('booking-status-filter');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const saveModalBtn = document.getElementById('save-booking-modal-btn');

  let debounceTimer = null;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        bookingState.search = e.target.value;
        bookingState.currentPage = 1;
        loadBookingsList();
      }, 350);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      bookingState.status = e.target.value;
      bookingState.currentPage = 1;
      loadBookingsList();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (bookingState.currentPage > 1) {
        bookingState.currentPage--;
        loadBookingsList();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (bookingState.currentPage < bookingState.totalPages) {
        bookingState.currentPage++;
        loadBookingsList();
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeBookingModal);
  }

  if (saveModalBtn) {
    saveModalBtn.addEventListener('click', async () => {
      if (!bookingState.activeBookingId) return;

      const status = document.getElementById('modal-status-select')?.value;
      const adminNotes = document.getElementById('modal-admin-notes')?.value;

      saveModalBtn.disabled = true;
      saveModalBtn.textContent = 'Saving...';

      try {
        const res = await fetch(`${API_BASE}/api/bookings/${bookingState.activeBookingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ status, adminNotes })
        });

        if (handleFetchError(res)) return;

        const data = await res.json();
        if (data.success) {
          showToast('Booking details saved successfully!');
          closeBookingModal();
          loadBookingStats();
          loadBookingsList();
        } else {
          showToast(data.message || 'Failed to save booking details', true);
        }
      } catch (err) {
        console.error('[BOOKINGS] Failed to save modal notes:', err);
        showToast('Server connection failed', true);
      } finally {
        saveModalBtn.disabled = false;
        saveModalBtn.innerHTML = '<i class="bx bx-save"></i> Save Changes';
      }
    });
  }

  // Close modal on background click
  const modal = document.getElementById('booking-detail-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'booking-detail-modal') closeBookingModal();
    });
  }
}

// ================= STORE TIMING & SCHEDULE CONTROL SYSTEM =================
const adminStoreToggleBtn = document.getElementById('admin-store-toggle-btn');
const adminBookingToggleBtn = document.getElementById('admin-booking-toggle-btn');
const manualToggleBtn = document.getElementById('manual-toggle-btn');
const saveScheduleBtn = document.getElementById('save-schedule-btn');

let storeConfig = {
  mode: 'automatic',
  manualState: 'open',
  openTime: '09:00',
  closeTime: '21:00',
  openDays: [1, 2, 3, 4, 5, 6],
  autoBookingWithStore: false,
  isOpen: true,
  bookingOpen: true
};

function formatTime12h(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

async function loadStoreStatus() {
  console.log('[STATUS] Fetching current store configuration from /api/store/status...');
  try {
    let res = await fetch(`${API_BASE}/api/store/status`);
    if (!res.ok) res = await fetch(`${API_BASE}/status`);
    const data = await res.json();
    console.log('[STATUS] Received data:', data);
    
    storeConfig = { ...storeConfig, ...data };
    
    updateStoreDisplay(storeConfig);
    updateBookingDisplay(storeConfig.bookingOpen);
    populateScheduleControls(storeConfig);
  } catch (err) {
    console.error('[STATUS] Fetch failed. Server not connected.', err);
    showToast('Server not connected', true);
  }
}

// Update UI view of store status button & schedule card banner
function updateStoreDisplay(config) {
  const isOpen = config.isOpen;
  if (adminStoreToggleBtn) {
    if (isOpen) {
      adminStoreToggleBtn.textContent = '🟢 Store Open';
      adminStoreToggleBtn.style.backgroundColor = '#2e7d32';
      adminStoreToggleBtn.style.color = '#ffffff';
    } else {
      adminStoreToggleBtn.textContent = '🔴 Store Closed';
      adminStoreToggleBtn.style.backgroundColor = '#c62828';
      adminStoreToggleBtn.style.color = '#ffffff';
    }
  }

  // Update Schedule Card Live Banner
  const liveDesc = document.getElementById('live-status-description');
  const liveBadge = document.getElementById('live-status-badge');
  if (liveDesc && liveBadge) {
    const modeLabel = config.mode === 'automatic' ? 'Automatic Schedule' : 'Manual Override';
    let detailStr = '';
    if (config.mode === 'automatic') {
      detailStr = ` (${formatTime12h(config.openTime)} - ${formatTime12h(config.closeTime)})`;
    }

    if (isOpen) {
      liveDesc.textContent = `Store is currently OPEN via ${modeLabel}${detailStr}`;
      liveBadge.className = 'status-badge-live open';
      liveBadge.innerHTML = '<i class="bx bx-store-alt"></i> Store Open';
    } else {
      liveDesc.textContent = `Store is currently CLOSED via ${modeLabel}${detailStr}`;
      liveBadge.className = 'status-badge-live closed';
      liveBadge.innerHTML = '<i class="bx bx-store-alt"></i> Store Closed';
    }
  }
}

// Update UI view of booking status button
function updateBookingDisplay(isOpen) {
  if (adminBookingToggleBtn) {
    if (isOpen) {
      adminBookingToggleBtn.textContent = '🟢 Booking Open';
      adminBookingToggleBtn.style.backgroundColor = '#2e7d32';
      adminBookingToggleBtn.style.color = '#ffffff';
    } else {
      adminBookingToggleBtn.textContent = '🔴 Booking Closed';
      adminBookingToggleBtn.style.backgroundColor = '#c62828';
      adminBookingToggleBtn.style.color = '#ffffff';
    }
  }
}

// Helper to populate 12-hour AM/PM time dropdown options
function populateTimeDropdowns() {
  const openSelect = document.getElementById('schedule-open-select');
  const closeSelect = document.getElementById('schedule-close-select');
  if (!openSelect || !closeSelect || openSelect.children.length > 0) return;

  const timeOptions = [];
  for (let h = 5; h <= 23; h++) {
    for (let m of [0, 30]) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const val = `${hh}:${mm}`;
      const label = formatTime12h(val);
      timeOptions.push({ val, label });
    }
  }

  const optionsHTML = timeOptions.map(opt => `<option value="${opt.val}">${opt.label}</option>`).join('');

  openSelect.innerHTML = optionsHTML;
  closeSelect.innerHTML = optionsHTML;
}

// Live Timing Preview Card Update
function updateTimingPreview() {
  const openInput = document.getElementById('schedule-open-time');
  const closeInput = document.getElementById('schedule-close-time');
  const openVal = openInput?.value || '09:00';
  const closeVal = closeInput?.value || '21:00';
  
  const openSelect = document.getElementById('schedule-open-select');
  const closeSelect = document.getElementById('schedule-close-select');
  if (openSelect) openSelect.value = openVal;
  if (closeSelect) closeSelect.value = closeVal;

  const previewText = document.getElementById('timing-preview-text');
  const previewDays = document.getElementById('timing-preview-days');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Calculate duration
  let durationStr = '';
  try {
    const [oh, om] = openVal.split(':').map(Number);
    const [ch, cm] = closeVal.split(':').map(Number);
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    let diffMins = closeMins - openMins;
    if (diffMins < 0) diffMins += 24 * 60;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    durationStr = mins > 0 ? ` (${hours}h ${mins}m Daily)` : ` (${hours} Hours Daily)`;
  } catch (e) {
    durationStr = '';
  }

  if (previewText) {
    previewText.textContent = `${formatTime12h(openVal)} – ${formatTime12h(closeVal)}${durationStr}`;
  }

  // Highlight active preset button if matching
  presetBtns.forEach(btn => {
    if (btn.dataset.open === openVal && btn.dataset.close === closeVal) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Selected Days Summary
  const dayNames = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
  const selectedDays = [];
  document.querySelectorAll('.day-pill.selected').forEach(pill => {
    selectedDays.push(parseInt(pill.dataset.day, 10));
  });

  if (previewDays) {
    if (selectedDays.length === 7) {
      previewDays.textContent = 'Operating Days: Every Day (Mon – Sun)';
    } else if (selectedDays.length === 6 && !selectedDays.includes(0)) {
      previewDays.textContent = 'Operating Days: Mon – Sat (Closed Sun)';
    } else if (selectedDays.length === 2 && selectedDays.includes(6) && selectedDays.includes(0)) {
      previewDays.textContent = 'Operating Days: Weekends Only (Sat, Sun)';
    } else if (selectedDays.length > 0) {
      const activeStr = [1, 2, 3, 4, 5, 6, 0].filter(d => selectedDays.includes(d)).map(d => dayNames[d]).join(', ');
      previewDays.textContent = `Operating Days: ${activeStr}`;
    } else {
      previewDays.textContent = 'Operating Days: None Selected (Store Closed)';
    }
  }
}

// Populate input fields in the Schedule Card
function populateScheduleControls(config) {
  populateTimeDropdowns();

  const autoBtn = document.getElementById('mode-btn-auto');
  const manualBtn = document.getElementById('mode-btn-manual');
  const autoFields = document.getElementById('automatic-schedule-fields');
  const manualFields = document.getElementById('manual-schedule-fields');
  const manualNotice = document.getElementById('manual-override-notice');
  const manualStateText = document.getElementById('manual-override-state-text');
  const manualPreservedTiming = document.getElementById('manual-preserved-timing-text');

  if (config.mode === 'automatic') {
    if (autoBtn) autoBtn.classList.add('active');
    if (manualBtn) manualBtn.classList.remove('active');
    if (autoFields) autoFields.style.display = 'block';
    if (manualFields) manualFields.style.display = 'none';
    if (manualNotice) manualNotice.style.display = 'none';
  } else {
    if (manualBtn) manualBtn.classList.add('active');
    if (autoBtn) autoBtn.classList.remove('active');
    // Keep automatic schedule fields visible so configured timing is always visible & preserved
    if (autoFields) autoFields.style.display = 'block';
    if (manualFields) manualFields.style.display = 'block';
    if (manualNotice) {
      manualNotice.style.display = 'flex';
      const isCurrentlyOpen = config.isOpen !== undefined ? config.isOpen : (config.manualState === 'open');
      if (manualStateText) manualStateText.textContent = isCurrentlyOpen ? 'OPEN' : 'CLOSED';
      if (manualPreservedTiming) {
        manualPreservedTiming.textContent = `${formatTime12h(config.openTime || '09:00')} – ${formatTime12h(config.closeTime || '21:00')}`;
      }
    }
    const isCurrentlyOpen = config.isOpen !== undefined ? config.isOpen : (config.manualState === 'open');
    if (manualToggleBtn) {
      manualToggleBtn.innerHTML = isCurrentlyOpen 
        ? '<i class="bx bx-toggle-left"></i> Set Manual State: CLOSED' 
        : '<i class="bx bx-toggle-right"></i> Set Manual State: OPEN';
      manualToggleBtn.style.backgroundColor = isCurrentlyOpen ? '#c62828' : '#2e7d32';
    }
  }

  const openInput = document.getElementById('schedule-open-time');
  const closeInput = document.getElementById('schedule-close-time');
  if (openInput && config.openTime) openInput.value = config.openTime;
  if (closeInput && config.closeTime) closeInput.value = config.closeTime;

  const dayPills = document.querySelectorAll('.day-pill');
  dayPills.forEach(pill => {
    const dayNum = parseInt(pill.dataset.day, 10);
    if (Array.isArray(config.openDays) && config.openDays.includes(dayNum)) {
      pill.classList.add('selected');
    } else {
      pill.classList.remove('selected');
    }
  });

  const bookingSyncCheck = document.getElementById('auto-booking-sync');
  if (bookingSyncCheck) {
    bookingSyncCheck.checked = !!config.autoBookingWithStore;
  }

  updateTimingPreview();
}

// Mode toggle buttons click handlers
const autoModeBtn = document.getElementById('mode-btn-auto');
const manualModeBtn = document.getElementById('mode-btn-manual');

if (autoModeBtn && manualModeBtn) {
  autoModeBtn.addEventListener('click', () => {
    storeConfig.mode = 'automatic';
    populateScheduleControls(storeConfig);
  });

  manualModeBtn.addEventListener('click', () => {
    storeConfig.mode = 'manual';
    populateScheduleControls(storeConfig);
  });
}

// Day pills click toggle handlers
document.querySelectorAll('.day-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    pill.classList.toggle('selected');
    updateTimingPreview();
  });
});

// Event Listeners for 12-Hour Dropdowns & Presets & Shortcuts
document.addEventListener('DOMContentLoaded', () => {
  populateTimeDropdowns();

  const openSelect = document.getElementById('schedule-open-select');
  const closeSelect = document.getElementById('schedule-close-select');
  const openInput = document.getElementById('schedule-open-time');
  const closeInput = document.getElementById('schedule-close-time');

  if (openSelect && openInput) {
    openSelect.addEventListener('change', (e) => {
      openInput.value = e.target.value;
      updateTimingPreview();
    });
    openInput.addEventListener('change', () => updateTimingPreview());
  }

  if (closeSelect && closeInput) {
    closeSelect.addEventListener('change', (e) => {
      closeInput.value = e.target.value;
      updateTimingPreview();
    });
    closeInput.addEventListener('change', () => updateTimingPreview());
  }

  // Quick Presets Click Handlers
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (openInput) openInput.value = btn.dataset.open;
      if (closeInput) closeInput.value = btn.dataset.close;
      updateTimingPreview();
      showToast(`Timing preset set to ${formatTime12h(btn.dataset.open)} – ${formatTime12h(btn.dataset.close)}`);
    });
  });

  // Day Shortcut Buttons
  const btnAll = document.getElementById('btn-days-all');
  const btnWeekdays = document.getElementById('btn-days-weekdays');
  const btnWeekends = document.getElementById('btn-days-weekends');

  if (btnAll) {
    btnAll.addEventListener('click', () => {
      document.querySelectorAll('.day-pill').forEach(pill => pill.classList.add('selected'));
      updateTimingPreview();
    });
  }

  if (btnWeekdays) {
    btnWeekdays.addEventListener('click', () => {
      document.querySelectorAll('.day-pill').forEach(pill => {
        const d = parseInt(pill.dataset.day, 10);
        if (d >= 1 && d <= 6) pill.classList.add('selected');
        else pill.classList.remove('selected');
      });
      updateTimingPreview();
    });
  }

  if (btnWeekends) {
    btnWeekends.addEventListener('click', () => {
      document.querySelectorAll('.day-pill').forEach(pill => {
        const d = parseInt(pill.dataset.day, 10);
        if (d === 6 || d === 0) pill.classList.add('selected');
        else pill.classList.remove('selected');
      });
      updateTimingPreview();
    });
  }
});

// Save Schedule Settings action
if (saveScheduleBtn) {
  saveScheduleBtn.addEventListener('click', async () => {
    console.log('[SCHEDULE] Saving timing settings...');
    
    const selectedDays = [];
    document.querySelectorAll('.day-pill.selected').forEach(pill => {
      selectedDays.push(parseInt(pill.dataset.day, 10));
    });

    const openTimeVal = document.getElementById('schedule-open-time')?.value || '09:00';
    const closeTimeVal = document.getElementById('schedule-close-time')?.value || '21:00';
    const autoSyncVal = document.getElementById('auto-booking-sync')?.checked || false;

    const payload = {
      mode: storeConfig.mode,
      manualState: storeConfig.manualState || 'open',
      openTime: openTimeVal,
      closeTime: closeTimeVal,
      openDays: selectedDays,
      autoBookingWithStore: autoSyncVal
    };

    saveScheduleBtn.disabled = true;
    saveScheduleBtn.textContent = 'Saving Settings...';

    try {
      const res = await fetch(`${API_BASE}/api/store/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (handleFetchError(res)) return;

      const data = await res.json();
      if (res.ok && data.success) {
        storeConfig = { ...storeConfig, ...data.status };
        updateStoreDisplay(storeConfig);
        updateBookingDisplay(storeConfig.bookingOpen);
        showToast('Store timing and schedule saved successfully!');
      } else {
        showToast(data.message || 'Failed to save timing settings', true);
      }
    } catch (err) {
      console.error('[SCHEDULE] Failed to save settings:', err);
      showToast('Server not connected', true);
    } finally {
      saveScheduleBtn.disabled = false;
      saveScheduleBtn.innerHTML = '<i class="bx bx-save"></i> Save Timing & Schedule Settings';
    }
  });
}

// Manual Toggle helper
async function triggerStoreToggle() {
  console.log('[STATUS] Toggling store status...');
  try {
    const res = await fetch(`${API_BASE}/api/store/toggle-store`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    if (handleFetchError(res)) return;
    
    const data = await res.json();
    storeConfig = { ...storeConfig, ...data };
    updateStoreDisplay(storeConfig);
    populateScheduleControls(storeConfig);

    const timingStr = `${formatTime12h(storeConfig.openTime)} – ${formatTime12h(storeConfig.closeTime)}`;
    if (storeConfig.mode === 'automatic') {
      showToast(`Store ${storeConfig.isOpen ? 'OPEN' : 'CLOSED'} — Using set timing schedule (${timingStr})`);
    } else {
      if (storeConfig.isOpen) {
        showToast(`Store manually OPEN (Manual override active)`);
      } else {
        showToast(`Store manually CLOSED (Manual override active. Schedule ${timingStr} preserved)`);
      }
    }
  } catch (err) {
    console.error('[STATUS] Store toggle request failed:', err);
    showToast('Server not connected', true);
  }
}

if (adminStoreToggleBtn) {
  adminStoreToggleBtn.addEventListener('click', triggerStoreToggle);
}

if (manualToggleBtn) {
  manualToggleBtn.addEventListener('click', triggerStoreToggle);
}

// Booking toggle click listener
if (adminBookingToggleBtn) {
  adminBookingToggleBtn.addEventListener('click', async () => {
    console.log('[STATUS] Toggling booking status...');
    try {
      const res = await fetch(`${API_BASE}/api/store/toggle-booking`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (handleFetchError(res)) return;
      
      const data = await res.json();
      storeConfig.bookingOpen = data.bookingOpen;
      updateBookingDisplay(storeConfig.bookingOpen);
      showToast(`Booking status updated: ${storeConfig.bookingOpen ? 'Open' : 'Closed'}`);
    } catch (err) {
      console.error('[STATUS] Booking toggle request failed:', err);
      showToast('Server not connected', true);
    }
  });
}

// ================= DRAG AND DROP HANDLERS =================
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileNameSpan = document.getElementById('file-name');

if (dropZone && fileInput) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelect(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });
}

function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select image files only!', true);
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.style.display = 'none';
    return;
  }
  if (fileNameSpan) fileNameSpan.textContent = file.name + ` (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  if (filePreview) filePreview.style.display = 'block';
}

// ================= IMAGE CATALOG MANAGEMENT =================
const catalogGrid = document.getElementById('catalog-grid');

async function loadCatalog() {
  if (!catalogGrid) return;
  console.log('[CATALOG] Loading catalog images from /api/gallery...');
  try {
    let res = await fetch(`${API_BASE}/api/gallery`);
    if (!res.ok) res = await fetch(`${API_BASE}/images`);

    const images = await res.json();
    console.log(`[CATALOG] Received ${images.length} images.`);
    
    if (images.length === 0) {
      catalogGrid.innerHTML = '<div class="no-images">No photos uploaded to the studio gallery yet.</div>';
      return;
    }
    
    catalogGrid.innerHTML = images.map(img => {
      const currentCat = img.cat || img.category || 'all';
      const imgId = img._id || img.id;
      const rawImg = img.img || img.imageUrl || '';
      return `
        <div class="preview-item" id="gallery-card-${imgId}">
          <img src="${(rawImg.startsWith('http') || rawImg.startsWith('data:')) ? rawImg : `${API_BASE}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`}" alt="${escapeHtml(img.title)}">
          <div class="preview-info">
            <div class="img-title" title="${escapeHtml(img.title)}">${escapeHtml(img.title)}</div>
            
            <select class="edit-cat-select" onchange="editCategory('${imgId}', this.value)">
              <option value="all" ${currentCat === 'all' ? 'selected' : ''}>All (General)</option>
              <option value="bridal" ${currentCat === 'bridal' ? 'selected' : ''}>Bridal</option>
              <option value="engagement" ${currentCat === 'engagement' ? 'selected' : ''}>Engagement</option>
              <option value="hair" ${currentCat === 'hair' ? 'selected' : ''}>Hair & Draping</option>
              <option value="party" ${currentCat === 'party' ? 'selected' : ''}>Party</option>
            </select>
            
            <div class="img-meta">
              <span class="tag" id="tag-${imgId}">${currentCat}</span>
              <button class="btn-delete" onclick="deleteImage('${imgId}')" title="Delete image">
                <i class="bx bx-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('[CATALOG] Failed to load image catalog. Server not connected.', err);
    catalogGrid.innerHTML = '<div class="no-images">Error loading image catalog. Server not connected.</div>';
    showToast('Server not connected', true);
  }
}

// Inline edit category
async function editCategory(id, newCategory) {
  try {
    const res = await fetch(`${API_BASE}/api/gallery/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ category: newCategory })
    });
    
    if (handleFetchError(res)) return;
    const data = await res.json();
    if (data.success) {
      showToast(`Category updated to "${newCategory}"`);
      const tag = document.getElementById(`tag-${id}`);
      if (tag) tag.textContent = newCategory;
    } else {
      showToast('Failed to update category', true);
    }
  } catch (err) {
    console.error('[CATALOG-EDIT] Update failed:', err);
    showToast('Server not connected', true);
  }
}

// Delete photo action
async function deleteImage(id) {
  if (!confirm('Are you sure you want to delete this photo from the gallery?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/gallery/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (handleFetchError(res)) return;
    const result = await res.json();
    if (res.ok && result.success) {
      const card = document.getElementById(`gallery-card-${id}`);
      if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 300);
      }
      showToast(result.message || 'Photo deleted successfully');
      loadCatalog();
    } else {
      showToast(result.message || 'Error deleting photo', true);
    }
  } catch (err) {
    console.error('[CATALOG-DELETE] Request failed:', err);
    showToast('Server not connected', true);
  }
}

// Upload photo form handler
const uploadForm = document.getElementById('upload-form');
if (uploadForm) {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (fileInput.files.length === 0) {
      showToast('Please select or drag an image first!', true);
      return;
    }
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('title', document.getElementById('title').value);
    formData.append('category', document.getElementById('category').value);

    try {
      const res = await fetch(`${API_BASE}/api/gallery`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      
      if (handleFetchError(res)) return;
      const result = await res.json();

      if (res.ok && result.success) {
        showToast(result.message || 'Photo uploaded successfully to the gallery!');
        uploadForm.reset();
        if (filePreview) filePreview.style.display = 'none';
        loadCatalog();
      } else {
        showToast(result.message || 'Gallery upload failed: Database connection unavailable.', true);
      }
    } catch (err) {
      console.error('[UPLOAD] Connection error during fetch:', err);
      showToast('Gallery upload failed: Database connection unavailable.', true);
    }
  });
}

// Initialize Dashboard states
console.log('[INIT] Loading initial dashboard data...');
window.editCategory = editCategory;
window.deleteImage = deleteImage;
window.openBookingModal = openBookingModal;
window.updateBookingStatusDirect = updateBookingStatusDirect;
window.deleteBookingDirect = deleteBookingDirect;

loadStoreStatus();
loadBookingStats();
loadBookingsList();
initBookingControls();
loadCatalog();
}
