// Danh mục & thương hiệu (chỉ admin): thêm/sửa/xóa thương hiệu; sửa danh mục cha (bộ lọc), thêm/sửa/xóa danh mục con.
(function () {
  if (!Admin.init('brands', 'Danh mục & thương hiệu')) return;
  let tab = location.hash === '#categories' ? 'categories' : 'brands';
  const count = (fn) => Catalog.products(true).filter(fn).length;

  $('#adminContent').innerHTML = `
    <div class="panel">
      <div class="status-tabs mb-3">
        <button type="button" data-tab="brands">Thương hiệu</button>
        <button type="button" data-tab="categories">Danh mục</button>
      </div>
      <div id="tabBody"></div>
    </div>`;
  $('#adminModals').innerHTML = `
    <div class="modal fade" id="bModal" tabindex="-1" aria-labelledby="bmTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <form id="bForm" novalidate class="d-contents">
        <div class="modal-header"><h5 class="modal-title" id="bmTitle">Thương hiệu</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
        <div class="modal-body">
          <div class="mb-3"><label class="form-label" for="bName">Tên thương hiệu *</label><input class="form-control" id="bName" maxlength="40"></div>
          <div class="mb-3"><label class="form-label" for="bCountry">Quốc gia *</label><input class="form-control" id="bCountry" maxlength="40" list="countryList">
            <datalist id="countryList">${[...new Set(Catalog.brands().map(b => b.country))].map(c => `<option value="${c}">`).join('')}</datalist></div>
          <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="bFeatured"><label class="form-check-label" for="bFeatured">Hiển thị ở "Thương hiệu nổi bật"</label></div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Hủy</button><button class="btn btn-dark" type="submit">Lưu</button></div>
      </form></div></div></div>
    <div class="modal fade" id="cModal" tabindex="-1" aria-labelledby="cmTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content">
      <form id="cForm" novalidate class="d-contents">
        <div class="modal-header"><h5 class="modal-title" id="cmTitle">Danh mục</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-8"><label class="form-label" for="cName">Tên danh mục *</label><input class="form-control" id="cName" maxlength="60"></div>
            <div class="col-md-4"><label class="form-label" for="cOrder">Thứ tự</label><input type="number" class="form-control" id="cOrder" min="1"></div>
            <div class="col-12 js-parent-only"><label class="form-label" for="cShort">Tên ngắn (menu)</label><input class="form-control" id="cShort" maxlength="30"></div>
            <div class="col-12 js-parent-only"><label class="form-label" for="cDesc">Mô tả</label><textarea class="form-control" id="cDesc" rows="2" maxlength="200"></textarea></div>
            <div class="col-12 js-parent-only"><div class="form-label">Ảnh đại diện <span class="small text-muted fw-normal">(hiện ở "Mua sắm theo danh mục" trên trang chủ – nên dùng ảnh vuông)</span></div>
              <div class="d-flex align-items-center gap-3">
                <div class="cat-thumb" id="cImg"></div>
                <div class="d-flex flex-column gap-2">
                  <label class="btn btn-sm btn-outline-dark mb-0" for="cFile"><i class="bi bi-upload me-1"></i>Tải ảnh</label>
                  <input type="file" id="cFile" accept="image/*" hidden>
                  <button type="button" class="btn btn-sm btn-light" id="cNoImg">Bỏ ảnh</button>
                </div>
              </div>
              <div class="small text-muted mt-1">Chưa có ảnh → trang chủ tự lấy ảnh sản phẩm bán chạy nhất của danh mục.</div></div>
            <div class="col-12 js-parent-only"><div class="form-label">Bộ lọc riêng trên trang danh sách</div>
              <div class="d-flex flex-wrap gap-3" id="cFilters">${Object.entries(FILTER_DEFS).filter(([k]) => !COMMON_FILTERS.includes(k)).map(([k, v]) =>
                `<div class="form-check"><input class="form-check-input" type="checkbox" value="${k}" id="cf-${k}"><label class="form-check-label small" for="cf-${k}">${v.label}</label></div>`).join('')}</div>
              <div class="small text-muted mt-1">Luôn có sẵn: ${COMMON_FILTERS.map(k => FILTER_DEFS[k].label).join(', ')}, thương hiệu, giá, đánh giá.</div></div>
          </div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Hủy</button><button class="btn btn-dark" type="submit">Lưu</button></div>
      </form></div></div></div>`;

  /* ---------- Thương hiệu ---------- */
  let editingBrand = null;
  function renderBrands() {
    const list = Catalog.brands().slice().sort((a, b) => a.name.localeCompare(b.name));
    $('#tabBody').innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3"><div class="text-muted small">${list.length} thương hiệu</div>
        <button class="btn btn-dark js-add-brand"><i class="bi bi-plus-lg me-1"></i>Thêm thương hiệu</button></div>
      <div class="table-responsive"><table class="table admin-table align-middle"><thead><tr><th>Thương hiệu</th><th>Mã</th><th>Quốc gia</th><th class="text-center">Sản phẩm</th><th class="text-center">Nổi bật</th><th></th></tr></thead>
      <tbody>${list.map(b => `<tr><td class="fw-semibold">${Utils.escape(b.name)}</td><td class="small text-muted">${b.id}</td><td>${Utils.escape(b.country)}</td>
        <td class="text-center"><a href="san-pham.html" class="small">${count(p => p.brandId === b.id)}</a></td>
        <td class="text-center"><div class="form-check form-switch d-inline-block"><input class="form-check-input js-feat" type="checkbox" data-id="${b.id}" ${b.featured ? 'checked' : ''} aria-label="Nổi bật"></div></td>
        <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-dark js-edit-brand" data-id="${b.id}">Sửa</button>
          <button class="btn btn-sm btn-outline-danger js-del-brand" data-id="${b.id}"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function openBrand(b) {
    editingBrand = b ? b.id : null;
    $('#bmTitle').textContent = b ? 'Sửa thương hiệu' : 'Thêm thương hiệu';
    $('#bName').value = b ? b.name : '';
    $('#bCountry').value = b ? b.country : '';
    $('#bFeatured').checked = b ? b.featured : false;
    Utils.clearInvalid($('#bForm'));
    Admin.modal('bModal').modal.show();
  }
  $('#bForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    const name = $('#bName').value.trim(), country = $('#bCountry').value.trim();
    let ok = true;
    if (name.length < 2) { Utils.setInvalid($('#bName'), 'Nhập tên thương hiệu.'); ok = false; }
    else if (Catalog.brands().some(b => b.name.toLowerCase() === name.toLowerCase() && b.id !== editingBrand)) { Utils.setInvalid($('#bName'), 'Thương hiệu đã tồn tại.'); ok = false; }
    if (country.length < 2) { Utils.setInvalid($('#bCountry'), 'Nhập quốc gia.'); ok = false; }
    if (!ok) return;
    if (editingBrand) DB.update('brands', editingBrand, { name, country, featured: $('#bFeatured').checked });
    else {
      let id = Admin.slug(name) || 'brand';
      while (Catalog.brand(id)) id += '-1';
      DB.save('brands', Catalog.brands().concat({ id, name, country, featured: $('#bFeatured').checked }));
    }
    Admin.modal('bModal').modal.hide();
    Utils.toast('Đã lưu thương hiệu.');
    renderBrands();
  });

  /* ---------- Danh mục ---------- */
  let editingCat = null, newChildOf = null, catImage = '';
  function paintCatImg() {
    $('#cImg').innerHTML = catImage ? `<img src="${catImage}" alt="Ảnh danh mục">` : '<i class="bi bi-image text-muted fs-3"></i>';
    $('#cNoImg').hidden = !catImage;
  }
  $('#cFile').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { catImage = await Utils.readImage(f, 600, 0.8); paintCatImg(); }
    catch { Utils.toast('Không đọc được tệp ảnh.', 'error'); }
    e.target.value = '';
  });
  $('#cNoImg').addEventListener('click', () => { catImage = ''; paintCatImg(); });
  function renderCategories() {
    $('#tabBody').innerHTML = `
      <div class="text-muted small mb-3">Cây danh mục 2 cấp. Danh mục cha quyết định bộ lọc trên trang danh sách; sản phẩm được gán vào danh mục con.</div>
      <div class="d-grid gap-3">${Catalog.parents().map(p => {
        const ids = Catalog.expandCategory(p.id);
        return `<div class="cat-block">
          <div class="cat-parent">
            ${p.image ? `<img src="${p.image}" alt="" class="cat-thumb-sm">` : `<i class="bi ${p.icon} fs-5"></i>`}
            <div class="flex-grow-1"><div class="fw-semibold">${p.name} <span class="small text-muted fw-normal">(${count(x => ids.includes(x.categoryId))} SP · thứ tự ${p.order})</span></div>
              <div class="small text-muted">Bộ lọc: ${p.filters.map(k => FILTER_DEFS[k].label).join(', ')}</div></div>
            <button class="btn btn-sm btn-outline-dark js-edit-cat" data-id="${p.id}">Sửa</button>
            <button class="btn btn-sm btn-dark js-add-child" data-id="${p.id}"><i class="bi bi-plus-lg"></i> Danh mục con</button>
          </div>
          <div class="cat-children">${Catalog.children(p.id).map(c => `
            <div class="cat-child"><span>${c.name} <span class="small text-muted">· ${count(x => x.categoryId === c.id)} SP</span></span>
              <span><a class="btn btn-sm btn-light" href="../san-pham.html?cat=${c.id}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i></a>
              <button class="btn btn-sm btn-light js-edit-cat" data-id="${c.id}" title="Sửa"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-light text-danger js-del-cat" data-id="${c.id}" title="Xóa"><i class="bi bi-trash"></i></button></span></div>`).join('')}</div>
        </div>`;
      }).join('')}</div>`;
  }
  function openCat(c, parentId = null) {
    editingCat = c ? c.id : null;
    newChildOf = parentId;
    const isParent = c ? !c.parentId : false;
    $('#cmTitle').textContent = c ? `Sửa danh mục${isParent ? ' cha' : ''}` : `Thêm danh mục con – ${Catalog.category(parentId).name}`;
    $('#cName').value = c ? c.name : '';
    $('#cOrder').value = c ? c.order : Catalog.children(parentId).length + 1;
    $$('.js-parent-only').forEach(el => el.hidden = !isParent);
    if (isParent) {
      $('#cShort').value = c.short || '';
      $('#cDesc').value = c.desc || '';
      $$('#cFilters input').forEach(i => i.checked = c.filters.includes(i.value));
      catImage = c.image || '';
      paintCatImg();
    }
    Utils.clearInvalid($('#cForm'));
    Admin.modal('cModal').modal.show();
  }
  $('#cForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    const name = $('#cName').value.trim();
    if (name.length < 2) { Utils.setInvalid($('#cName'), 'Nhập tên danh mục.'); return; }
    const order = +$('#cOrder').value || 1;
    if (editingCat) {
      const c = Catalog.category(editingCat);
      const patch = { name, order };
      if (!c.parentId) {
        const filters = $$('#cFilters input:checked').map(i => i.value);
        if (!filters.length) { Utils.toast('Chọn ít nhất 1 bộ lọc riêng.', 'warning'); return; }
        Object.assign(patch, { short: $('#cShort').value.trim() || name, desc: $('#cDesc').value.trim(), filters, image: catImage || null });
      }
      try { DB.update('categories', editingCat, patch); }
      catch { Utils.toast('Ảnh quá lớn, trình duyệt không đủ dung lượng lưu. Hãy dùng ảnh nhỏ hơn.', 'error'); return; }
    } else {
      let id = Admin.slug(name);
      while (Catalog.category(id)) id += '-1';
      DB.save('categories', DB.all('categories').concat({ id, name, parentId: newChildOf, order }));
    }
    Admin.modal('cModal').modal.hide();
    Utils.toast('Đã lưu danh mục.');
    renderCategories();
  });

  /* ---------- Sự kiện ---------- */
  function show(t) {
    tab = t;
    history.replaceState(null, '', '#' + t);
    $$('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    t === 'brands' ? renderBrands() : renderCategories();
  }
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
  $('#tabBody').addEventListener('change', e => {
    if (e.target.classList.contains('js-feat')) {
      DB.update('brands', e.target.dataset.id, { featured: e.target.checked });
      Utils.toast('Đã cập nhật.');
    }
  });
  $('#tabBody').addEventListener('click', async e => {
    const btn = sel => e.target.closest(sel);
    if (btn('.js-add-brand')) openBrand(null);
    else if (btn('.js-edit-brand')) openBrand(Catalog.brand(btn('.js-edit-brand').dataset.id));
    else if (btn('.js-del-brand')) {
      const id = btn('.js-del-brand').dataset.id;
      const n = count(p => p.brandId === id);
      if (n) { Utils.toast(`Không thể xóa: còn ${n} sản phẩm thuộc thương hiệu này.`, 'warning'); return; }
      if (!await Utils.confirm('Xóa thương hiệu?', Catalog.brand(id).name, 'Xóa')) return;
      DB.delete('brands', id);
      renderBrands();
    } else if (btn('.js-edit-cat')) openCat(Catalog.category(btn('.js-edit-cat').dataset.id));
    else if (btn('.js-add-child')) openCat(null, btn('.js-add-child').dataset.id);
    else if (btn('.js-del-cat')) {
      const id = btn('.js-del-cat').dataset.id;
      const n = count(p => p.categoryId === id);
      if (n) { Utils.toast(`Không thể xóa: còn ${n} sản phẩm trong danh mục. Hãy chuyển sản phẩm sang danh mục khác trước.`, 'warning'); return; }
      if (!await Utils.confirm('Xóa danh mục?', Catalog.category(id).name, 'Xóa')) return;
      DB.delete('categories', id);
      renderCategories();
    }
  });
  show(tab);
})();
