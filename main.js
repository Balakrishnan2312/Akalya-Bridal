const API_BASE = (window.location.port !== '5000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'))
  ? 'http://localhost:5000'
  : '';

// Add fade-in CSS animations dynamically to the page head
const styleToken = document.createElement('style');
styleToken.textContent = `
  @keyframes galleryFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .gallery-item {
    opacity: 0;
    animation: galleryFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  /* Disabled button styling for closed bookings */
  .btn-gold.disabled-action {
    background: #cccccc !important;
    color: #888888 !important;
    border-color: #bbbbbb !important;
    pointer-events: none !important;
    box-shadow: none !important;
    cursor: not-allowed !important;
  }
`;
document.head.appendChild(styleToken);

let allGalleryImages = [];

// ================= RENDER DYNAMIC GALLERY =================
async function fetchAndRenderGallery(activeFilter = 'all') {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  console.log('[GALLERY] Fetching gallery list from /api/gallery...');

  try {
    const res = await fetch(`${API_BASE}/api/gallery`);
    if (res.ok) {
      allGalleryImages = await res.json();
    } else {
      const fallbackRes = await fetch(`${API_BASE}/images`);
      allGalleryImages = await fallbackRes.json();
    }
    console.log(`[GALLERY] Successfully loaded ${allGalleryImages.length} images.`);
    renderFilteredGrid(activeFilter);
  } catch (err) {
    console.error('[GALLERY] Error loading gallery:', err);
    grid.innerHTML = '<div class="w-full text-center py-12 text-gray-500 italic">Error loading studio gallery photos.</div>';
  }
}

function renderFilteredGrid(filter = 'all') {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  const items = filter === 'all' ? allGalleryImages : allGalleryImages.filter(img => (img.cat === filter || img.category === filter));

  if (items.length === 0) {
    grid.innerHTML = '<div class="w-full text-center py-16 text-gray-500 font-medium text-lg">No photos yet</div>';
    return;
  }

  grid.innerHTML = items.map((g, index) => {
    const rawImg = g.img || g.imageUrl || '';
    const resolvedImg = (rawImg.startsWith('http') || rawImg.startsWith('data:')) ? rawImg : `${API_BASE}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
    const fullImg = resolvedImg.includes('unsplash.com') ? resolvedImg.replace('w=900', 'w=1600') : resolvedImg;
    const animationDelay = `${(index % 8) * 0.08}s`;
    
    return `
      <div class="gallery-item cursor-pointer" data-full="${fullImg}" style="animation-delay: ${animationDelay};">
        <img src="${resolvedImg}" alt="${g.title}" class="w-full h-full object-cover transition-all duration-500" loading="lazy"
             onerror="this.closest('.gallery-item').style.background='linear-gradient(135deg,#D8B98A,#C89B6D)'; this.remove();">
        <div class="gallery-overlay">
          <p class="text-white text-sm font-medium">${g.title}</p>
        </div>
      </div>`;
  }).join('');

  attachLightboxEvents();
}

function attachLightboxEvents() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.querySelector('#lightbox img');
      if (lightbox && lightboxImg) {
        lightboxImg.src = item.dataset.full;
        lightbox.classList.add('open');
      }
    });
  });
}

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

// ================= STORE & BOOKING STATUS MANAGER =================
async function enforceStoreStatus() {
  console.log('[STATUS] Fetching store and booking status from /api/store/status...');
  try {
    let res = await fetch(`${API_BASE}/api/store/status`);
    if (!res.ok) {
      res = await fetch(`${API_BASE}/status`);
    }
    const data = await res.json();
    console.log('[STATUS] Received:', data);
    
    handleUIForStoreStatus(data);
    handleUIForBookingStatus(data.bookingOpen);
  } catch (err) {
    console.error('[STATUS] Connection failed:', err);
    const topStatus = document.getElementById('top-store-status');
    if (topStatus) {
      topStatus.innerHTML = '<span style="color: #c62828; font-weight: 600;">⚠️ Server Offline</span>';
    }
  }
}

// Handles the Store Status badge (top left/navbar)
function handleUIForStoreStatus(statusData) {
  const topStatus = document.getElementById('top-store-status');
  if (!topStatus) return;

  const storeIsOpen = typeof statusData === 'object' ? statusData.isOpen : statusData;

  if (storeIsOpen) {
    topStatus.textContent = `🟢 Store Open`;
    topStatus.style.borderColor = 'rgba(46, 125, 50, 0.35)';
    topStatus.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
    topStatus.style.color = '#1b5e20';
    topStatus.style.backdropFilter = 'blur(18px)';
    topStatus.style.webkitBackdropFilter = 'blur(18px)';
    topStatus.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.08)';
  } else {
    topStatus.textContent = `🔴 Store Closed`;
    topStatus.style.borderColor = 'rgba(198, 40, 40, 0.35)';
    topStatus.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
    topStatus.style.color = '#b71c1c';
    topStatus.style.backdropFilter = 'blur(18px)';
    topStatus.style.webkitBackdropFilter = 'blur(18px)';
    topStatus.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.08)';
  }
}

// Handles the Booking Form state and badge container
function handleUIForBookingStatus(bookingIsOpen) {
  const badgeContainer = document.getElementById('booking-badge-container');
  const submitBtn = document.getElementById('booking-submit-btn');
  const bookingForm = document.getElementById('booking-form');

  // 1. Show appropriate open/closed badge on the form
  if (badgeContainer) {
    if (bookingIsOpen) {
      badgeContainer.innerHTML = `<span class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider select-none shadow-sm transition-all duration-300">Bookings Open</span>`;
    } else {
      badgeContainer.innerHTML = `<span class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider select-none shadow-sm transition-all duration-300">Currently Closed</span>`;
    }
  }

  // 2. Submit Button state
  if (submitBtn) {
    if (bookingIsOpen) {
      submitBtn.textContent = 'Request Appointment';
      submitBtn.removeAttribute('disabled');
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      submitBtn.style.pointerEvents = 'auto';
    } else {
      submitBtn.textContent = 'Bookings Closed';
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
      submitBtn.style.pointerEvents = 'none';
    }
  }

  // 3. Enable or disable input controls inside the form
  if (bookingForm) {
    const inputs = bookingForm.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!bookingIsOpen) {
        input.setAttribute('disabled', 'true');
        input.style.opacity = '0.5';
        input.style.cursor = 'not-allowed';
      } else {
        input.removeAttribute('disabled');
        input.style.opacity = '1';
        input.style.cursor = 'auto';
      }
    });
  }

  // 4. Handle navigation links to booking page
  document.querySelectorAll('a[href="#booking"], a[href="index.html#booking"]').forEach(btn => {
    if (btn.id === 'booking-submit-btn') return;
    
    if (!bookingIsOpen) {
      btn.classList.add('disabled-action');
      if (!btn.hasAttribute('data-original-html')) {
        btn.setAttribute('data-original-html', btn.innerHTML);
      }
      btn.innerHTML = 'Bookings Closed';
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.6';
    } else {
      btn.classList.remove('disabled-action');
      if (btn.hasAttribute('data-original-html')) {
        btn.innerHTML = btn.getAttribute('data-original-html');
      }
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    }
  });
}

