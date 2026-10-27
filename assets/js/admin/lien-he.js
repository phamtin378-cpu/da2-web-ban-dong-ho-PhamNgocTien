// Xử lý liên hệ từ form "Liên hệ": tiếp nhận, ghi chú phản hồi, đánh dấu hoàn tất.
(function () {
  if (!Admin.init('contacts', 'Liên hệ')) return;
  const STATUS = { new: ['Mới', 'text-bg-danger'], processing: ['Đang xử lý', 'text-bg-warning'], done: ['Đã xử lý', 'text-bg-success'] };
  const state = { status: '', q: '' };
  let current = null;

  $('#adminContent').innerHTML = `
    <div class="panel">
      <div class="filter-bar"><div class="chip-tabs" id="stTabs"></div>
        <input type="search" class="form-control ms-auto" id="fQ" style="max-width:260px" placeholder="Tên, SĐT, nội dung…" aria-label="Tìm liên hệ"></div>
      <div class="table-responsive"><table class="table admin-table align-middle">
        <thead><tr><th>Người gửi</th><th>Chủ đề</th><th>Nội dung</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead><tbody id="tbody"></tbody></table></div>
    </div>`;
  $('#adminModals').innerHTML = `
    <div class="modal fade" id="ctModal" tabindex="-1" aria-labelledby="ctTitle" aria-hidden="true"><div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content">
      <form id="ctForm" novalidate class="d-contents">
        <div class="modal-header"><h5 class="modal-title" id="ctTitle">Chi tiết liên hệ</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
        <div class="modal-body" id="ctBody"></div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Đóng</button>
          <button type="button" class="btn btn-outline-dark js-save" data-to="processing">Lưu – đang xử lý</button><button type="button" class="btn btn-dark js-save" data-to="done">Lưu – đã xử lý</button></div>
      </form></div></div></div>`;

  function render() {
    const all = DB.all('contacts');
    $('#stTabs').innerHTML = [['', 'Tất cả', all.length]].concat(Object.entries(STATUS).map(([k, v]) => [k, v[0], all.filter(c => c.status === k).length]))
      .map(([k, l, n]) => `<button type="button" data-st="${k}" class="${state.status === k ? 'active' : ''}">${l} (${n})</button>`).join('');
    const q = Utils.normalize(state.q);
    const list = all.filter(c => (!state.status || c.status === state.status) && (!q || Utils.normalize(`${c.name} ${c.phone} ${c.message} ${c.subject}`).includes(q)))
      .sort((a, b) => (a.status === 'new' ? 0 : 1) - (b.status === 'new' ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
    $('#tbody').innerHTML = list.map(c => `<tr class="${c.status === 'new' ? 'fw-semibold' : ''}">
      <td>${Utils.escape(c.name)}<div class="small text-muted fw-normal">${Utils.escape(c.phone)}${c.email ? ' · ' + Utils.escape(c.email) : ''}</div></td>
      <td class="small">${Utils.escape(c.subject)}</td>
      <td class="small fw-normal"><div class="text-truncate" style="max-width:320px">${Utils.escape(c.message)}</div></td>
      <td class="small fw-normal">${Utils.timeAgo(c.createdAt)}</td>
      <td><span class="badge ${STATUS[c.status][1]}">${STATUS[c.status][0]}</span></td>
      <td class="text-end"><button class="btn btn-sm btn-outline-dark js-open" data-id="${c.id}">Xử lý</button></td></tr>`).join('') ||
      '<tr><td colspan="6" class="text-center text-muted py-5">Không có liên hệ.</td></tr>';
  }
  function open(id) {
    current = DB.find('contacts', id);
    const c = current;
    const p = c.productId && Catalog.product(c.productId);
    $('#ctBody').innerHTML = `
      <div class="row g-3">
        <div class="col-md-6"><div class="info-box"><div class="ib-title">Người gửi</div><div class="fw-semibold">${Utils.escape(c.name)}</div>
          <div class="small"><a href="tel:${c.phone}">${Utils.escape(c.phone)}</a>${c.email ? ` · <a href="mailto:${Utils.escape(c.email)}">${Utils.escape(c.email)}</a>` : ''}</div>
          <div class="small text-muted">${Utils.formatDate(c.createdAt, true)}${c.userId ? ' · khách có tài khoản' : ''}</div></div></div>
        <div class="col-md-6"><div class="info-box"><div class="ib-title">Chủ đề</div><div>${Utils.escape(c.subject || '—')}</div>
          ${p ? `<div class="small mt-1">Sản phẩm: <a href="../chi-tiet-san-pham.html?id=${p.id}" target="_blank" rel="noopener">${Utils.escape(p.name)}</a> (tồn kho: ${p.stock})</div>` : ''}</div></div>
      </div>
      <div class="ib-title mt-3">Nội dung</div><div class="bg-soft rounded-3 p-3" style="white-space:pre-wrap">${Utils.escape(c.message)}</div>
      ${c.reply ? `<div class="small text-muted mt-2">Ghi chú gần nhất bởi ${Utils.escape(c.reply.byName)} · ${Utils.formatDate(c.reply.at, true)}</div>` : ''}
      <label class="form-label mt-3" for="ctNote">Ghi chú xử lý / nội dung đã phản hồi khách</label>
      <textarea class="form-control" id="ctNote" rows="3" maxlength="600">${Utils.escape(c.reply ? c.reply.content : '')}</textarea>`;
    if (c.status === 'new') { DB.update('contacts', c.id, { status: 'processing' }); render(); Admin.refreshBadges(); }
    Admin.modal('ctModal').modal.show();
  }
  $('#ctForm').addEventListener('click', e => {
    const b = e.target.closest('.js-save');
    if (!b) return;
    const note = $('#ctNote').value.trim();
    if (b.dataset.to === 'done' && note.length < 5) { Utils.setInvalid($('#ctNote'), 'Ghi lại nội dung đã phản hồi khách trước khi hoàn tất.'); return; }
    DB.update('contacts', current.id, { status: b.dataset.to, reply: note ? { byName: Admin.user().name, content: note, at: new Date().toISOString() } : current.reply });
    Admin.modal('ctModal').modal.hide();
    Utils.toast('Đã cập nhật liên hệ.');
    render(); Admin.refreshBadges();
  });
  $('#stTabs').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (b) { state.status = b.dataset.st; render(); } });
  $('#fQ').addEventListener('input', Utils.debounce(e => { state.q = e.target.value.trim(); render(); }, 250));
  $('#tbody').addEventListener('click', e => { const b = e.target.closest('.js-open'); if (b) open(b.dataset.id); });
  render();
})();
