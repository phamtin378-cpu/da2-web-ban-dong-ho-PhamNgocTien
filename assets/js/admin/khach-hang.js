// Khách hàng: xem danh sách, chi tiết, lịch sử mua; admin được khóa/mở khóa tài khoản.
(function () {
  if (!Admin.init('customers', 'Khách hàng')) return;
  const fp = Utils.formatPrice;
  const PER = 12;
  const canLock = Admin.can('customer.lock');
  const state = { q: '', status: '', sort: 'spent', page: 1 };

  $('#adminContent').innerHTML = `
    ${canLock ? '' : '<div class="alert alert-light border small"><i class="bi bi-eye me-1"></i>Quyền Nhân viên: chỉ xem thông tin khách hàng.</div>'}
    <div class="panel">
      <div class="filter-bar">
        <div class="position-relative flex-grow-1" style="min-width:220px"><i class="bi bi-search fb-icon"></i>
          <input type="search" class="form-control ps-5" id="fQ" placeholder="Tên, email, số điện thoại…" aria-label="Tìm khách hàng"></div>
        <select class="form-select" id="fStatus" style="max-width:170px" aria-label="Trạng thái"><option value="">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="locked">Đã khóa</option></select>
        <select class="form-select" id="fSort" style="max-width:190px" aria-label="Sắp xếp"><option value="spent">Chi tiêu cao nhất</option><option value="orders">Nhiều đơn nhất</option><option value="newest">Mới đăng ký</option></select>
        <button class="btn btn-outline-dark" id="exportBtn"><i class="bi bi-download me-1"></i>Xuất CSV</button>
      </div>
      <div class="table-responsive"><table class="table admin-table align-middle">
        <thead><tr><th>Khách hàng</th><th>Liên hệ</th><th class="text-center">Đơn hàng</th><th class="text-end">Đã chi tiêu</th><th>Ngày đăng ký</th><th>Trạng thái</th><th></th></tr></thead><tbody id="tbody"></tbody></table></div>
      <div id="pager"></div>
    </div>`;
  $('#adminModals').innerHTML = `
    <div class="modal fade" id="cuModal" tabindex="-1" aria-labelledby="cuTitle" aria-hidden="true"><div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title" id="cuTitle"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
      <div class="modal-body" id="cuBody"></div>
    </div></div></div>`;

  function stats(u) {
    const orders = Orders.byUser(u.id);
    return { orders, count: orders.length, spent: orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0) };
  }
  function list() {
    const q = Utils.normalize(state.q);
    return DB.all('users').filter(u => u.role === 'customer' && (!state.status || u.status === state.status) &&
      (!q || Utils.normalize(`${u.name} ${u.email} ${u.phone}`).includes(q)))
      .map(u => Object.assign({ u }, stats(u)))
      .sort(state.sort === 'orders' ? (a, b) => b.count - a.count : state.sort === 'newest' ? (a, b) => b.u.createdAt.localeCompare(a.u.createdAt) : (a, b) => b.spent - a.spent);
  }
  function render() {
    const p = Admin.paginate(list(), state.page, PER);
    state.page = p.page;
    $('#tbody').innerHTML = p.rows.map(({ u, count, spent }) => `<tr class="${u.status === 'locked' ? 'row-muted' : ''}">
      <td><div class="d-flex align-items-center gap-2"><span class="avatar-sm">${Utils.escape(u.name.trim().split(' ').pop()[0])}</span><span class="fw-medium">${Utils.escape(u.name)}</span></div></td>
      <td class="small">${Utils.escape(u.email)}<br>${u.phone}</td><td class="text-center">${count}</td><td class="text-end fw-semibold">${fp(spent)}</td>
      <td class="small">${Utils.formatDate(u.createdAt)}</td>
      <td><span class="badge ${u.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'}">${u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</span></td>
      <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-dark js-view" data-id="${u.id}">Chi tiết</button>
        ${canLock ? `<button class="btn btn-sm ${u.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'} js-lock" data-id="${u.id}">${u.status === 'active' ? 'Khóa' : 'Mở khóa'}</button>` : ''}</td></tr>`).join('') ||
      '<tr><td colspan="7" class="text-center text-muted py-5">Không có khách hàng phù hợp.</td></tr>';
    $('#pager').innerHTML = Admin.pagerInfo(p, PER);
  }
  function view(id) {
    const u = DB.find('users', id);
    const s = stats(u);
    const reviews = DB.all('reviews').filter(r => r.userId === u.id).length;
    $('#cuTitle').textContent = u.name;
    $('#cuBody').innerHTML = `
      <div class="row g-3 mb-3">
        ${[['Đơn hàng', s.count], ['Đã chi tiêu', fp(s.spent)], ['Đánh giá', reviews], ['Mã đã lưu', (u.savedCoupons || []).length]].map(([l, v]) =>
          `<div class="col-6 col-md-3"><div class="stat-tile"><div class="small text-muted">${l}</div><div class="stat-value fs-5">${v}</div></div></div>`).join('')}
      </div>
      <div class="row g-3">
        <div class="col-md-6"><div class="info-box"><div class="ib-title">Thông tin</div>
          <div>${Utils.escape(u.email)}</div><div>${u.phone}</div>
          <div class="small text-muted">Đăng ký ${Utils.formatDate(u.createdAt)}${u.birthday ? ' · sinh ' + Utils.formatDate(u.birthday) : ''}${u.gender ? ' · ' + u.gender : ''}</div></div></div>
        <div class="col-md-6"><div class="info-box"><div class="ib-title">Sổ địa chỉ</div>
          ${(u.addresses || []).map(a => `<div class="small mb-1">${a.isDefault ? '<span class="badge text-bg-dark me-1">Mặc định</span>' : ''}${Utils.escape(Address.format(a))}</div>`).join('') || '<div class="small text-muted">Chưa có</div>'}</div></div>
      </div>
      <div class="ib-title mt-3">Đơn hàng gần đây</div>
      <table class="table admin-table align-middle"><tbody>${s.orders.slice(0, 8).map(o => `<tr><td><a href="don-hang.html?id=${o.id}">${o.id}</a></td>
        <td class="small">${Utils.formatDate(o.createdAt)}</td><td class="text-end">${fp(o.total)}</td><td>${Orders.badge(o.status)}</td></tr>`).join('') || '<tr><td class="text-muted">Chưa có đơn hàng.</td></tr>'}</tbody></table>`;
    Admin.modal('cuModal').modal.show();
  }

  $('#fQ').addEventListener('input', Utils.debounce(e => { state.q = e.target.value.trim(); state.page = 1; render(); }, 250));
  $('#fStatus').addEventListener('change', e => { state.status = e.target.value; state.page = 1; render(); });
  $('#fSort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('#pager').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.closest('.disabled')) { state.page = +b.dataset.page; render(); } });
  $('#tbody').addEventListener('click', async e => {
    const v = e.target.closest('.js-view');
    if (v) { view(v.dataset.id); return; }
    const l = e.target.closest('.js-lock');
    if (l && canLock) {
      const u = DB.find('users', l.dataset.id);
      const lock = u.status === 'active';
      if (!await Utils.confirm(`${lock ? 'Khóa' : 'Mở khóa'} tài khoản ${u.name}?`, lock ? 'Khách sẽ không thể đăng nhập và đặt hàng.' : '', lock ? 'Khóa' : 'Mở khóa')) return;
      DB.update('users', u.id, { status: lock ? 'locked' : 'active' });
      Utils.toast(lock ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.', 'info');
      render();
    }
  });
  $('#exportBtn').addEventListener('click', () => Admin.exportCsv('khach-hang.csv', ['Họ tên', 'Email', 'SĐT', 'Số đơn', 'Đã chi tiêu', 'Ngày đăng ký', 'Trạng thái'],
    list().map(({ u, count, spent }) => [u.name, u.email, u.phone, count, spent, Utils.formatDate(u.createdAt), u.status])));
  render();
})();
