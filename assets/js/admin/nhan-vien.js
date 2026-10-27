// Quản lý nhân viên (chỉ admin): thêm, sửa, phân quyền, khóa, đặt lại mật khẩu.
(function () {
  if (!Admin.init('staff', 'Nhân viên')) return;
  const me = Admin.user();
  let editing = null;

  $('#adminContent').innerHTML = `
    <div class="panel">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div class="small text-muted">Phân quyền: <strong>Admin</strong> toàn quyền · <strong>Nhân viên</strong> xử lý đơn, sản phẩm, bài viết, đánh giá, liên hệ; chỉ xem khuyến mãi & khách hàng.</div>
        <button class="btn btn-dark" id="addBtn"><i class="bi bi-plus-lg me-1"></i>Thêm nhân viên</button>
      </div>
      <div class="table-responsive"><table class="table admin-table align-middle">
        <thead><tr><th>Nhân viên</th><th>Liên hệ</th><th>Vai trò</th><th class="text-center">Đơn đã xử lý</th><th>Trạng thái</th><th></th></tr></thead><tbody id="tbody"></tbody></table></div>
    </div>`;
  $('#adminModals').innerHTML = `
    <div class="modal fade" id="stModal" tabindex="-1" aria-labelledby="stTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <form id="stForm" novalidate class="d-contents">
        <div class="modal-header"><h5 class="modal-title" id="stTitle"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
        <div class="modal-body"><div class="row g-3">
          <div class="col-12"><label class="form-label" for="sName">Họ tên *</label><input class="form-control" id="sName" maxlength="60"></div>
          <div class="col-md-6"><label class="form-label" for="sEmail">Email đăng nhập *</label><input type="email" class="form-control" id="sEmail"></div>
          <div class="col-md-6"><label class="form-label" for="sPhone">Số điện thoại *</label><input type="tel" class="form-control" id="sPhone"></div>
          <div class="col-md-6"><label class="form-label" for="sRole">Vai trò</label><select class="form-select" id="sRole"><option value="staff">Nhân viên</option><option value="admin">Quản trị viên</option></select></div>
          <div class="col-md-6"><label class="form-label" for="sPass">Mật khẩu <span class="small text-muted" id="sPassHint">*</span></label><input type="text" class="form-control" id="sPass" autocomplete="new-password"></div>
        </div></div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Hủy</button><button class="btn btn-dark" type="submit">Lưu</button></div>
      </form></div></div></div>`;

  const handled = id => DB.all('orders').filter(o => o.history.some(h => h.by === id && h.status !== 'pending')).length;
  const admins = () => DB.all('users').filter(u => u.role === 'admin' && u.status === 'active');

  function render() {
    const list = DB.all('users').filter(u => u.role !== 'customer').sort((a, b) => (a.role === 'admin' ? 0 : 1) - (b.role === 'admin' ? 0 : 1) || a.name.localeCompare(b.name));
    $('#tbody').innerHTML = list.map(u => `<tr class="${u.status === 'locked' ? 'row-muted' : ''}">
      <td><div class="d-flex align-items-center gap-2"><span class="avatar-sm">${Utils.escape(u.name.trim().split(' ').pop()[0])}</span>
        <div><div class="fw-medium">${Utils.escape(u.name)}${u.id === me.id ? ' <span class="badge text-bg-light border">Bạn</span>' : ''}</div><div class="small text-muted">Từ ${Utils.formatDate(u.createdAt)}</div></div></div></td>
      <td class="small">${Utils.escape(u.email)}<br>${u.phone}</td>
      <td><span class="badge ${u.role === 'admin' ? 'text-bg-dark' : 'text-bg-light border'}">${Auth.ROLES[u.role]}</span></td>
      <td class="text-center">${handled(u.id)}</td>
      <td><span class="badge ${u.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'}">${u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</span></td>
      <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-dark js-edit" data-id="${u.id}">Sửa</button>
        <button class="btn btn-sm btn-light js-reset" data-id="${u.id}" title="Đặt lại mật khẩu"><i class="bi bi-key"></i></button>
        ${u.id !== me.id ? `<button class="btn btn-sm ${u.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'} js-lock" data-id="${u.id}">${u.status === 'active' ? 'Khóa' : 'Mở'}</button>` : ''}</td></tr>`).join('');
  }
  function openForm(u) {
    editing = u ? u.id : null;
    $('#stTitle').textContent = u ? 'Sửa nhân viên' : 'Thêm nhân viên';
    $('#sName').value = u ? u.name : '';
    $('#sEmail').value = u ? u.email : '';
    $('#sPhone').value = u ? u.phone : '';
    $('#sRole').value = u ? u.role : 'staff';
    $('#sRole').disabled = !!u && u.id === me.id;
    $('#sPass').value = '';
    $('#sPassHint').textContent = u ? '(bỏ trống nếu không đổi)' : '*';
    Utils.clearInvalid($('#stForm'));
    Admin.modal('stModal').modal.show();
  }
  $('#stForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    const users = DB.all('users').filter(x => x.id !== editing);
    const name = $('#sName').value.trim(), email = $('#sEmail').value.trim(), phone = $('#sPhone').value.trim(), pass = $('#sPass').value, role = $('#sRole').value;
    let ok = true;
    const fail = (id, m) => { Utils.setInvalid($('#' + id), m); ok = false; };
    if (name.length < 2) fail('sName', 'Nhập họ tên.');
    if (!Utils.isEmail(email)) fail('sEmail', 'Email không hợp lệ.');
    else if (users.some(x => x.email.toLowerCase() === email.toLowerCase())) fail('sEmail', 'Email đã được sử dụng.');
    if (!Utils.isPhone(phone)) fail('sPhone', 'SĐT gồm 10 số, bắt đầu bằng 0.');
    else if (users.some(x => x.phone === phone)) fail('sPhone', 'SĐT đã được sử dụng.');
    if ((!editing || pass) && pass.length < 6) fail('sPass', 'Mật khẩu tối thiểu 6 ký tự.');
    // Luôn giữ ít nhất 1 admin đang hoạt động
    if (editing && role === 'staff' && DB.find('users', editing).role === 'admin' && admins().length <= 1) fail('sRole', 'Hệ thống cần ít nhất 1 quản trị viên.');
    if (!ok) return;
    const data = { name, email, phone, role };
    if (pass) data.password = pass;
    if (editing) DB.update('users', editing, data);
    else DB.insert('users', Object.assign({ id: Utils.uid('u-'), status: 'active', createdAt: new Date().toISOString() }, data));
    Admin.modal('stModal').modal.hide();
    Utils.toast(editing ? 'Đã cập nhật nhân viên.' : `Đã tạo tài khoản cho ${Utils.escape(name)}.`);
    render();
  });
  $('#addBtn').addEventListener('click', () => openForm(null));
  $('#tbody').addEventListener('click', async e => {
    const b = sel => e.target.closest(sel);
    const id = (b('[data-id]') || {}).dataset?.id;
    if (b('.js-edit')) openForm(DB.find('users', id));
    else if (b('.js-reset')) {
      const pw = Math.random().toString(36).slice(2, 10);
      if (!await Utils.confirm('Đặt lại mật khẩu?', `Mật khẩu mới sẽ là: ${pw}`, 'Đặt lại')) return;
      DB.update('users', id, { password: pw });
      if (window.Swal) Swal.fire({ icon: 'success', title: 'Đã đặt lại mật khẩu', html: `Mật khẩu mới: <code class="fs-5">${pw}</code><br><small>Hãy gửi cho nhân viên và yêu cầu đổi sau khi đăng nhập.</small>`, buttonsStyling: false, customClass: { confirmButton: 'btn btn-dark' } });
    } else if (b('.js-lock')) {
      const u = DB.find('users', id);
      const lock = u.status === 'active';
      if (lock && u.role === 'admin' && admins().length <= 1) { Utils.toast('Không thể khóa quản trị viên cuối cùng.', 'warning'); return; }
      if (!await Utils.confirm(`${lock ? 'Khóa' : 'Mở khóa'} tài khoản ${u.name}?`, lock ? 'Nhân viên sẽ không đăng nhập được.' : '', lock ? 'Khóa' : 'Mở khóa')) return;
      DB.update('users', id, { status: lock ? 'locked' : 'active' });
      render();
    }
  });
  render();
})();
