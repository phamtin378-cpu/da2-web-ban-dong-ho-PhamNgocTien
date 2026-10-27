// Hồ sơ cá nhân nhân viên/admin: thông tin, quyền hạn, đổi mật khẩu, thống kê công việc.
(function () {
  if (!Admin.init('profile', 'Hồ sơ cá nhân')) return;
  const u = Admin.user();
  const handled = DB.all('orders').filter(o => o.history.some(h => h.by === u.id && h.status !== 'pending'));
  const replies = DB.all('reviews').filter(r => r.reply && r.reply.by === u.id).length + DB.all('questions').filter(q => q.answer && q.answer.by === u.id).length;
  const pages = Admin.MENU.filter(([p]) => PERMS[p].includes(u.role));

  $('#adminContent').innerHTML = `
    <div class="row g-4">
      <div class="col-xl-7">
        <form class="panel" id="infoForm" novalidate>
          <h2 class="admin-h2">Thông tin tài khoản</h2>
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label" for="iName">Họ tên</label><input class="form-control" id="iName" value="${Utils.escape(u.name)}"></div>
            <div class="col-md-6"><label class="form-label" for="iPhone">Số điện thoại</label><input class="form-control" id="iPhone" value="${u.phone}"></div>
            <div class="col-md-6"><label class="form-label" for="iEmail">Email đăng nhập</label><input class="form-control" id="iEmail" value="${Utils.escape(u.email)}" disabled></div>
            <div class="col-md-6"><label class="form-label">Vai trò</label><input class="form-control" value="${Auth.ROLES[u.role]}" disabled></div>
          </div>
          <button class="btn btn-dark mt-3" type="submit">Lưu thông tin</button>
        </form>
        <form class="panel mt-4" id="pwForm" novalidate>
          <h2 class="admin-h2">Đổi mật khẩu</h2>
          <div class="row g-3">
            <div class="col-md-4"><label class="form-label" for="pOld">Mật khẩu hiện tại</label><input type="password" class="form-control" id="pOld" autocomplete="current-password"></div>
            <div class="col-md-4"><label class="form-label" for="pNew">Mật khẩu mới</label><input type="password" class="form-control" id="pNew" autocomplete="new-password"></div>
            <div class="col-md-4"><label class="form-label" for="pNew2">Nhập lại</label><input type="password" class="form-control" id="pNew2" autocomplete="new-password"></div>
          </div>
          <button class="btn btn-dark mt-3" type="submit">Đổi mật khẩu</button>
        </form>
      </div>
      <div class="col-xl-5">
        <div class="panel">
          <h2 class="admin-h2">Công việc của bạn</h2>
          <div class="row g-3">
            <div class="col-6"><div class="stat-tile"><div class="small text-muted">Lượt xử lý đơn</div><div class="stat-value">${handled.length}</div></div></div>
            <div class="col-6"><div class="stat-tile"><div class="small text-muted">Phản hồi đánh giá / hỏi đáp</div><div class="stat-value">${replies}</div></div></div>
          </div>
        </div>
        <div class="panel mt-4">
          <h2 class="admin-h2">Quyền truy cập</h2>
          <ul class="list-unstyled mb-0 small">${pages.map(([p, icon, label]) => {
            const viewOnly = (p === 'promotions' && !Admin.can('promotion.edit')) || (p === 'customers' && !Admin.can('customer.lock')) || (p === 'products' && !Admin.can('product.delete'));
            return `<li class="py-1"><i class="bi ${icon} me-2"></i>${label}${viewOnly ? ` <span class="text-muted">(${p === 'products' ? 'không được xóa' : 'chỉ xem'})</span>` : ''}</li>`;
          }).join('')}${Admin.can('report.view') ? '<li class="py-1"><i class="bi bi-graph-up me-2"></i>Báo cáo doanh thu</li>' : ''}</ul>
        </div>
        ${u.role === 'admin' ? `
        <div class="panel mt-4">
          <h2 class="admin-h2">Sao lưu dữ liệu</h2>
          <p class="small text-muted">Dữ liệu website (sản phẩm, ảnh đã tải lên, danh mục, bài viết, đơn hàng, tài khoản…) được lưu trong trình duyệt của máy này.
            Xuất ra file để mang sang máy khác / bản copy khác rồi nhập lại.</p>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-dark btn-sm" id="exportData"><i class="bi bi-download me-1"></i>Xuất dữ liệu</button>
            <label class="btn btn-outline-dark btn-sm mb-0" for="importFile"><i class="bi bi-upload me-1"></i>Nhập dữ liệu</label>
            <input type="file" id="importFile" accept=".json,application/json" hidden>
          </div>
        </div>
        <div class="panel mt-4 border-danger-subtle">
          <h2 class="admin-h2">Dữ liệu demo</h2>
          <p class="small text-muted">Khôi phục sẽ xóa toàn bộ đơn hàng, sản phẩm, ảnh, tài khoản… đã tạo và nạp lại dữ liệu mẫu ban đầu. Nên xuất dữ liệu trước khi khôi phục.</p>
          <button class="btn btn-outline-danger btn-sm" id="resetData"><i class="bi bi-arrow-counterclockwise me-1"></i>Khôi phục dữ liệu mẫu</button>
        </div>` : ''}
      </div>
    </div>`;

  // Xuất dữ liệu ra file .json
  $('#exportData')?.addEventListener('click', () => {
    const dump = DB.exportAll();
    const name = `timehouse-du-lieu-${new Date().toISOString().slice(0, 10)}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump)], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    const imgs = dump.data.products.filter(p => p.images && p.images.length).length;
    Utils.toast(`Đã xuất dữ liệu (${imgs} sản phẩm có ảnh tải lên). File: <strong>${name}</strong> trong thư mục Tải xuống.`);
  });
  // Nhập dữ liệu từ file đã xuất
  $('#importFile')?.addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    let dump;
    try { dump = JSON.parse(await f.text()); } catch { Utils.toast('File không đọc được.', 'error'); return; }
    if (!dump || dump.app !== 'TIMEHOUSE') { Utils.toast('Đây không phải file dữ liệu TIMEHOUSE.', 'error'); return; }
    if (!await Utils.confirm('Nhập dữ liệu?', `Dữ liệu hiện tại sẽ được thay bằng dữ liệu trong file (xuất lúc ${Utils.formatDate(dump.exportedAt, true)}).`, 'Nhập')) return;
    try {
      if (!DB.importAll(dump)) { Utils.toast('File dữ liệu không hợp lệ.', 'error'); return; }
    } catch { Utils.toast('Trình duyệt không đủ dung lượng để nhập file này.', 'error'); return; }
    Utils.toast('Đã nhập dữ liệu. Đang tải lại…');
    setTimeout(() => location.reload(), 800);
  });

  $('#resetData')?.addEventListener('click', async () => {
    if (!await Utils.confirm('Khôi phục dữ liệu mẫu?', 'Mọi thay đổi sẽ bị xóa và bạn cần đăng nhập lại.', 'Khôi phục')) return;
    DB.reset();
    location.href = '../dang-nhap.html';
  });

  $('#infoForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    const name = $('#iName').value.trim(), phone = $('#iPhone').value.trim();
    let ok = true;
    if (name.length < 2) { Utils.setInvalid($('#iName'), 'Nhập họ tên.'); ok = false; }
    if (!Utils.isPhone(phone)) { Utils.setInvalid($('#iPhone'), 'SĐT gồm 10 số, bắt đầu bằng 0.'); ok = false; }
    else if (DB.all('users').some(x => x.id !== u.id && x.phone === phone)) { Utils.setInvalid($('#iPhone'), 'SĐT đã được sử dụng.'); ok = false; }
    if (!ok) return;
    DB.update('users', u.id, { name, phone });
    Utils.toast('Đã cập nhật thông tin.');
  });
  $('#pwForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    const cur = Admin.user();
    let ok = true;
    if ($('#pOld').value !== cur.password) { Utils.setInvalid($('#pOld'), 'Mật khẩu hiện tại không đúng.'); ok = false; }
    if ($('#pNew').value.length < 6) { Utils.setInvalid($('#pNew'), 'Tối thiểu 6 ký tự.'); ok = false; }
    if ($('#pNew2').value !== $('#pNew').value) { Utils.setInvalid($('#pNew2'), 'Không khớp.'); ok = false; }
    if (!ok) return;
    DB.update('users', cur.id, { password: $('#pNew').value });
    e.target.reset();
    Utils.toast('Đổi mật khẩu thành công.');
  });
})();