// ================= BOOKING FORM INTEGRATION =================
function setupBookingFormHandler() {
  const bookingForm = document.getElementById('booking-form');
  if (!bookingForm) return;

  const submitBtn = document.getElementById('booking-submit-btn');
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const bDate = document.getElementById('b-date');

  if (bDate) {
    bDate.min = new Date().toISOString().split('T')[0];
  }

  // Clear error highlight on field input
  const requiredFields = ['b-name', 'b-phone', 'b-date', 'b-service'];
  requiredFields.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.addEventListener('input', function () {
        const fieldContainer = this.closest('.form-field');
        if (fieldContainer) fieldContainer.classList.remove('error');
      });
    }
  });

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset error states
    document.querySelectorAll('.form-field').forEach(field => field.classList.remove('error'));
    if (errorEl) errorEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');

    const name = document.getElementById('b-name')?.value.trim() || '';
    const phone = document.getElementById('b-phone')?.value.trim() || '';
    const email = document.getElementById('b-email')?.value.trim() || '';
    const date = document.getElementById('b-date')?.value || '';
    const service = document.getElementById('b-service')?.value || '';
    const message = document.getElementById('b-message')?.value.trim() || '';

    let isValid = true;
    if (!name) {
      document.getElementById('b-name')?.closest('.form-field')?.classList.add('error');
      isValid = false;
    }
    if (!phone || !/^\d{10}$/.test(phone.replace(/[^0-9]/g, ''))) {
      document.getElementById('b-phone')?.closest('.form-field')?.classList.add('error');
      isValid = false;
    }
    if (!date) {
      document.getElementById('b-date')?.closest('.form-field')?.classList.add('error');
      isValid = false;
    }
    if (!service) {
      document.getElementById('b-service')?.closest('.form-field')?.classList.add('error');
      isValid = false;
    }

    if (!isValid) {
      if (errorEl) {
        errorEl.textContent = '⚠️ Please fill in all required fields accurately.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Request...';
    }

    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          phone: phone,
          email: email,
          eventDate: date,
          service: service,
          message: message
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (successEl) {
          successEl.textContent = '✓ Appointment request submitted successfully. We will contact you shortly.';
          successEl.classList.remove('hidden');
        }
        bookingForm.reset();

        const dateParts = date.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : date;
        const waMsg = `NEW APPOINTMENT REQUEST\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email || 'Not provided'}\nEvent Date: ${formattedDate}\nService: ${service}\nEvent Details: ${message || 'None'}\n\nPlease confirm availability.`;
        const waUrl = `https://wa.me/919360728730?text=${encodeURIComponent(waMsg)}`;
        setTimeout(() => window.open(waUrl, '_blank'), 800);
      } else {
        if (errorEl) {
          errorEl.textContent = `⚠️ ${data.message || 'Error submitting booking.'}`;
          errorEl.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.error('[BOOKING] Submit error:', err);
      if (successEl) {
        successEl.textContent = '✓ Opening WhatsApp with your appointment request...';
        successEl.classList.remove('hidden');
      }
      const dateParts = date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : date;
      const waMsg = `NEW APPOINTMENT REQUEST\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email || 'Not provided'}\nEvent Date: ${formattedDate}\nService: ${service}\nEvent Details: ${message || 'None'}`;
      const waUrl = `https://wa.me/919360728730?text=${encodeURIComponent(waMsg)}`;
      setTimeout(() => {
        window.open(waUrl, '_blank');
        bookingForm.reset();
      }, 500);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Appointment';
      }
    }
  });
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Load status and poll every 8 seconds
  enforceStoreStatus();
  setInterval(enforceStoreStatus, 8000);

  // Initialize Gallery Grid
  fetchAndRenderGallery();

  // Bind Booking Form Submission Handler
  setupBookingFormHandler();

  // Bind category button filters
  document.querySelectorAll('.gallery-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      renderFilteredGrid(filter);
    });
  });

  // Lightbox close events
  const lightboxClose = document.getElementById('lightbox-close');
  if (lightboxClose) {
    lightboxClose.addEventListener('click', () => {
      const lightbox = document.getElementById('lightbox');
      if (lightbox) lightbox.classList.remove('open');
    });
  }

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') lightbox.classList.remove('open');
    });
  }
});
