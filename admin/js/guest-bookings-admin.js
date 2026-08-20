// =========================================================
// Admin Guest Bookings — approve/cancel one-time guest bookings
//
// IMPORTANT: A guest booking's amount only counts toward income
// once status = 'approved' (approved_at is set at that moment).
// income-admin.js reads guest_bookings where status = 'approved'.
// =========================================================

let currentGuestFilter = 'pending';

async function initGuestBookings() {
  const adminUser = await requireAdmin();
  if (!adminUser) return;

  initAdminShell('guest-bookings.html', adminUser);

  document.querySelectorAll('#statusFilters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#statusFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentGuestFilter = chip.dataset.filter;
      loadGuestBookings();
    });
  });

  await loadGuestBookings();
  document.getElementById('pageLoading').style.display = 'none';
  document.getElementById('pageContent').style.display = 'block';
}

function formatINRAmount(amount) {
  const n = Math.round(Number(amount) || 0);
  return '₹' + n.toLocaleString('en-IN');
}

async function loadGuestBookings() {
  let query = supabaseClient.from('guest_bookings').select('*');

  if (currentGuestFilter !== 'all') {
    query = query.eq('status', currentGuestFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  renderGuestBookingsTable(data || [], error);
}

function guestStatusBadge(status) {
  const map = {
    pending:   { cls: 'badge-pending',   label: 'Pending' },
    approved:  { cls: 'badge-completed', label: 'Approved' },
    cancelled: { cls: 'badge-cancelled', label: 'Cancelled' },
  };
  const { cls, label } = map[status] || map.pending;
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderGuestBookingsTable(data, error) {
  const tbody = document.getElementById('guestBookingsBody');
  const emptyEl = document.getElementById('guestBookingsEmpty');
  const tableEl = document.getElementById('guestBookingsTable');

  if (error || !data || data.length === 0) {
    tableEl.style.display = 'none';
    emptyEl.style.display = 'block';
    if (error) console.error('Failed to load guest bookings:', error);
    return;
  }

  tableEl.style.display = 'table';
  emptyEl.style.display = 'none';

  tbody.innerHTML = data.map(b => `
    <tr>
      <td>${b.customer_name || '—'}</td>
      <td>${b.phone || '—'}</td>
      <td>${b.vehicle_type ? (b.vehicle_type + (b.vehicle_model ? ' · ' + b.vehicle_model : '')) : '—'}</td>
      <td>${b.service || '—'}</td>
      <td>${formatDate(b.requested_date)}</td>
      <td>${b.requested_time || '—'}</td>
      <td class="income-amount-cell">${formatINRAmount(b.amount)}</td>
      <td>${guestStatusBadge(b.status)}</td>
      <td>${renderGuestActions(b)}</td>
    </tr>
  `).join('');

  wireUpGuestActions();
}

function renderGuestActions(b) {
  if (b.status === 'pending') {
    return `
      <div class="btn-row">
        <button class="btn btn-success btn-sm" data-approve="${b.id}">Approve</button>
        <button class="btn btn-danger btn-sm" data-guest-cancel="${b.id}">Cancel</button>
      </div>`;
  }
  return '—';
}

function wireUpGuestActions() {
  document.querySelectorAll('[data-approve]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Approve this booking? The amount will be added to income.')) {
        updateGuestBookingStatus(btn.dataset.approve, 'approved', btn);
      }
    });
  });
  document.querySelectorAll('[data-guest-cancel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const note = prompt('Optional: add a reason.', '');
      if (note === null) return;
      updateGuestBookingStatus(btn.dataset.guestCancel, 'cancelled', btn, note);
    });
  });
}

async function updateGuestBookingStatus(id, newStatus, btnEl, note) {
  btnEl.disabled = true;

  const updatePayload = { status: newStatus };
  if (newStatus === 'approved') updatePayload.approved_at = new Date().toISOString();
  if (note) updatePayload.admin_note = note;

  const { error } = await supabaseClient
    .from('guest_bookings')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    showToast('Failed to update booking: ' + error.message, 'error');
    btnEl.disabled = false;
    return;
  }

  const messages = {
    approved: 'Booking approved — added to income.',
    cancelled: 'Booking cancelled.',
  };
  showToast(messages[newStatus] || 'Booking updated.');

  await loadGuestBookings();
}

document.addEventListener('DOMContentLoaded', initGuestBookings);
