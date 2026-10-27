// Quản lý bài viết / tin tức: thêm, sửa, xuất bản / nháp, xóa.
(function () {
  if (!Admin.init('posts', 'Bài viết')) return;
  const state = { q: '', status: '', cat: '' };
  let editing = null, image = '';

  $('#adminContent').innerHTML = `
    <div class="panel">
      <div class="filter-bar">
        <div class="position-relative flex-grow-1" style="min-width:220px"><i class="bi bi-search fb-icon"></i>
          <input type="search" class="form-control ps-5" id="fQ" placeholder="Tìm tiêu đề…" aria-label="Tìm bài viết"></div>
        <select class="form-select" id="fCat" style="max-width:180px" aria-label="Chuyên mục"></select>
        <select class="form-select" id="fStatus" style="max-width:160px" aria-label="Trạng thái"><option value="">Mọi trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select>
        <button class="btn btn-dark" id="addBtn"><i class="bi bi-plus-lg me-1"></i>Viết bài mới</button>
      </div>
      <div class="table-responsive"><table class="table admin-table align-middle">
        <thead><tr><th>Bài viết</th><th>Chuyên mục</th><th>Tác giả</th><th>Ngày</th><th>Trạng thái</th><th></th></tr></thead><tbody id="tbody"></tbody></table></div>
    </div>`;
  $('#adminModals').innerHTML = `
    <div class="modal fade" id="poModal" tabindex="-1" aria-labelledby="poTitle" aria-hidden="true"><div class="modal-dialog modal-xl modal-dialog-scrollable"><div class="modal-content">
      <form id="poForm" novalidate class="d-contents">
        <div class="modal-header"><h5 class="modal-title" id="poTitle"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
        <div class="modal-body"><div class="row g-3">
          <div class="col-lg-8">
            <div class="mb-3"><label class="form-label" for="poName">Tiêu đề *</label><input class="form-control" id="poName" maxlength="150"></div>
            <div class="mb-3"><label class="form-label" for="poExcerpt">Tóm tắt *</label><textarea class="form-control" id="poExcerpt" rows="2" maxlength="250"></textarea></div>
            <label class="form-label" for="poContent">Nội dung *</label>
            <div class="editor-bar" role="toolbar" aria-label="Định dạng">
              <button type="button" data-wrap="strong" title="In đậm"><i class="bi bi-type-bold"></i></button>
              <button type="button" data-wrap="em" title="In nghiêng"><i class="bi bi-type-italic"></i></button>
              <button type="button" data-wrap="h3" title="Tiêu đề"><i class="bi bi-type-h3"></i></button>
              <button type="button" data-wrap="li" title="Mục danh sách"><i class="bi bi-list-ul"></i></button>
              <span class="small text-muted ms-2">Để trống 1 dòng giữa các đoạn văn. Hỗ trợ thẻ &lt;strong&gt;, &lt;em&gt;, &lt;h3&gt;, &lt;ul&gt;&lt;li&gt;, &lt;a&gt;.</span>
            </div>
            <textarea class="form-control font-monospace small" id="poContent" rows="14"></textarea>
          </div>
          <div class="col-lg-4">
            <div class="mb-3"><label class="form-label" for="poCat">Chuyên mục *</label><input class="form-control" id="poCat" list="catList" maxlength="40"><datalist id="catList"></datalist></div>
            <div class="mb-3"><div class="form-label">Ảnh bìa</div>
              <div class="post-thumb" id="poImg"></div>
              <div class="d-flex gap-2 mt-2"><label class="btn btn-sm btn-outline-dark mb-0" for="poFile">Tải ảnh</label><input type="file" id="poFile" accept="image/*" hidden>
                <button type="button" class="btn btn-sm btn-light" id="poNoImg">Bỏ ảnh</button></div></div>
            <div class="mb-3"><label class="form-label" for="poProduct">Sản phẩm liên quan <span class="small text-muted">(dùng làm ảnh bìa nếu không tải ảnh)</span></label>
              <select class="form-select" id="poProduct"><option value="">— Không —</option>${Catalog.products(true).map(p => `<option value="${p.id}">${Utils.escape(p.name)}</option>`).join('')}</select></div>
            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="poPublish"><label class="form-check-label" for="poPublish">Xuất bản</label></div>
          </div>
        </div></div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Hủy</button><button class="btn btn-dark" type="submit">Lưu bài viết</button></div>
      </form></div></div></div>`;

  const cats = () => [...new Set(DB.all('posts').map(p => p.category))];
  function render() {
    $('#fCat').innerHTML = '<option value="">Mọi chuyên mục</option>' + cats().map(c => `<option ${c === state.cat ? 'selected' : ''}>${c}</option>`).join('');
    const q = Utils.normalize(state.q);
    const list = DB.all('posts').filter(p => (!q || Utils.normalize(p.title).includes(q)) && (!state.status || p.status === state.status) && (!state.cat || p.category === state.cat))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    $('#tbody').innerHTML = list.map(p => `<tr>
      <td><div class="d-flex gap-2 align-items-center"><img src="${postCover(p)}" alt="" width="64" height="40" class="rounded-2 object-fit-cover flex-none">
        <div class="min-w-0"><div class="fw-semibold">${Utils.escape(p.title)}</div><div class="small text-muted text-truncate" style="max-width:420px">${Utils.escape(p.excerpt)}</div></div></div></td>
      <td>${Utils.escape(p.category)}</td><td class="small">${Utils.escape(p.author)}</td><td class="small">${Utils.formatDate(p.createdAt)}</td>
      <td><span class="badge ${p.status === 'published' ? 'text-bg-success' : 'text-bg-light border'}">${p.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
      <td class="text-end text-nowrap">${p.status === 'published' ? `<a class="btn btn-sm btn-light" href="../chi-tiet-tin-tuc.html?id=${p.id}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i></a>` : ''}
        <button class="btn btn-sm btn-outline-dark js-edit" data-id="${p.id}">Sửa</button>
        <button class="btn btn-sm btn-outline-danger js-del" data-id="${p.id}"><i class="bi bi-trash"></i></button></td></tr>`).join('') ||
      '<tr><td colspan="6" class="text-center text-muted py-5">Chưa có bài viết.</td></tr>';
  }

  // HTML ↔ văn bản soạn thảo: đoạn văn cách nhau 1 dòng trống
  const toEditor = html => html.replace(/<\/p>\s*<p>/g, '\n\n').replace(/^<p>|<\/p>$/g, '').replace(/<br\s*\/?>/g, '\n');
  const fromEditor = text => Admin.sanitize(text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
    .map(s => /^<(h3|h4|ul|ol|blockquote)/i.test(s) ? s : `<p>${s.replace(/\n/g, '<br>')}</p>`).join(''));

  function paintImg() {
    const fake = { id: editing || 'new', image, coverProduct: $('#poProduct').value };
    $('#poImg').innerHTML = image || fake.coverProduct ? `<img src="${postCover(fake)}" alt="">` : '<span class="small text-muted">Chưa có ảnh</span>';
  }
  function openForm(p) {
    editing = p ? p.id : null;
    image = p && p.image ? p.image : '';
    $('#poTitle').textContent = p ? 'Sửa bài viết' : 'Viết bài mới';
    $('#poName').value = p ? p.title : '';
    $('#poExcerpt').value = p ? p.excerpt : '';
    $('#poContent').value = p ? toEditor(p.content) : '';
    $('#poCat').value = p ? p.category : '';
    $('#catList').innerHTML = cats().map(c => `<option value="${c}">`).join('');
    $('#poProduct').value = p && p.coverProduct ? p.coverProduct : '';
    $('#poPublish').checked = p ? p.status === 'published' : false;
    Utils.clearInvalid($('#poForm'));
    paintImg();
    Admin.modal('poModal').modal.show();
  }

  /* ---------- Sự kiện ---------- */
  $('.editor-bar').addEventListener('click', e => {
    const b = e.target.closest('[data-wrap]');
    if (!b) return;
    const ta = $('#poContent');
    const [s, en] = [ta.selectionStart, ta.selectionEnd];
    const tag = b.dataset.wrap;
    const sel = ta.value.slice(s, en) || 'văn bản';
    const out = tag === 'li' ? `<ul><li>${sel}</li></ul>` : `<${tag}>${sel}</${tag}>`;
    ta.setRangeText(out, s, en, 'end');
    ta.focus();
  });
  $('#poFile').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { image = await Utils.readImage(f, 1200, 0.8); paintImg(); } catch { Utils.toast('Không đọc được ảnh.', 'error'); }
    e.target.value = '';
  });
  $('#poNoImg').addEventListener('click', () => { image = ''; paintImg(); });
  $('#poProduct').addEventListener('change', paintImg);
  $('#poForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    let ok = true;
    const fail = (id, m) => { Utils.setInvalid($('#' + id), m); ok = false; };
    if ($('#poName').value.trim().length < 10) fail('poName', 'Tiêu đề tối thiểu 10 ký tự.');
    if ($('#poExcerpt').value.trim().length < 20) fail('poExcerpt', 'Tóm tắt tối thiểu 20 ký tự.');
    if ($('#poContent').value.trim().length < 50) fail('poContent', 'Nội dung tối thiểu 50 ký tự.');
    if ($('#poCat').value.trim().length < 2) fail('poCat', 'Nhập chuyên mục.');
    if (!ok) return;
    const data = {
      title: $('#poName').value.trim(), excerpt: $('#poExcerpt').value.trim(), content: fromEditor($('#poContent').value),
      category: $('#poCat').value.trim(), coverProduct: $('#poProduct').value || null, image: image || null,
      status: $('#poPublish').checked ? 'published' : 'draft', slug: Admin.slug($('#poName').value)
    };
    try {
      if (editing) DB.update('posts', editing, data);
      else DB.insert('posts', Object.assign({ id: Utils.uid('bv'), author: Admin.user().name, createdAt: new Date().toISOString() }, data));
    } catch { Utils.toast('Ảnh quá lớn, không lưu được.', 'error'); return; }
    Admin.modal('poModal').modal.hide();
    Utils.toast(data.status === 'published' ? 'Đã lưu & xuất bản bài viết.' : 'Đã lưu bản nháp.');
    render();
  });
  $('#fQ').addEventListener('input', Utils.debounce(e => { state.q = e.target.value.trim(); render(); }, 250));
  $('#fCat').addEventListener('change', e => { state.cat = e.target.value; render(); });
  $('#fStatus').addEventListener('change', e => { state.status = e.target.value; render(); });
  $('#addBtn').addEventListener('click', () => openForm(null));
  $('#tbody').addEventListener('click', async e => {
    const ed = e.target.closest('.js-edit');
    if (ed) { openForm(DB.find('posts', ed.dataset.id)); return; }
    const del = e.target.closest('.js-del');
    if (del && await Utils.confirm('Xóa bài viết?', DB.find('posts', del.dataset.id).title, 'Xóa')) {
      DB.delete('posts', del.dataset.id);
      Utils.toast('Đã xóa bài viết.', 'info');
      render();
    }
  });
  render();
})();
