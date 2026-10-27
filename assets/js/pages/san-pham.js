// Trang danh sách sản phẩm: lọc theo danh mục / thương hiệu / giá / thuộc tính, sắp xếp, phân trang.
// Toàn bộ trạng thái lọc nằm trên URL để có thể chia sẻ link.
(function () {
  const PER_PAGE = 12;
  const PRICE_PRESETS = [
    [0, 1000000, 'Dưới 1 triệu'], [1000000, 3000000, '1 – 3 triệu'], [3000000, 5000000, '3 – 5 triệu'],
    [5000000, 10000000, '5 – 10 triệu'], [10000000, 20000000, '10 – 20 triệu'], [20000000, 0, 'Trên 20 triệu']
  ];

  /* ---------- Trạng thái <-> URL ---------- */
  function readState() {
    const sp = new URLSearchParams(location.search);
    const specs = {};
    for (const [k, v] of sp) if (k.startsWith('f_')) (specs[k.slice(2)] = specs[k.slice(2)] || []).push(v);
    return {
      cat: sp.get('cat') || '', q: sp.get('q') || '', promo: sp.get('promo') || '',
      brand: sp.getAll('brand'), specs,
      min: +sp.get('min') || 0, max: +sp.get('max') || 0,
      rating: +sp.get('rating') || 0, sale: sp.get('sale') === '1',
      sort: sp.get('sort') || '', page: Math.max(1, +sp.get('page') || 1), view: sp.get('view') || ''
    };
  }
  function writeState(push = true) {
    const sp = new URLSearchParams();
    ['cat', 'q', 'promo', 'view'].forEach(k => state[k] && sp.set(k, state[k]));
    state.brand.forEach(b => sp.append('brand', b));
    Object.entries(state.specs).forEach(([k, vs]) => vs.forEach(v => sp.append('f_' + k, v)));
    if (state.min) sp.set('min', state.min);
    if (state.max) sp.set('max', state.max);
    if (state.rating) sp.set('rating', state.rating);
    if (state.sale) sp.set('sale', '1');
    if (state.sort) sp.set('sort', state.sort);
    if (state.page > 1) sp.set('page', state.page);
    const url = location.pathname + (sp.toString() ? '?' + sp : '');
    push ? history.pushState(null, '', url) : history.replaceState(null, '', url);
  }

  let state = readState();
  // Mã danh mục không tồn tại (link cũ/sai) → hiển thị tất cả sản phẩm
  if (state.cat && !Catalog.category(state.cat)) { state.cat = ''; writeState(false); }
  const cat = state.cat ? Catalog.category(state.cat) : null;
  const parent = cat ? Catalog.parentOf(cat.id) : null;
  Layout.init({ active: state.view === 'brands' ? 'brands' : state.promo ? 'promotions' : parent ? parent.id : '' });

  /* ---------- Tiêu đề, breadcrumb, danh mục con ---------- */
  function renderHead() {
    const crumbs = [['index.html', 'Trang chủ']];
    let title = 'Tất cả sản phẩm', desc = '';
    const promo = state.promo ? DB.find('promotions', state.promo) : null;
    const brand = state.brand.length === 1 ? Catalog.brand(state.brand[0]) : null;
    if (state.view === 'brands') { title = 'Thương hiệu'; desc = 'Các thương hiệu đồng hồ chính hãng đang phân phối tại TIMEHOUSE.'; }
    else if (promo) {
      title = promo.name;
      const st = Promo.status(promo);
      desc = promo.description + (st !== 'running' ? ` (${Promo.STATUS_LABEL[st]})` : ` · Đến ${Utils.formatDate(promo.end, true)}`);
      crumbs.push(['khuyen-mai.html', 'Khuyến mãi']);
    } else if (state.q) { title = `Kết quả tìm kiếm “${state.q}”`; }
    else if (cat) {
      if (cat.parentId) crumbs.push([Catalog.catUrl(parent.id), parent.name]);
      title = cat.name; desc = parent.desc;
    } else if (brand) { title = 'Đồng hồ ' + brand.name; desc = `Thương hiệu ${brand.country}.`; }
    crumbs.push([null, title]);
    $('#breadcrumb').innerHTML = crumbs.map(([h, l]) => h ? `<li class="breadcrumb-item"><a href="${h}">${Utils.escape(l)}</a></li>` : `<li class="breadcrumb-item active" aria-current="page">${Utils.escape(l)}</li>`).join('');
    $('#pageTitle').textContent = title;
    $('#pageDesc').textContent = desc;
    document.title = `${title} | TIMEHOUSE`;

    const kids = parent ? Catalog.children(parent.id) : [];
    $('#subCats').innerHTML = kids.length && !state.q ? [`<a href="${Catalog.catUrl(parent.id)}" class="${cat.id === parent.id ? 'active' : ''}">Tất cả</a>`]
      .concat(kids.map(k => `<a href="${Catalog.catUrl(k.id)}" class="${k.id === cat.id ? 'active' : ''}">${k.name}</a>`)).join('') : '';
  }

  /* ---------- Trang thương hiệu ---------- */
  function renderBrands() {
    $('#listView').hidden = true;
    $('#brandView').hidden = false;
    const products = Catalog.products();
    $('#brandGrid').innerHTML = Catalog.brands().map(b => {
      const n = products.filter(p => p.brandId === b.id).length;
      return `<div class="col-6 col-md-4 col-lg-3"><a href="san-pham.html?brand=${b.id}" class="brand-tile">
        <span class="brand-name">${Utils.escape(b.name)}</span><span class="small text-muted-2">${b.country} · ${n} sản phẩm</span></a></div>`;
    }).join('');
  }

  /* ---------- Bộ lọc ---------- */
  const valueSort = (a, b) => {
    const na = parseFloat(a), nb = parseFloat(b);
    return !isNaN(na) && !isNaN(nb) ? na - nb : String(a).localeCompare(String(b), 'vi');
  };

  function section(id, title, body, open = true) {
    return `<div class="filter-section">
      <button class="filter-head${open ? '' : ' collapsed'}" data-bs-toggle="collapse" data-bs-target="#fs-${id}" aria-expanded="${open}">${title}<i class="bi bi-chevron-down"></i></button>
      <div class="collapse${open ? ' show' : ''}" id="fs-${id}"><div class="filter-body">${body}</div></div></div>`;
  }
  function checkList(name, items, selected) {
    const MAX = 6;
    const html = items.map(([value, label, count], i) => `
      <label class="filter-check${i >= MAX ? ' extra' : ''}"${i >= MAX ? ' hidden' : ''}>
        <input class="form-check-input" type="checkbox" data-filter="${name}" value="${Utils.escape(value)}" ${selected.includes(value) ? 'checked' : ''}>
        <span>${Utils.escape(label)}</span><em>${count}</em></label>`).join('');
    return html + (items.length > MAX ? `<button type="button" class="btn btn-link btn-sm p-0 js-more">Xem thêm ${items.length - MAX}</button>` : '');
  }

  function renderFilters(base) {
    let html = '';
    // Danh mục
    if (!cat) {
      html += section('cat', 'Danh mục', Catalog.parents().map(p => {
        const ids = Catalog.expandCategory(p.id);
        const n = base.filter(x => ids.includes(x.categoryId)).length;
        return n ? `<a class="filter-link" href="#" data-cat="${p.id}">${p.name}<em>${n}</em></a>` : '';
      }).join(''));
    }
    // Giá
    const priceBody = PRICE_PRESETS.map(([a, b, l]) => `
      <label class="filter-check"><input class="form-check-input" type="radio" name="price" data-min="${a}" data-max="${b}" ${state.min === a && state.max === b && (a || b) ? 'checked' : ''}><span>${l}</span></label>`).join('') + `
      <div class="d-flex gap-2 align-items-center mt-2">
        <input type="number" class="form-control form-control-sm" id="minPrice" placeholder="Từ" min="0" step="100000" value="${state.min || ''}" aria-label="Giá từ">
        <span>–</span>
        <input type="number" class="form-control form-control-sm" id="maxPrice" placeholder="Đến" min="0" step="100000" value="${state.max || ''}" aria-label="Giá đến">
      </div>
      <button class="btn btn-dark btn-sm w-100 mt-2" id="applyPrice">Áp dụng</button>`;
    html += section('price', 'Khoảng giá', priceBody);
    // Thương hiệu
    const brandCount = {};
    base.forEach(p => brandCount[p.brandId] = (brandCount[p.brandId] || 0) + 1);
    const brands = Object.keys(brandCount).map(id => [id, Catalog.brand(id).name, brandCount[id]]).sort((a, b) => b[2] - a[2]);
    html += section('brand', 'Thương hiệu', checkList('brand', brands, state.brand));
    // Thuộc tính theo danh mục
    Catalog.filtersFor(state.cat).forEach((key, i) => {
      const count = {};
      base.forEach(p => [].concat(p.specs[key] ?? []).forEach(v => count[v] = (count[v] || 0) + 1));
      const items = Object.keys(count).sort(valueSort).map(v => [v, v, count[v]]);
      if (items.length < 2 && !(state.specs[key] || []).length) return;
      html += section('s-' + key, FILTER_DEFS[key].label, checkList('spec:' + key, items, state.specs[key] || []), i < 3 || !!(state.specs[key] || []).length);
    });
    // Đánh giá & khuyến mãi
    html += section('rating', 'Đánh giá', [4, 3].map(r => `
      <label class="filter-check"><input class="form-check-input" type="radio" name="rating" value="${r}" ${state.rating === r ? 'checked' : ''}>
      <span>${Reviews.stars(r)} trở lên</span></label>`).join(''));
    html += `<div class="filter-section border-0"><div class="form-check form-switch py-3">
      <input class="form-check-input" type="checkbox" role="switch" id="saleOnly" ${state.sale ? 'checked' : ''}>
      <label class="form-check-label fw-medium" for="saleOnly">Chỉ hiện sản phẩm đang giảm giá</label></div></div>`;
    $('#filters').innerHTML = html;
  }

  /* ---------- Chip bộ lọc đang áp dụng ---------- */
  function renderActive() {
    const chips = [];
    state.brand.forEach(b => chips.push(['brand', b, Catalog.brand(b)?.name || b]));
    Object.entries(state.specs).forEach(([k, vs]) => vs.forEach(v => chips.push(['spec:' + k, v, `${FILTER_DEFS[k]?.label || k}: ${v}`])));
    if (state.min || state.max) chips.push(['price', '', `Giá: ${state.min ? Utils.formatPrice(state.min) : '0₫'} – ${state.max ? Utils.formatPrice(state.max) : '∞'}`]);
    if (state.rating) chips.push(['rating', '', `Từ ${state.rating} sao`]);
    if (state.sale) chips.push(['sale', '', 'Đang giảm giá']);
    $('#activeFilters').innerHTML = chips.length ? chips.map(([t, v, l]) =>
      `<button class="filter-chip" data-type="${t}" data-value="${Utils.escape(v)}">${Utils.escape(l)} <i class="bi bi-x"></i></button>`).join('') +
      '<button class="btn btn-link btn-sm text-dark js-clear-all">Xóa tất cả</button>' : '';
    const n = chips.length;
    $$('.js-filter-badge').forEach(b => { b.textContent = n; b.hidden = !n; });
  }

  /* ---------- Danh sách ---------- */
  function render(scroll = false) {
    renderHead();
    if (state.view === 'brands') { renderBrands(); return; }
    const base = Catalog.query({ cat: state.cat, q: state.q, promo: state.promo });
    const list = Catalog.query({
      cat: state.cat, q: state.q, promo: state.promo, brand: state.brand.length ? state.brand : null,
      specs: state.specs, min: state.min, max: state.max, rating: state.rating, onSale: state.sale,
      sort: state.sort || (state.promo ? 'discount' : 'bestseller')
    });
    renderFilters(base);
    renderActive();
    $$('.js-count').forEach(e => e.textContent = list.length);
    $('#sortSelect').value = state.sort;

    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    $('#productGrid').innerHTML = slice.length ? slice.map(productCard).join('') : `
      <div class="empty-state" style="grid-column:1/-1"><i class="bi bi-search"></i>
        <div class="fw-semibold text-dark mb-1">Không tìm thấy sản phẩm phù hợp</div>
        <div class="mb-3">Hãy thử bỏ bớt bộ lọc hoặc tìm với từ khóa khác.</div>
        <button class="btn btn-outline-dark js-clear-all">Xóa bộ lọc</button></div>`;
    $('#pagination').innerHTML = Utils.pagination(state.page, pages);
    if (scroll) $('#listView').scrollIntoView({ behavior: 'smooth' });
  }

  function update(mutator, { scroll = false } = {}) {
    mutator(state);
    if (!scroll) state.page = 1;
    writeState();
    render(scroll);
  }

  /* ---------- Kiểu hiển thị lưới / danh sách ---------- */
  function setView(v) {
    $('#productGrid').classList.toggle('list-view', v === 'list');
    $$('.view-toggle button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    DB.set('listView', v);
  }
  setView(DB.get('listView', 'grid'));
  $$('.view-toggle button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

  /* ---------- Sự kiện ---------- */
  $('#sortSelect').addEventListener('change', e => update(s => s.sort = e.target.value));

  $('#filters').addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.filter) {
      const [kind, key] = t.dataset.filter.split(':');
      update(s => {
        const arr = kind === 'brand' ? s.brand : (s.specs[key] = s.specs[key] || []);
        const i = arr.indexOf(t.value);
        t.checked ? i < 0 && arr.push(t.value) : i >= 0 && arr.splice(i, 1);
        if (kind === 'spec' && !arr.length) delete s.specs[key];
      });
    } else if (t.name === 'price') update(s => { s.min = +t.dataset.min; s.max = +t.dataset.max; });
    else if (t.name === 'rating') update(s => s.rating = +t.value);
    else if (t.id === 'saleOnly') update(s => s.sale = t.checked);
  });

  $('#filters').addEventListener('click', e => {
    const more = e.target.closest('.js-more');
    if (more) {
      $$('.extra', more.parentElement).forEach(x => x.hidden = false);
      more.remove();
      return;
    }
    const link = e.target.closest('[data-cat]');
    if (link) { e.preventDefault(); location.href = Catalog.catUrl(link.dataset.cat) + (state.q ? '&q=' + encodeURIComponent(state.q) : ''); return; }
    if (e.target.id === 'applyPrice') {
      const min = +$('#minPrice').value || 0, max = +$('#maxPrice').value || 0;
      if (max && min > max) { Utils.toast('Giá "từ" phải nhỏ hơn giá "đến".', 'warning'); return; }
      update(s => { s.min = min; s.max = max; });
    }
  });

  document.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (chip) {
      const { type, value } = chip.dataset;
      update(s => {
        if (type === 'brand') s.brand = s.brand.filter(b => b !== value);
        else if (type.startsWith('spec:')) {
          const k = type.slice(5);
          s.specs[k] = s.specs[k].filter(v => v !== value);
          if (!s.specs[k].length) delete s.specs[k];
        } else if (type === 'price') { s.min = 0; s.max = 0; }
        else if (type === 'rating') s.rating = 0;
        else if (type === 'sale') s.sale = false;
      });
      return;
    }
    if (e.target.closest('.js-clear-all')) update(s => { s.brand = []; s.specs = {}; s.min = s.max = s.rating = 0; s.sale = false; });
    const pg = e.target.closest('#pagination [data-page]');
    if (pg && !pg.closest('.disabled')) update(s => s.page = +pg.dataset.page, { scroll: true });
  });

  window.addEventListener('popstate', () => { state = readState(); render(); });

  render();
})();
