// Quản lý khuyến mãi: 4 loại chương trình. Nhân viên chỉ xem, admin thêm/sửa/xóa/bật-tắt.
(function () {
  if (!Admin.init('promotions', 'Khuyến mãi')) return;
  const fp = Utils.formatPrice;
  const canEdit = Admin.can('promotion.edit');
  const state = { type: 'all', status: '', q: '' };
  const STATUS_BADGE = { running: 'text-bg-success', upcoming: 'text-bg-info', ended: 'text-bg-secondary', paused: 'text-bg-warning' };
  let editing = null;      // id đang sửa
  let flashRows = [];      // dòng sản phẩm flash sale trong form

  $('#adminContent').innerHTML = `
    ${canEdit ? '' : '<div class="alert alert-light border small"><i class="bi bi-eye me-1"></i>Bạn đang xem với quyền <strong>Nhân viên</strong> – chỉ Admin được tạo và chỉnh sửa khuyến mãi.</div>'}
    <div class="panel">
      <div class="status-tabs" id="typeTabs"></div>
      <div class="filter-bar">
        <div class="position-relative flex-grow-1" style="min-width:220px"><i class="bi bi-search fb-icon"></i>
          <input type="search" class="form-control ps-5" id="fQ" placeholder="Tên chương trình, mã giảm giá…" aria-label="Tìm khuyến mãi"></div>
        <select class="form-select" id="fStatus" style="max-width:180px" aria-label="Trạng thái"><option value="">Mọi trạng thái</option>
          ${Object.entries(Promo.STATUS_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        ${canEdit ? `<div class="dropdown"><button class="btn btn-dark dropdown-toggle" data-bs-toggle="dropdown"><i class="bi bi-plus-lg me-1"></i>Tạo chương trình</button>
          <ul class="dropdown-menu dropdown-menu-end">${Object.entries(Promo.TYPE_LABEL).map(([k, v]) => `<li><button class="dropdown-item js-new" data-type="${k}">${v}</button></li>`).join('')}</ul></div>` : ''}
      </div>
      <div class="table-responsive"><table class="table admin-table align-middle">
        <thead><tr><th>Chương trình</th><th>Loại</th><th>Ưu đãi</th><th>Thời gian</th><th>Trạng thái</th><th class="text-center">Bật</th><th></th></tr></thead>
        <tbody id="tbody"></tbody></table></div>
    </div>`;

  const scopeLabel = s => {
    if (!s || s.type === 'all') return 'Toàn bộ sản phẩm';
    const name = { categories: id => Catalog.category(id)?.name, brands: id => Catalog.brand(id)?.name, products: id => Catalog.product(id)?.name }[s.type];
    return s.ids.map(name).filter(Boolean).join(', ');
  };
  const offerText = p => {
    if (p.type === 'discount') return `Giảm ${p.discountType === 'percent' ? p.value + '%' : fp(p.value)}${p.maxDiscount ? ` (tối đa ${fp(p.maxDiscount)})` : ''}<div class="small text-muted text-truncate" style="max-width:260px">${Utils.escape(scopeLabel(p.scope))}</div>`;
    if (p.type === 'flashsale') return `${p.items.length} sản phẩm<div class="small text-muted">Đã bán ${p.items.reduce((s, i) => s + i.sold, 0)}/${p.items.reduce((s, i) => s + i.quota, 0)} suất</div>`;
    if (p.type === 'coupon') return `<span class="badge text-bg-dark">${p.code}</span> ${p.discountType === 'percent' ? p.value + '%' : fp(p.value)}<div class="small text-muted">Đơn từ ${fp(p.minOrder || 0)} · đã dùng ${p.used}/${p.usageLimit || '∞'}</div>`;
    return `${Utils.escape(p.gift)}<div class="small text-muted">${p.minOrder ? 'Đơn từ ' + fp(p.minOrder) : ''}${p.minItemPrice ? 'SP từ ' + fp(p.minItemPrice) : ''} · ${Utils.escape(scopeLabel(p.scope))}</div>`;
  };

  function render() {
    const all = Promo.all();
    $('#typeTabs').innerHTML = [['all', 'Tất cả', all.length]].concat(Object.entries(Promo.TYPE_LABEL).map(([k, v]) => [k, v, all.filter(p => p.type === k).length]))
      .map(([k, l, n]) => `<button type="button" data-type="${k}" class="${state.type === k ? 'active' : ''}">${l} <span>${n}</span></button>`).join('');
    const q = Utils.normalize(state.q);
    const list = all.filter(p => (state.type === 'all' || p.type === state.type) && (!state.status || Promo.status(p) === state.status) &&
      (!q || Utils.normalize(p.name + ' ' + (p.code || '')).includes(q))).sort((a, b) => b.start.localeCompare(a.start));
    $('#tbody').innerHTML = list.map(p => {
      const st = Promo.status(p);
      return `<tr>
        <td><div class="fw-semibold">${Utils.escape(p.name)}</div><div class="small text-muted">${Utils.escape(p.description || '')}</div></td>
        <td class="small">${Promo.TYPE_LABEL[p.type]}</td>
        <td class="small">${offerText(p)}</td>
        <td class="small text-nowrap">${Utils.formatDate(p.start, true)}<br>→ ${Utils.formatDate(p.end, true)}</td>
        <td><span class="badge ${STATUS_BADGE[st]}">${Promo.STATUS_LABEL[st]}</span></td>
        <td class="text-center"><div class="form-check form-switch d-inline-block"><input class="form-check-input js-toggle" type="checkbox" data-id="${p.id}" ${p.active ? 'checked' : ''} ${canEdit ? '' : 'disabled'} aria-label="Bật/tắt"></div></td>
        <td class="text-end text-nowrap">${canEdit ? `<button class="btn btn-sm btn-outline-dark js-edit" data-id="${p.id}">Sửa</button>
          <button class="btn btn-sm btn-outline-danger js-del" data-id="${p.id}" title="Xóa"><i class="bi bi-trash"></i></button>` : `<a class="btn btn-sm btn-light" href="../san-pham.html?promo=${p.id}" target="_blank" rel="noopener">Xem SP</a>`}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center text-muted py-5">Không có chương trình phù hợp.</td></tr>';
  }

  /* ---------- Form ---------- */
  if (canEdit) {
    $('#adminModals').innerHTML = `
      <div class="modal fade" id="prModal" tabindex="-1" aria-labelledby="prTitle" aria-hidden="true"><div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">
        <form id="prForm" novalidate class="d-contents">
          <div class="modal-header"><h5 class="modal-title" id="prTitle"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
          <div class="modal-body" id="prBody"></div>
          <div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Hủy</button><button class="btn btn-dark" type="submit">Lưu chương trình</button></div>
        </form></div></div></div>`;
  }

  function scopeFields(scope = { type: 'all', ids: [] }) {
    return `<div class="col-md-4"><label class="form-label" for="fScopeType">Phạm vi áp dụng</label>
      <select class="form-select" id="fScopeType">${[['all', 'Toàn bộ sản phẩm'], ['categories', 'Theo danh mục'], ['brands', 'Theo thương hiệu'], ['products', 'Sản phẩm cụ thể']]
        .map(([k, l]) => `<option value="${k}" ${scope.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="col-md-8"><label class="form-label" for="fScopeIds">Chọn <span class="text-muted small">(giữ Ctrl để chọn nhiều)</span></label>
      <select class="form-select" id="fScopeIds" multiple size="6" ${scope.type === 'all' ? 'disabled' : ''}>${scopeOptions(scope.type, scope.ids)}</select></div>`;
  }
  function scopeOptions(type, ids = []) {
    const sel = id => ids.includes(id) ? 'selected' : '';
    if (type === 'categories') return Catalog.parents().map(p => `<option value="${p.id}" ${sel(p.id)}>${p.name} (tất cả)</option>${Catalog.children(p.id).map(c => `<option value="${c.id}" ${sel(c.id)}>— ${c.name}</option>`).join('')}`).join('');
    if (type === 'brands') return Catalog.brands().map(b => `<option value="${b.id}" ${sel(b.id)}>${Utils.escape(b.name)}</option>`).join('');
    if (type === 'products') return Catalog.products(true).map(p => `<option value="${p.id}" ${sel(p.id)}>${Utils.escape(p.name)} – ${p.sku}</option>`).join('');
    return '';
  }
  function discountFields(p) {
    return `<div class="col-md-4"><label class="form-label" for="fDType">Kiểu giảm</label><select class="form-select" id="fDType">
        <option value="percent" ${p.discountType !== 'fixed' ? 'selected' : ''}>Phần trăm (%)</option><option value="fixed" ${p.discountType === 'fixed' ? 'selected' : ''}>Số tiền (₫)</option></select></div>
      <div class="col-md-4"><label class="form-label" for="fValue">Mức giảm *</label><input type="number" class="form-control" id="fValue" min="1" value="${p.value || ''}"></div>
      <div class="col-md-4"><label class="form-label" for="fMax">Giảm tối đa (₫)</label><input type="number" class="form-control" id="fMax" min="0" step="1000" value="${p.maxDiscount || ''}" placeholder="Không giới hạn"></div>`;
  }
  function flashTable() {
    const opts = id => Catalog.products(true).map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${Utils.escape(x.name)} – ${fp(x.salePrice || x.price)}</option>`).join('');
    return `<table class="table table-sm align-middle mb-2"><thead><tr><th>Sản phẩm</th><th style="width:140px">Giá flash (₫)</th><th style="width:90px">Số suất</th><th style="width:70px">Đã bán</th><th></th></tr></thead><tbody>
      ${flashRows.map((r, i) => `<tr data-i="${i}"><td><select class="form-select form-select-sm js-fs-p">${opts(r.productId)}</select></td>
        <td><input type="number" class="form-control form-control-sm js-fs-price" min="1000" step="1000" value="${r.salePrice || ''}"></td>
        <td><input type="number" class="form-control form-control-sm js-fs-quota" min="1" value="${r.quota || ''}"></td>
        <td class="small text-center">${r.sold || 0}</td>
        <td><button type="button" class="btn btn-sm btn-light text-danger js-fs-del" aria-label="Xóa dòng"><i class="bi bi-x-lg"></i></button></td></tr>`).join('')}
      </tbody></table><button type="button" class="btn btn-sm btn-outline-dark js-fs-add"><i class="bi bi-plus-lg me-1"></i>Thêm sản phẩm</button>`;
  }

  function openForm(type, p) {
    editing = p ? p.id : null;
    p = p || { type, active: true, start: new Date().toISOString(), end: new Date(Date.now() + 7 * 86400000).toISOString(), scope: { type: 'all', ids: [] } };
    flashRows = type === 'flashsale' ? (p.items || []).map(x => Object.assign({}, x)) : [];
    $('#prTitle').textContent = `${editing ? 'Sửa' : 'Tạo'} ${Promo.TYPE_LABEL[type].toLowerCase()}`;
    $('#prBody').dataset.type = type;
    $('#prBody').innerHTML = `
      <div class="row g-3">
        <div class="col-12"><label class="form-label" for="fName">Tên chương trình *</label><input class="form-control" id="fName" maxlength="100" value="${Utils.escape(p.name || '')}"></div>
        <div class="col-md-6"><label class="form-label" for="fStart">Bắt đầu *</label><input type="datetime-local" class="form-control" id="fStart" value="${Admin.toLocalInput(p.start)}"></div>
        <div class="col-md-6"><label class="form-label" for="fEnd">Kết thúc *</label><input type="datetime-local" class="form-control" id="fEnd" value="${Admin.toLocalInput(p.end)}"></div>
        ${type === 'coupon' ? `
          <div class="col-md-4"><label class="form-label" for="fCode">Mã *</label><input class="form-control text-uppercase" id="fCode" maxlength="20" value="${p.code || ''}"></div>
          ${discountFields(p)}
          <div class="col-md-4"><label class="form-label" for="fMin">Đơn tối thiểu (₫)</label><input type="number" class="form-control" id="fMin" min="0" step="1000" value="${p.minOrder || 0}"></div>
          <div class="col-md-4"><label class="form-label" for="fLimit">Tổng lượt dùng</label><input type="number" class="form-control" id="fLimit" min="0" value="${p.usageLimit || ''}" placeholder="Không giới hạn"></div>
          <div class="col-md-4"><label class="form-label" for="fPerUser">Lượt / khách</label><input type="number" class="form-control" id="fPerUser" min="0" value="${p.perUser || 1}"></div>` : ''}
        ${type === 'discount' ? discountFields(p) + scopeFields(p.scope) : ''}
        ${type === 'gift' ? `
          <div class="col-12"><label class="form-label" for="fGift">Quà tặng *</label><input class="form-control" id="fGift" maxlength="100" value="${Utils.escape(p.gift || '')}" placeholder="Ví dụ: Dây da bò Ý trị giá 450.000₫"></div>
          ${scopeFields(p.scope)}
          <div class="col-md-6"><label class="form-label" for="fMin">Đơn tối thiểu (₫)</label><input type="number" class="form-control" id="fMin" min="0" step="1000" value="${p.minOrder || 0}"></div>
          <div class="col-md-6"><label class="form-label" for="fMinItem">Giá sản phẩm tối thiểu (₫)</label><input type="number" class="form-control" id="fMinItem" min="0" step="1000" value="${p.minItemPrice || 0}"></div>
          <div class="col-12"><div class="form-label">Miễn phí dịch vụ</div>
            <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="fFreeEngrave" ${(p.freeServices || []).includes('engrave') ? 'checked' : ''}><label class="form-check-label" for="fFreeEngrave">Khắc tên</label></div>
            <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="fFreeWrap" ${(p.freeServices || []).includes('giftWrap') ? 'checked' : ''}><label class="form-check-label" for="fFreeWrap">Gói quà</label></div></div>` : ''}
        ${type === 'flashsale' ? `<div class="col-12"><div class="form-label">Sản phẩm flash sale *</div><div id="flashBox">${flashTable()}</div></div>` : ''}
        <div class="col-12"><label class="form-label" for="fDesc">Mô tả hiển thị cho khách</label><input class="form-control" id="fDesc" maxlength="160" value="${Utils.escape(p.description || '')}"></div>
        <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="fActive" ${p.active ? 'checked' : ''}><label class="form-check-label" for="fActive">Kích hoạt</label></div></div>
      </div>`;
    Admin.modal('prModal').modal.show();
  }

  function readFlashRows() {
    $$('#flashBox tbody tr').forEach(tr => {
      const r = flashRows[+tr.dataset.i];
      r.productId = $('.js-fs-p', tr).value;
      r.salePrice = +$('.js-fs-price', tr).value;
      r.quota = +$('.js-fs-quota', tr).value;
    });
  }

  function save(e) {
    e.preventDefault();
    const form = $('#prForm');
    Utils.clearInvalid(form);
    const type = $('#prBody').dataset.type;
    let ok = true;
    const fail = (id, m) => { Utils.setInvalid($('#' + id), m); ok = false; };
    const v = id => $('#' + id) ? $('#' + id).value.trim() : '';
    const num = id => v(id) === '' ? null : +v(id);
    if (v('fName').length < 3) fail('fName', 'Tên tối thiểu 3 ký tự.');
    if (!v('fStart')) fail('fStart', 'Chọn thời gian bắt đầu.');
    if (!v('fEnd') || new Date(v('fEnd')) <= new Date(v('fStart'))) fail('fEnd', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
    const data = { name: v('fName'), start: Admin.fromLocalInput(v('fStart') || Date.now()), end: Admin.fromLocalInput(v('fEnd') || Date.now()), description: v('fDesc'), active: $('#fActive').checked, type };

    if (type === 'discount' || type === 'coupon') {
      const val = num('fValue');
      if (!(val > 0)) fail('fValue', 'Mức giảm phải lớn hơn 0.');
      else if (v('fDType') === 'percent' && val > 90) fail('fValue', 'Phần trăm giảm tối đa 90%.');
      Object.assign(data, { discountType: v('fDType'), value: val, maxDiscount: num('fMax') || null });
    }
    if (type === 'discount' || type === 'gift') {
      const st = v('fScopeType');
      const ids = st === 'all' ? [] : $$('#fScopeIds option:checked').map(o => o.value);
      if (st !== 'all' && !ids.length) fail('fScopeIds', 'Chọn ít nhất 1 mục áp dụng.');
      data.scope = { type: st, ids };
    }
    if (type === 'coupon') {
      const code = v('fCode').toUpperCase();
      if (!/^[A-Z0-9]{4,20}$/.test(code)) fail('fCode', 'Mã gồm 4–20 chữ cái/số, không dấu.');
      else if (Promo.all().some(p => p.type === 'coupon' && p.code === code && p.id !== editing)) fail('fCode', 'Mã đã tồn tại.');
      Object.assign(data, { code, minOrder: num('fMin') || 0, usageLimit: num('fLimit') || 0, perUser: num('fPerUser') || 0 });
    }
    if (type === 'gift') {
      if (v('fGift').length < 3) fail('fGift', 'Nhập nội dung quà tặng.');
      Object.assign(data, { gift: v('fGift'), minOrder: num('fMin') || 0, minItemPrice: num('fMinItem') || 0,
        freeServices: [$('#fFreeEngrave').checked && 'engrave', $('#fFreeWrap').checked && 'giftWrap'].filter(Boolean) });
    }
    if (type === 'flashsale') {
      readFlashRows();
      const ids = flashRows.map(r => r.productId);
      if (!flashRows.length) { Utils.toast('Thêm ít nhất 1 sản phẩm flash sale.', 'warning'); ok = false; }
      else if (new Set(ids).size !== ids.length) { Utils.toast('Một sản phẩm chỉ xuất hiện 1 lần trong flash sale.', 'warning'); ok = false; }
      flashRows.forEach((r, i) => {
        const p = Catalog.product(r.productId);
        const tr = $(`#flashBox tbody tr[data-i="${i}"]`);
        if (!(r.salePrice > 0) || r.salePrice >= (p.salePrice || p.price)) { Utils.setInvalid($('.js-fs-price', tr), 'Thấp hơn giá bán'); ok = false; }
        if (!(r.quota > 0) || r.quota < (r.sold || 0)) { Utils.setInvalid($('.js-fs-quota', tr), '≥ đã bán'); ok = false; }
      });
      data.items = flashRows.map(r => ({ productId: r.productId, salePrice: r.salePrice, quota: r.quota, sold: r.sold || 0 }));
    }
    if (!ok) return;
    if (editing) DB.update('promotions', editing, p => Object.assign({}, p, data));
    else DB.insert('promotions', Object.assign({ id: Utils.uid('km-'), used: 0 }, data));
    Admin.modal('prModal').modal.hide();
    Utils.toast('Đã lưu chương trình khuyến mãi.');
    render();
  }

  /* ---------- Sự kiện ---------- */
  $('#typeTabs').addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (b) { state.type = b.dataset.type; render(); } });
  $('#fStatus').addEventListener('change', e => { state.status = e.target.value; render(); });
  $('#fQ').addEventListener('input', Utils.debounce(e => { state.q = e.target.value.trim(); render(); }, 250));
  if (canEdit) {
    $$('.js-new').forEach(b => b.addEventListener('click', () => openForm(b.dataset.type, null)));
    $('#prForm').addEventListener('submit', save);
    $('#prBody').addEventListener('change', e => {
      if (e.target.id === 'fScopeType') {
        const sel = $('#fScopeIds');
        sel.innerHTML = scopeOptions(e.target.value);
        sel.disabled = e.target.value === 'all';
      }
    });
    $('#prBody').addEventListener('click', e => {
      if (e.target.closest('.js-fs-add')) {
        readFlashRows();
        const used = new Set(flashRows.map(r => r.productId));
        const p = Catalog.products().find(x => !used.has(x.id));
        flashRows.push({ productId: p.id, salePrice: Math.round((p.salePrice || p.price) * 0.8 / 1000) * 1000, quota: 10, sold: 0 });
        $('#flashBox').innerHTML = flashTable();
      } else if (e.target.closest('.js-fs-del')) {
        readFlashRows();
        flashRows.splice(+e.target.closest('tr').dataset.i, 1);
        $('#flashBox').innerHTML = flashTable();
      }
    });
    $('#tbody').addEventListener('click', async e => {
      const ed = e.target.closest('.js-edit');
      if (ed) { const p = DB.find('promotions', ed.dataset.id); openForm(p.type, p); return; }
      const del = e.target.closest('.js-del');
      if (del) {
        const p = DB.find('promotions', del.dataset.id);
        if (Promo.status(p) === 'running' && !await Utils.confirm('Chương trình đang diễn ra', 'Xóa sẽ ngừng áp dụng ngay cho khách. Tiếp tục?', 'Xóa')) return;
        if (Promo.status(p) !== 'running' && !await Utils.confirm(`Xóa “${p.name}”?`, '', 'Xóa')) return;
        DB.delete('promotions', p.id);
        Utils.toast('Đã xóa chương trình.', 'info');
        render();
      }
    });
    $('#tbody').addEventListener('change', e => {
      if (!e.target.classList.contains('js-toggle')) return;
      DB.update('promotions', e.target.dataset.id, { active: e.target.checked });
      Utils.toast(e.target.checked ? 'Đã bật chương trình.' : 'Đã tạm dừng chương trình.', 'info');
      render();
    });
  }
  render();
})();
