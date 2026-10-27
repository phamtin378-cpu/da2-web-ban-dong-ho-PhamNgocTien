// Quản lý sản phẩm: lọc, thêm/sửa (thông số theo danh mục, ảnh), cập nhật tồn kho nhanh, ẩn/hiện, xóa (admin).
(function () {
  if (!Admin.init('products', 'Sản phẩm')) return;
  const fp = Utils.formatPrice;
  const PER = 12;
  const LOW = 5;
  const ARRAY_KEYS = ['features', 'room', 'functions'];
  const canDelete = Admin.can('product.delete');
  const state = { q: '', cat: '', brand: '', stock: Utils.param('stock') || '', status: Utils.param('status') || '', sort: 'newest', page: 1 };
  const form = { id: null, images: [] };

  const catOptions = (selected = '', onlyChildren = false) => Catalog.parents().map(p =>
    onlyChildren
      ? `<optgroup label="${p.name}">${Catalog.children(p.id).map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>`
      : `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${p.name}</option>${Catalog.children(p.id).map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>— ${c.name}</option>`).join('')}`).join('');
  const brandOptions = (selected = '') => Catalog.brands().map(b => `<option value="${b.id}" ${b.id === selected ? 'selected' : ''}>${Utils.escape(b.name)}</option>`).join('');

  $('#adminContent').innerHTML = `
    <div class="panel">
      <div class="filter-bar">
        <div class="position-relative flex-grow-1" style="min-width:220px"><i class="bi bi-search fb-icon"></i>
          <input type="search" class="form-control ps-5" id="fQ" placeholder="Tên, mã SKU…" aria-label="Tìm sản phẩm"></div>
        <select class="form-select" id="fCat" aria-label="Danh mục" style="max-width:220px"><option value="">Mọi danh mục</option>${catOptions()}</select>
        <select class="form-select" id="fBrand" aria-label="Thương hiệu" style="max-width:180px"><option value="">Mọi thương hiệu</option>${brandOptions()}</select>
        <select class="form-select" id="fStock" aria-label="Tồn kho" style="max-width:160px">
          <option value="">Mọi tồn kho</option><option value="in">Còn hàng</option><option value="low">Sắp hết / hết (≤ ${LOW})</option><option value="out">Hết hàng</option></select>
        <select class="form-select" id="fStatus" aria-label="Trạng thái" style="max-width:150px"><option value="">Mọi trạng thái</option><option value="active">Đang bán</option><option value="hidden">Đang ẩn</option></select>
        <select class="form-select" id="fSort" aria-label="Sắp xếp" style="max-width:170px">
          <option value="newest">Mới nhất</option><option value="name">Tên A–Z</option><option value="stock">Tồn kho tăng</option><option value="sold">Bán chạy</option><option value="price">Giá tăng</option></select>
        <button class="btn btn-dark" id="addBtn"><i class="bi bi-plus-lg me-1"></i>Thêm sản phẩm</button>
      </div>
      <div class="table-responsive"><table class="table admin-table align-middle">
        <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th class="text-end">Giá bán</th><th class="text-center" style="width:120px">Tồn kho</th><th class="text-center">Đã bán</th><th class="text-center">Hiển thị</th><th></th></tr></thead>
        <tbody id="tbody"></tbody></table></div>
      <div id="pager"></div>
    </div>`;
  $('#fStock').value = state.stock;
  $('#fStatus').value = state.status;

  $('#adminModals').innerHTML = `
    <div class="modal fade" id="pModal" tabindex="-1" aria-labelledby="pmTitle" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable"><div class="modal-content">
        <form id="pForm" novalidate class="d-contents">
        <div class="modal-header"><h5 class="modal-title" id="pmTitle">Thêm sản phẩm</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
        <div class="modal-body">
          <div class="row g-4">
            <div class="col-lg-7">
              <div class="row g-3">
                <div class="col-12"><label class="form-label" for="pName">Tên sản phẩm *</label><input class="form-control" id="pName" maxlength="120"></div>
                <div class="col-md-4"><label class="form-label" for="pSku">Mã SKU *</label><input class="form-control text-uppercase" id="pSku" maxlength="20"></div>
                <div class="col-md-4"><label class="form-label" for="pCat">Danh mục *</label><select class="form-select" id="pCat"><option value="">-- Chọn --</option>${catOptions('', true)}</select></div>
                <div class="col-md-4"><label class="form-label" for="pBrand">Thương hiệu *</label><select class="form-select" id="pBrand"><option value="">-- Chọn --</option>${brandOptions()}</select></div>
                <div class="col-md-4"><label class="form-label" for="pPrice">Giá gốc (₫) *</label><input type="number" class="form-control" id="pPrice" min="0" step="1000"></div>
                <div class="col-md-4"><label class="form-label" for="pSale">Giá bán thường (₫)</label><input type="number" class="form-control" id="pSale" min="0" step="1000" placeholder="Bỏ trống nếu không giảm"></div>
                <div class="col-md-4"><label class="form-label" for="pStock">Tồn kho *</label><input type="number" class="form-control" id="pStock" min="0" step="1"></div>
                <div class="col-md-4"><label class="form-label" for="pWarranty">Bảo hành (tháng)</label><input type="number" class="form-control" id="pWarranty" min="0" step="1"></div>
                <div class="col-md-8 d-flex flex-wrap gap-4 align-items-end pb-2">
                  <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="pActive"><label class="form-check-label" for="pActive">Đang bán</label></div>
                  <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="pFeatured"><label class="form-check-label" for="pFeatured">Nổi bật</label></div>
                  <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="pHeavy"><label class="form-check-label" for="pHeavy">Hàng cồng kềnh</label></div>
                </div>
                <div class="col-12"><label class="form-label" for="pDesc">Mô tả</label><textarea class="form-control" id="pDesc" rows="4" maxlength="2000"></textarea></div>
              </div>
            </div>
            <div class="col-lg-5">
              <div class="ib-title">Hình ảnh (tối đa 5)</div>
              <div class="rv-upload mb-1" id="pImages">
                <label class="rv-upload-btn" for="pFile"><i class="bi bi-image"></i><span>Tải ảnh</span></label>
                <input type="file" id="pFile" accept="image/*" multiple hidden>
              </div>
              <div class="small text-muted mb-3">Không có ảnh → hệ thống dùng ảnh minh họa tự sinh theo loại & màu sắc.</div>
              <div class="ib-title">Thông số kỹ thuật</div>
              <div class="small text-muted mb-2" id="specHint">Chọn danh mục để hiện các thông số tương ứng.</div>
              <div class="row g-2" id="specFields"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Hủy</button><button type="submit" class="btn btn-dark">Lưu sản phẩm</button></div>
        </form>
      </div></div>
    </div>`;

  /* ---------- Bảng ---------- */
  function filtered() {
    const q = Utils.normalize(state.q);
    const ids = state.cat ? Catalog.expandCategory(state.cat) : null;
    const list = Catalog.products(true).filter(p =>
      (!q || Utils.normalize(p.name + ' ' + p.sku).includes(q)) &&
      (!ids || ids.includes(p.categoryId)) &&
      (!state.brand || p.brandId === state.brand) &&
      (!state.status || p.status === state.status) &&
      (!state.stock || (state.stock === 'out' ? p.stock <= 0 : state.stock === 'low' ? p.stock <= LOW : p.stock > 0)));
    const sorters = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt), name: (a, b) => a.name.localeCompare(b.name, 'vi'),
      stock: (a, b) => a.stock - b.stock, sold: (a, b) => b.sold - a.sold, price: (a, b) => (a.salePrice || a.price) - (b.salePrice || b.price)
    };
    return list.sort(sorters[state.sort]);
  }
  function render() {
    const p = Admin.paginate(filtered(), state.page, PER);
    state.page = p.page;
    $('#tbody').innerHTML = p.rows.map(x => {
      const pr = Pricing.get(x);
      return `<tr class="${x.status === 'hidden' ? 'row-muted' : ''}">
        <td><div class="d-flex align-items-center gap-2"><img src="${Img.product(x)}" alt="" width="48" height="48" class="rounded-2 flex-none">
          <div class="min-w-0"><div class="fw-medium text-truncate" style="max-width:320px">${Utils.escape(x.name)}</div>
          <div class="small text-muted">${x.sku} · ${Utils.escape(Catalog.brand(x.brandId)?.name || '')}${x.featured ? ' · <i class="bi bi-star-fill text-warning" title="Nổi bật"></i>' : ''}${x.heavy ? ' · <i class="bi bi-truck" title="Hàng cồng kềnh"></i>' : ''}</div></div></div></td>
        <td class="small">${Catalog.parentOf(x.categoryId).short}<br><span class="text-muted">${Catalog.category(x.categoryId).name}</span></td>
        <td class="text-end"><div class="fw-semibold">${fp(pr.price)}</div>${pr.percent ? `<div class="small text-muted"><s>${fp(x.price)}</s> -${pr.percent}%</div>` : ''}</td>
        <td class="text-center"><input type="number" class="form-control form-control-sm text-center js-stock ${x.stock <= 0 ? 'is-out' : x.stock <= LOW ? 'is-low' : ''}" data-id="${x.id}" value="${x.stock}" min="0" aria-label="Tồn kho ${Utils.escape(x.name)}"></td>
        <td class="text-center">${x.sold}</td>
        <td class="text-center"><div class="form-check form-switch d-inline-block"><input class="form-check-input js-active" type="checkbox" data-id="${x.id}" ${x.status === 'active' ? 'checked' : ''} aria-label="Hiển thị"></div></td>
        <td class="text-end text-nowrap">
          <a class="btn btn-sm btn-light" href="../chi-tiet-san-pham.html?id=${x.id}" target="_blank" rel="noopener" title="Xem trên web"><i class="bi bi-box-arrow-up-right"></i></a>
          <button class="btn btn-sm btn-outline-dark js-edit" data-id="${x.id}">Sửa</button>
          ${canDelete ? `<button class="btn btn-sm btn-outline-danger js-del" data-id="${x.id}" title="Xóa"><i class="bi bi-trash"></i></button>` : ''}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center text-muted py-5">Không có sản phẩm phù hợp.</td></tr>';
    $('#pager').innerHTML = Admin.pagerInfo(p, PER);
  }

  /* ---------- Form ---------- */
  function renderSpecs(catId, specs = {}) {
    if (!catId) { $('#specFields').innerHTML = ''; $('#specHint').hidden = false; return; }
    $('#specHint').hidden = true;
    const keys = [...new Set((Catalog.parentOf(catId).id === 'deo-tay' ? ['gender'] : []).concat(Catalog.filtersFor(catId)))];
    $('#specFields').innerHTML = keys.map(k => {
      const v = specs[k] === undefined ? '' : [].concat(specs[k]).join(', ');
      // gợi ý giá trị đã có trong dữ liệu
      const opts = [...new Set(Catalog.products(true).flatMap(p => [].concat(p.specs[k] ?? [])))].slice(0, 30);
      return `<div class="col-6"><label class="form-label small mb-1" for="sp-${k}">${FILTER_DEFS[k].label}${ARRAY_KEYS.includes(k) ? ' <span class="text-muted">(cách nhau dấu phẩy)</span>' : ''}</label>
        <input class="form-control form-control-sm js-spec" id="sp-${k}" data-key="${k}" value="${Utils.escape(v)}" list="dl-${k}">
        <datalist id="dl-${k}">${opts.map(o => `<option value="${Utils.escape(o)}">`).join('')}</datalist></div>`;
    }).join('');
  }
  function paintImages() {
    $$('#pImages .rv-thumb').forEach(x => x.remove());
    $('#pImages').insertAdjacentHTML('afterbegin', form.images.map((src, i) =>
      `<div class="rv-thumb"><img src="${src}" alt=""><button type="button" data-i="${i}" aria-label="Xóa ảnh"><i class="bi bi-x"></i></button></div>`).join(''));
    $('#pImages .rv-upload-btn').hidden = form.images.length >= 5;
  }
  function openForm(p) {
    form.id = p ? p.id : null;
    form.images = p ? (p.images || []).slice() : [];
    $('#pmTitle').textContent = p ? `Sửa: ${p.name}` : 'Thêm sản phẩm';
    $('#pName').value = p ? p.name : '';
    $('#pSku').value = p ? p.sku : 'TH' + (1000 + DB.all('products').length + 1);
    $('#pCat').value = p ? p.categoryId : '';
    $('#pBrand').value = p ? p.brandId : '';
    $('#pPrice').value = p ? p.price : '';
    $('#pSale').value = p && p.salePrice ? p.salePrice : '';
    $('#pStock').value = p ? p.stock : 0;
    $('#pWarranty').value = p ? p.warranty : 12;
    $('#pActive').checked = p ? p.status === 'active' : true;
    $('#pFeatured').checked = p ? !!p.featured : false;
    $('#pHeavy').checked = p ? !!p.heavy : false;
    $('#pDesc').value = p ? p.description : '';
    Utils.clearInvalid($('#pForm'));
    renderSpecs(p ? p.categoryId : '', p ? p.specs : {});
    paintImages();
    Admin.modal('pModal').modal.show();
  }

  $('#pCat').addEventListener('change', e => {
    const current = {};
    $$('.js-spec').forEach(i => { if (i.value.trim()) current[i.dataset.key] = i.value.trim(); });
    renderSpecs(e.target.value, current);
    const parent = e.target.value && Catalog.parentOf(e.target.value).id;
    if (parent === 'dong-ho-cay' || e.target.value === 'treo-tuong-qua-lac' || e.target.value === 'treo-tuong-tranh') $('#pHeavy').checked = true;
  });
  $('#pFile').addEventListener('change', async e => {
    const files = Array.from(e.target.files).slice(0, 5 - form.images.length);
    for (const f of files) { try { form.images.push(await Utils.readImage(f, 1000, 0.82)); } catch { Utils.toast('Không đọc được ' + Utils.escape(f.name), 'error'); } }
    e.target.value = '';
    paintImages();
  });
  $('#pImages').addEventListener('click', e => { const b = e.target.closest('.rv-thumb button'); if (b) { form.images.splice(+b.dataset.i, 1); paintImages(); } });

  $('#pForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    let ok = true;
    const fail = (id, m) => { Utils.setInvalid($('#' + id), m); ok = false; };
    const name = $('#pName').value.trim(), sku = $('#pSku').value.trim().toUpperCase();
    const price = +$('#pPrice').value, sale = $('#pSale').value === '' ? null : +$('#pSale').value, stock = $('#pStock').value === '' ? NaN : +$('#pStock').value;
    if (name.length < 3) fail('pName', 'Tên tối thiểu 3 ký tự.');
    if (!/^[A-Z0-9-]{3,20}$/.test(sku)) fail('pSku', 'SKU gồm 3–20 ký tự chữ, số hoặc dấu gạch ngang.');
    else if (DB.all('products').some(p => p.sku.toUpperCase() === sku && p.id !== form.id)) fail('pSku', 'SKU đã tồn tại.');
    if (!$('#pCat').value) fail('pCat', 'Chọn danh mục.');
    if (!$('#pBrand').value) fail('pBrand', 'Chọn thương hiệu.');
    if (!(price > 0)) fail('pPrice', 'Giá gốc phải lớn hơn 0.');
    if (sale !== null && !(sale > 0 && sale < price)) fail('pSale', 'Giá bán phải lớn hơn 0 và nhỏ hơn giá gốc.');
    if (!Number.isInteger(stock) || stock < 0) fail('pStock', 'Tồn kho là số nguyên ≥ 0.');
    if (!ok) { $('.is-invalid', e.target)?.focus(); return; }

    const specs = {};
    $$('.js-spec').forEach(i => {
      const v = i.value.trim();
      if (v) specs[i.dataset.key] = ARRAY_KEYS.includes(i.dataset.key) ? v.split(',').map(s => s.trim()).filter(Boolean) : v;
    });
    const data = {
      name, sku, categoryId: $('#pCat').value, brandId: $('#pBrand').value, price, salePrice: sale, stock,
      warranty: +$('#pWarranty').value || 0, status: $('#pActive').checked ? 'active' : 'hidden',
      featured: $('#pFeatured').checked, heavy: $('#pHeavy').checked, description: $('#pDesc').value.trim(),
      images: form.images, specs
    };
    try {
      if (form.id) {
        DB.update('products', form.id, p => Object.assign({}, p, data, { look: { kind: p.look.kind } }));
      } else {
        const ids = DB.all('products').map(p => +p.id.slice(1)).filter(n => !isNaN(n));
        const sub = $('#pCat').value;
        // Kiểu ảnh minh họa lấy theo sản phẩm cùng danh mục
        const sibling = DB.all('products').find(p => p.categoryId === sub);
        DB.insert('products', Object.assign({
          id: 'p' + String(Math.max(0, ...ids) + 1).padStart(3, '0'), sold: 0, createdAt: new Date().toISOString(),
          look: { kind: sibling ? sibling.look.kind : 'wrist' }
        }, data));
      }
    } catch {
      Utils.toast('Không lưu được – dung lượng ảnh quá lớn. Hãy dùng ít ảnh hơn.', 'error');
      return;
    }
    Admin.modal('pModal').modal.hide();
    Utils.toast(form.id ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm mới.');
    render();
  });

  /* ---------- Sự kiện bảng ---------- */
  const bindFilter = (id, key, ev = 'change') => $('#' + id).addEventListener(ev, e => { state[key] = e.target.value.trim(); state.page = 1; render(); });
  $('#fQ').addEventListener('input', Utils.debounce(e => { state.q = e.target.value.trim(); state.page = 1; render(); }, 250));
  bindFilter('fCat', 'cat'); bindFilter('fBrand', 'brand'); bindFilter('fStock', 'stock'); bindFilter('fStatus', 'status'); bindFilter('fSort', 'sort');
  $('#addBtn').addEventListener('click', () => openForm(null));
  $('#pager').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.closest('.disabled')) { state.page = +b.dataset.page; render(); } });
  $('#tbody').addEventListener('change', e => {
    const t = e.target;
    if (t.classList.contains('js-stock')) {
      const v = Math.floor(+t.value);
      if (!(v >= 0)) { t.value = Catalog.product(t.dataset.id).stock; Utils.toast('Tồn kho phải là số ≥ 0.', 'warning'); return; }
      DB.update('products', t.dataset.id, { stock: v });
      Utils.toast(`Đã cập nhật tồn kho: ${v}.`);
      render();
    } else if (t.classList.contains('js-active')) {
      DB.update('products', t.dataset.id, { status: t.checked ? 'active' : 'hidden' });
      Utils.toast(t.checked ? 'Sản phẩm đã hiển thị trên cửa hàng.' : 'Đã ẩn sản phẩm khỏi cửa hàng.', 'info');
      render();
    }
  });
  $('#tbody').addEventListener('click', async e => {
    const edit = e.target.closest('.js-edit');
    if (edit) { openForm(Catalog.product(edit.dataset.id)); return; }
    const del = e.target.closest('.js-del');
    if (del && canDelete) {
      const p = Catalog.product(del.dataset.id);
      const active = DB.all('orders').some(o => ['pending', 'confirmed', 'shipping'].includes(o.status) && o.items.some(i => i.productId === p.id));
      if (active) { Utils.toast('Sản phẩm đang có trong đơn chưa hoàn tất – hãy ẩn thay vì xóa.', 'warning'); return; }
      if (!await Utils.confirm(`Xóa “${p.name}”?`, 'Sản phẩm sẽ bị xóa vĩnh viễn (lịch sử đơn hàng vẫn giữ tên sản phẩm).', 'Xóa')) return;
      DB.delete('products', p.id);
      Utils.toast('Đã xóa sản phẩm.', 'info');
      render();
    }
  });

  render();
})();
