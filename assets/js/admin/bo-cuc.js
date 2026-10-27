// Khung trang quản trị: kiểm tra quyền, thanh bên, thanh trên + tiện ích dùng chung.

// Ma trận phân quyền theo trang (đã chốt trong phân tích nghiệp vụ)
const PERMS = {
  dashboard: ['staff', 'admin'],
  orders: ['staff', 'admin'],
  products: ['staff', 'admin'],
  brands: ['admin'],
  promotions: ['staff', 'admin'],   // nhân viên chỉ xem
  posts: ['staff', 'admin'],
  reviews: ['staff', 'admin'],
  contacts: ['staff', 'admin'],
  customers: ['staff', 'admin'],    // nhân viên chỉ xem
  staff: ['admin'],
  profile: ['staff', 'admin']
};
// Quyền theo hành động
const ACTIONS = {
  'report.view': ['admin'],
  'product.delete': ['admin'],
  'promotion.edit': ['admin'],
  'customer.lock': ['admin']
};

const Admin = {
  user: () => Auth.user(),
  can: action => Auth.is(...(ACTIONS[action] || PERMS[action] || [])),

  MENU: [
    ['dashboard', 'bi-speedometer2', 'Tổng quan'],
    ['orders', 'bi-receipt', 'Đơn hàng'],
    ['products', 'bi-box-seam', 'Sản phẩm'],
    ['brands', 'bi-diagram-3', 'Danh mục & thương hiệu'],
    ['promotions', 'bi-tags', 'Khuyến mãi'],
    ['reviews', 'bi-chat-square-heart', 'Đánh giá & hỏi đáp'],
    ['contacts', 'bi-envelope', 'Liên hệ'],
    ['posts', 'bi-newspaper', 'Bài viết'],
    ['customers', 'bi-people', 'Khách hàng'],
    ['staff', 'bi-person-badge', 'Nhân viên'],
    ['profile', 'bi-person-gear', 'Hồ sơ cá nhân']
  ],

  // Mã trang -> tên file
  FILES: {
    dashboard: 'tong-quan', orders: 'don-hang', products: 'san-pham', brands: 'thuong-hieu',
    promotions: 'khuyen-mai', reviews: 'danh-gia', contacts: 'lien-he', posts: 'bai-viet',
    customers: 'khach-hang', staff: 'nhan-vien', profile: 'ho-so'
  },

  badges() {
    return {
      orders: DB.all('orders').filter(o => o.status === 'pending').length,
      reviews: DB.all('reviews').filter(r => r.status === 'pending').length + DB.all('questions').filter(q => !q.answer).length,
      contacts: DB.all('contacts').filter(c => c.status === 'new').length
    };
  },

  // Khởi tạo trang. Trả về false nếu không có quyền (đã chuyển hướng).
  init(page, title) {
    if (!Auth.requireRole('staff', 'admin')) return false;
    const u = Auth.user();
    if (!PERMS[page].includes(u.role)) { location.replace(ROOT + '403.html'); return false; }
    document.title = `${title} | Quản trị TIMEHOUSE`;
    const b = Admin.badges();
    const menu = Admin.MENU.filter(([p]) => PERMS[p].includes(u.role)).map(([p, icon, label]) =>
      `<a href="${Admin.FILES[p]}.html" data-key="${p}" class="${p === page ? 'active' : ''}"><i class="bi ${icon}"></i><span>${label}</span>${b[p] ? `<em>${b[p]}</em>` : ''}</a>`).join('');
    $('#adminSide').innerHTML = `
      <div class="as-brand"><a href="tong-quan.html" class="logo text-white">TIME<span>HOUSE</span></a><span class="as-tag">${u.role === 'admin' ? 'ADMIN' : 'STAFF'}</span></div>
      <nav class="as-nav" aria-label="Menu quản trị">${menu}</nav>
      <div class="as-foot"><a href="../index.html" target="_blank" rel="noopener"><i class="bi bi-shop"></i><span>Xem cửa hàng</span></a></div>`;
    $('#adminTop').innerHTML = `
      <button class="btn btn-light d-lg-none" id="sideToggle" aria-label="Mở menu"><i class="bi bi-list"></i></button>
      <h1 class="at-title">${title}</h1>
      <div class="ms-auto d-flex align-items-center gap-2">
        <div class="dropdown">
          <button class="btn btn-light d-flex align-items-center gap-2" data-bs-toggle="dropdown" aria-expanded="false">
            <span class="avatar-sm">${Utils.escape(u.name.trim().split(' ').pop()[0])}</span>
            <span class="d-none d-sm-inline text-start lh-sm"><span class="d-block small fw-semibold">${Utils.escape(u.name)}</span><span class="d-block small text-muted">${Auth.ROLES[u.role]}</span></span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li><a class="dropdown-item" href="ho-so.html"><i class="bi bi-person-gear me-2"></i>Hồ sơ cá nhân</a></li>
            <li><a class="dropdown-item" href="../index.html" target="_blank" rel="noopener"><i class="bi bi-shop me-2"></i>Xem cửa hàng</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item" id="adminLogout"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</button></li>
          </ul>
        </div>
      </div>`;
    $('#adminLogout').addEventListener('click', () => Auth.logout());
    $('#sideToggle').addEventListener('click', () => document.body.classList.toggle('side-open'));
    $('#sideBackdrop').addEventListener('click', () => document.body.classList.remove('side-open'));
    return true;
  },

  refreshBadges() {
    const b = Admin.badges();
    $$('#adminSide .as-nav a').forEach(a => {
      const key = a.dataset.key;
      let em = a.querySelector('em');
      if (b[key]) { if (!em) { em = document.createElement('em'); a.appendChild(em); } em.textContent = b[key]; }
      else if (em) em.remove();
    });
  },

  // Modal Bootstrap dùng chung: trả về { el, modal }
  modal(id) {
    const el = document.getElementById(id);
    return { el, modal: bootstrap.Modal.getOrCreateInstance(el) };
  },

  // Thanh lọc + phân trang đơn giản cho bảng
  paginate(list, page, per = 10) {
    const pages = Math.max(1, Math.ceil(list.length / per));
    page = Math.min(Math.max(1, page), pages);
    return { rows: list.slice((page - 1) * per, page * per), page, pages, total: list.length };
  },

  pagerInfo(p, per = 10) {
    if (!p.total) return '';
    return `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
      <div class="small text-muted">Hiển thị ${(p.page - 1) * per + 1}–${Math.min(p.page * per, p.total)} / ${p.total}</div>${Utils.pagination(p.page, p.pages)}</div>`;
  },

  // Xuất CSV (mở được bằng Excel, có BOM để hiển thị tiếng Việt)
  exportCsv(filename, header, rows) {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [header].concat(rows).map(r => r.map(esc).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  // Lọc HTML do nhân viên nhập (bài viết): chỉ giữ thẻ & thuộc tính an toàn
  sanitize(html) {
    const ALLOWED = { P: [], BR: [], STRONG: [], B: [], EM: [], I: [], U: [], UL: [], OL: [], LI: [], H3: [], H4: [], BLOCKQUOTE: [], A: ['href'] };
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 1) {
          if (!ALLOWED[ch.tagName]) {
            if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(ch.tagName)) { ch.parentNode.removeChild(ch); return; }
            walk(ch);
            ch.replaceWith(...ch.childNodes);
            return;
          }
          [...ch.attributes].forEach(at => {
            const ok = ALLOWED[ch.tagName].includes(at.name) && !/^\s*javascript:/i.test(at.value);
            if (!ok) ch.removeAttribute(at.name);
          });
          if (ch.tagName === 'A') { ch.setAttribute('rel', 'noopener'); ch.setAttribute('target', '_blank'); }
          walk(ch);
        } else if (ch.nodeType !== 3) ch.parentNode.removeChild(ch);
      });
    };
    walk(doc.body.firstChild);
    return doc.body.firstChild.innerHTML;
  },

  // Chuỗi datetime-local <-> ISO
  toLocalInput(iso) {
    const d = new Date(iso);
    const pad = v => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  fromLocalInput: v => new Date(v).toISOString(),

  slug: s => Utils.normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
};
