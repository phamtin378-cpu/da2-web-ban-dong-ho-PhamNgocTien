// Đánh giá & hỏi đáp: duyệt / ẩn / trả lời đánh giá, xử lý báo cáo vi phạm; trả lời câu hỏi.
(function () {
  if (!Admin.init('reviews', 'Đánh giá & hỏi đáp')) return;
  const PER = 10;
  let tab = location.hash === '#qa' ? 'qa' : 'reviews';
  const rv = { status: 'pending', rating: '', q: '', page: 1, selected: new Set() };
  const qa = { status: 'open', q: '' };
  let replyTarget = null;

  $('#adminContent').innerHTML = `
    <div class="panel">
      <div class="status-tabs mb-3"><button type="button" data-tab="reviews">Đánh giá sản phẩm</button><button type="button" data-tab="qa">Hỏi đáp</button></div>
      <div id="tabBody"></div>
    </div>`;
  $('#adminModals').innerHTML = `
    <div class="modal fade" id="replyModal" tabindex="-1" aria-labelledby="rpTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <form id="replyForm" novalidate class="d-contents">
        <div class="modal-header"><h5 class="modal-title" id="rpTitle">Phản hồi</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
        <div class="modal-body"><div class="bg-soft rounded-3 p-3 small mb-3" id="rpQuote"></div>
          <label class="form-label" for="rpText">Nội dung phản hồi (hiển thị công khai với tên “TIMEHOUSE”)</label>
          <textarea class="form-control" id="rpText" rows="4" maxlength="600"></textarea>
          <div class="d-flex flex-wrap gap-1 mt-2" id="rpTemplates"></div></div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-danger me-auto" id="rpDelete">Xóa phản hồi</button>
          <button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Hủy</button><button class="btn btn-dark" type="submit">Gửi phản hồi</button></div>
      </form></div></div></div>`;
  const TEMPLATES = ['Cảm ơn bạn đã tin tưởng TIMEHOUSE!', 'TIMEHOUSE xin lỗi về trải nghiệm chưa tốt, nhân viên sẽ liên hệ hỗ trợ bạn ngay ạ.', 'Bạn vui lòng liên hệ hotline 1900 6868 để được hỗ trợ nhanh nhất ạ.'];
  $('#rpTemplates').innerHTML = TEMPLATES.map(t => `<button type="button" class="btn btn-sm btn-light js-tpl">${t.slice(0, 32)}…</button>`).join('');

  /* ================= Đánh giá ================= */
  function reviewList() {
    const q = Utils.normalize(rv.q);
    return DB.all('reviews').filter(r => {
      if (rv.status === 'reported' ? !r.reports.length : rv.status && r.status !== rv.status) return false;
      if (rv.rating && r.rating !== +rv.rating) return false;
      const p = Catalog.product(r.productId);
      return !q || Utils.normalize(`${p ? p.name : ''} ${r.userName} ${r.content}`).includes(q);
    }).sort((a, b) => b.reports.length - a.reports.length || b.createdAt.localeCompare(a.createdAt));
  }
  function renderReviews() {
    const all = DB.all('reviews');
    const counts = { pending: all.filter(r => r.status === 'pending').length, approved: all.filter(r => r.status === 'approved').length,
      hidden: all.filter(r => r.status === 'hidden').length, reported: all.filter(r => r.reports.length).length, '': all.length };
    const p = Admin.paginate(reviewList(), rv.page, PER);
    rv.page = p.page;
    $('#tabBody').innerHTML = `
      <div class="filter-bar">
        <div class="chip-tabs">${[['pending', 'Chờ duyệt'], ['approved', 'Đang hiển thị'], ['hidden', 'Đã ẩn'], ['reported', 'Bị báo cáo'], ['', 'Tất cả']]
          .map(([k, l]) => `<button type="button" data-rs="${k}" class="${rv.status === k ? 'active' : ''}">${l} (${counts[k]})</button>`).join('')}</div>
        <select class="form-select ms-auto" id="rvRating" style="max-width:130px" aria-label="Số sao"><option value="">Mọi số sao</option>${[5, 4, 3, 2, 1].map(s => `<option value="${s}" ${+rv.rating === s ? 'selected' : ''}>${s} sao</option>`).join('')}</select>
        <input type="search" class="form-control" id="rvQ" style="max-width:240px" placeholder="Sản phẩm, khách, nội dung…" value="${Utils.escape(rv.q)}" aria-label="Tìm đánh giá">
      </div>
      <div class="bulk-bar" id="bulkBar" ${rv.selected.size ? '' : 'hidden'}>Đã chọn <strong>${rv.selected.size}</strong>
        <button class="btn btn-sm btn-success js-bulk" data-to="approved">Duyệt</button><button class="btn btn-sm btn-outline-dark js-bulk" data-to="hidden">Ẩn</button>
        <button class="btn btn-sm btn-link text-muted js-bulk-clear">Bỏ chọn</button></div>
      <div class="d-grid gap-2">${p.rows.map(r => {
        const pr = Catalog.product(r.productId);
        return `<div class="rv-admin ${r.status}" data-id="${r.id}">
          <input class="form-check-input mt-1 js-sel" type="checkbox" ${rv.selected.has(r.id) ? 'checked' : ''} aria-label="Chọn">
          <div class="flex-grow-1 min-w-0">
            <div class="d-flex flex-wrap gap-2 align-items-center">
              <strong>${Utils.escape(r.userName)}</strong>${r.verified ? '<span class="rv-verified"><i class="bi bi-patch-check-fill"></i> Đã mua</span>' : ''}
              ${Reviews.stars(r.rating)} <span class="small text-muted">${Utils.formatDate(r.createdAt, true)}</span>
              <span class="badge ${r.status === 'approved' ? 'text-bg-success' : r.status === 'pending' ? 'text-bg-warning' : 'text-bg-secondary'}">${Reviews.STATUS_LABEL[r.status]}</span>
              ${r.reports.length ? `<span class="badge text-bg-danger"><i class="bi bi-flag-fill"></i> ${r.reports.length} báo cáo</span>` : ''}
            </div>
            <div class="small mt-1">Sản phẩm: ${pr ? `<a href="../chi-tiet-san-pham.html?id=${pr.id}#reviews" target="_blank" rel="noopener">${Utils.escape(pr.name)}</a>` : '<em>đã xóa</em>'}</div>
            ${r.title ? `<div class="fw-semibold mt-2">${Utils.escape(r.title)}</div>` : ''}
            <div>${Utils.escape(r.content)}</div>
            ${r.tags.length ? `<div class="rv-tags mt-1">${r.tags.map(t => `<span>${Utils.escape(t)}</span>`).join('')}</div>` : ''}
            ${r.images.length ? `<div class="rv-images mt-1">${r.images.map(s => `<img src="${s}" alt="" width="56" height="56" class="rounded-2 object-fit-cover">`).join('')}</div>` : ''}
            ${r.reply ? `<div class="rv-reply small"><strong>Phản hồi:</strong> ${Utils.escape(r.reply.content)}</div>` : ''}
          </div>
          <div class="rv-admin-actions">
            ${r.status !== 'approved' ? '<button class="btn btn-sm btn-success js-st" data-to="approved"><i class="bi bi-check-lg"></i> Duyệt</button>' : ''}
            ${r.status !== 'hidden' ? '<button class="btn btn-sm btn-outline-dark js-st" data-to="hidden"><i class="bi bi-eye-slash"></i> Ẩn</button>' : ''}
            ${r.reports.length ? '<button class="btn btn-sm btn-light js-clear-rp">Bỏ báo cáo</button>' : ''}
            <button class="btn btn-sm btn-outline-dark js-reply"><i class="bi bi-reply"></i> ${r.reply ? 'Sửa phản hồi' : 'Phản hồi'}</button>
            <button class="btn btn-sm btn-light text-danger js-del" title="Xóa"><i class="bi bi-trash"></i></button>
          </div></div>`;
      }).join('') || '<div class="text-center text-muted py-5">Không có đánh giá nào.</div>'}</div>
      ${Admin.pagerInfo(p, PER)}`;
  }

  /* ================= Hỏi đáp ================= */
  function renderQA() {
    const all = DB.all('questions');
    const q = Utils.normalize(qa.q);
    const list = all.filter(x => (qa.status === 'open' ? !x.answer : qa.status === 'done' ? !!x.answer : true) &&
      (!q || Utils.normalize(x.content + ' ' + x.userName + ' ' + (Catalog.product(x.productId)?.name || '')).includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    $('#tabBody').innerHTML = `
      <div class="filter-bar"><div class="chip-tabs">${[['open', 'Chờ trả lời', all.filter(x => !x.answer).length], ['done', 'Đã trả lời', all.filter(x => x.answer).length], ['all', 'Tất cả', all.length]]
        .map(([k, l, n]) => `<button type="button" data-qs="${k}" class="${qa.status === k ? 'active' : ''}">${l} (${n})</button>`).join('')}</div>
        <input type="search" class="form-control ms-auto" id="qaQ" style="max-width:260px" placeholder="Tìm câu hỏi…" value="${Utils.escape(qa.q)}" aria-label="Tìm câu hỏi"></div>
      <div class="d-grid gap-2">${list.map(x => {
        const pr = Catalog.product(x.productId);
        return `<div class="rv-admin ${x.answer ? 'approved' : 'pending'}" data-id="${x.id}">
          <div class="flex-grow-1 min-w-0">
            <div class="small text-muted">${Utils.escape(x.userName)} · ${Utils.formatDate(x.createdAt, true)} · ${pr ? `<a href="../chi-tiet-san-pham.html?id=${pr.id}#qa" target="_blank" rel="noopener">${Utils.escape(pr.name)}</a>` : ''}</div>
            <div class="fw-semibold mt-1"><i class="bi bi-question-circle me-1"></i>${Utils.escape(x.content)}</div>
            ${x.answer ? `<div class="rv-reply small"><strong>${Utils.escape(x.answer.byName)}:</strong> ${Utils.escape(x.answer.content)}</div>` : ''}
          </div>
          <div class="rv-admin-actions"><button class="btn btn-sm ${x.answer ? 'btn-outline-dark' : 'btn-dark'} js-answer">${x.answer ? 'Sửa trả lời' : 'Trả lời'}</button>
            <button class="btn btn-sm btn-light text-danger js-qdel" title="Xóa"><i class="bi bi-trash"></i></button></div></div>`;
      }).join('') || '<div class="text-center text-muted py-5">Không có câu hỏi nào.</div>'}</div>`;
  }

  /* ================= Phản hồi (dùng chung) ================= */
  function openReply(kind, id) {
    replyTarget = { kind, id };
    const item = DB.find(kind === 'review' ? 'reviews' : 'questions', id);
    const current = kind === 'review' ? item.reply : item.answer;
    $('#rpTitle').textContent = kind === 'review' ? 'Phản hồi đánh giá' : 'Trả lời câu hỏi';
    $('#rpQuote').innerHTML = `<strong>${Utils.escape(item.userName)}:</strong> ${Utils.escape(item.content)}`;
    $('#rpText').value = current ? current.content : '';
    $('#rpDelete').hidden = !current;
    Utils.clearInvalid($('#replyForm'));
    Admin.modal('replyModal').modal.show();
  }
  $('#rpTemplates').addEventListener('click', e => { const b = e.target.closest('.js-tpl'); if (b) $('#rpText').value = TEMPLATES[[...$$('.js-tpl')].indexOf(b)]; });
  $('#replyForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('#rpText').value.trim();
    if (text.length < 5) { Utils.setInvalid($('#rpText'), 'Nội dung tối thiểu 5 ký tự.'); return; }
    if (replyTarget.kind === 'review') Reviews.reply(replyTarget.id, text); else Questions.answer(replyTarget.id, text);
    Admin.modal('replyModal').modal.hide();
    Utils.toast(replyTarget.kind === 'review' ? 'Đã phản hồi đánh giá.' : 'Đã trả lời câu hỏi – câu hỏi sẽ hiển thị công khai.');
    show(tab); Admin.refreshBadges();
  });
  $('#rpDelete').addEventListener('click', () => {
    if (replyTarget.kind === 'review') Reviews.reply(replyTarget.id, null); else Questions.answer(replyTarget.id, null);
    Admin.modal('replyModal').modal.hide();
    show(tab); Admin.refreshBadges();
  });

  /* ================= Sự kiện ================= */
  function show(t) {
    tab = t;
    history.replaceState(null, '', t === 'qa' ? '#qa' : '#');
    $$('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    t === 'qa' ? renderQA() : renderReviews();
  }
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
  const body = $('#tabBody');
  body.addEventListener('input', Utils.debounce(e => {
    if (e.target.id === 'rvQ') { rv.q = e.target.value.trim(); rv.page = 1; renderReviews(); $('#rvQ').focus(); }
    if (e.target.id === 'qaQ') { qa.q = e.target.value.trim(); renderQA(); $('#qaQ').focus(); }
  }, 300));
  body.addEventListener('change', e => {
    if (e.target.id === 'rvRating') { rv.rating = e.target.value; rv.page = 1; renderReviews(); }
    if (e.target.classList.contains('js-sel')) {
      const id = e.target.closest('[data-id]').dataset.id;
      e.target.checked ? rv.selected.add(id) : rv.selected.delete(id);
      renderReviews();
    }
  });
  body.addEventListener('click', async e => {
    const b = sel => e.target.closest(sel);
    const id = b('[data-id]') && b('[data-id]').dataset.id;
    if (b('[data-rs]') && !b('[data-id]')) { rv.status = b('[data-rs]').dataset.rs; rv.page = 1; rv.selected.clear(); renderReviews(); }
    else if (b('[data-qs]')) { qa.status = b('[data-qs]').dataset.qs; renderQA(); }
    else if (b('[data-page]') && !b('.disabled')) { rv.page = +b('[data-page]').dataset.page; renderReviews(); }
    else if (b('.js-st')) {
      Reviews.setStatus(id, b('.js-st').dataset.to);
      if (b('.js-st').dataset.to === 'approved') DB.update('reviews', id, { reports: [] });
      Utils.toast(b('.js-st').dataset.to === 'approved' ? 'Đã duyệt – đánh giá hiển thị công khai.' : 'Đã ẩn đánh giá.', 'info');
      renderReviews(); Admin.refreshBadges();
    } else if (b('.js-clear-rp')) { DB.update('reviews', id, { reports: [] }); renderReviews(); }
    else if (b('.js-reply')) openReply('review', id);
    else if (b('.js-del')) {
      if (!await Utils.confirm('Xóa đánh giá này?', 'Không thể hoàn tác.', 'Xóa')) return;
      Reviews.remove(id); rv.selected.delete(id); renderReviews(); Admin.refreshBadges();
    } else if (b('.js-bulk')) {
      const to = b('.js-bulk').dataset.to;
      rv.selected.forEach(x => { Reviews.setStatus(x, to); if (to === 'approved') DB.update('reviews', x, { reports: [] }); });
      Utils.toast(`Đã cập nhật ${rv.selected.size} đánh giá.`);
      rv.selected.clear(); renderReviews(); Admin.refreshBadges();
    } else if (b('.js-bulk-clear')) { rv.selected.clear(); renderReviews(); }
    else if (b('.js-answer')) openReply('question', id);
    else if (b('.js-qdel')) {
      if (!await Utils.confirm('Xóa câu hỏi này?', '', 'Xóa')) return;
      DB.delete('questions', id); renderQA(); Admin.refreshBadges();
    }
  });
  show(tab);
})();
