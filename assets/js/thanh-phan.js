// Header, footer, menu mobile, nút nổi – dùng chung cho mọi trang phía khách.
const Layout = (() => {
  const S = () => DB.settings();

  function accountMenu() {
    const u = Auth.user();
    if (!u) {
      return `<a href="${Auth.loginUrl()}" class="hd-icon" title="Đăng nhập"><i class="bi bi-person"></i><span class="hd-icon-label d-none d-xl-inline">Đăng nhập</span></a>`;
    }
    const internal = u.role !== 'customer';
    return `
    <div class="dropdown">
      <button class="hd-icon dropdown-toggle no-caret" data-bs-toggle="dropdown" aria-expanded="false" title="Tài khoản">
        <span class="avatar-sm">${Utils.escape(u.name.trim().split(' ').pop()[0] || 'U')}</span>
        <span class="hd-icon-label d-none d-xl-inline">${Utils.escape(u.name.split(' ').pop())}</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow-sm">
        <li class="px-3 py-2 small"><div class="fw-semibold">${Utils.escape(u.name)}</div><div class="text-muted">${Auth.ROLES[u.role]}</div></li>
        <li><hr class="dropdown-divider"></li>
        ${internal ? `<li><a class="dropdown-item" href="${ROOT}admin/tong-quan.html"><i class="bi bi-speedometer2 me-2"></i>Trang quản trị</a></li>` : `
        <li><a class="dropdown-item" href="${ROOT}tai-khoan.html"><i class="bi bi-person me-2"></i>Tài khoản của tôi</a></li>
        <li><a class="dropdown-item" href="${ROOT}tai-khoan.html#orders"><i class="bi bi-receipt me-2"></i>Đơn hàng</a></li>
        <li><a class="dropdown-item" href="${ROOT}tai-khoan.html#reviews"><i class="bi bi-star me-2"></i>Đánh giá của tôi</a></li>
        <li><a class="dropdown-item" href="${ROOT}tai-khoan.html#coupons"><i class="bi bi-ticket-perforated me-2"></i>Ví mã giảm giá</a></li>`}
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item js-logout"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</button></li>
      </ul>
    </div>`;
  }

  function megaMenu(parent) {
    const kids = Catalog.children(parent.id);
    const ids = kids.map(k => k.id);
    const products = Catalog.products().filter(p => ids.includes(p.categoryId));
    const brandIds = [...new Set(products.map(p => p.brandId))].slice(0, 8);
    const prices = products.map(p => Pricing.get(p).price);
    const maxP = Math.max(...prices, 0);
    const ranges = maxP > 10000000
      ? [[0, 2000000, 'Dưới 2 triệu'], [2000000, 5000000, '2 – 5 triệu'], [5000000, 15000000, '5 – 15 triệu'], [15000000, 0, 'Trên 15 triệu']]
      : [[0, 500000, 'Dưới 500 nghìn'], [500000, 1000000, '500 nghìn – 1 triệu'], [1000000, 3000000, '1 – 3 triệu'], [3000000, 0, 'Trên 3 triệu']];
    const hot = products.slice().sort((a, b) => b.sold - a.sold)[0];
    return `
    <div class="mega"><div class="container"><div class="row g-4 py-4">
      <div class="col-3"><div class="mega-title">Danh mục</div>
        <ul class="mega-list">${kids.map(k => `<li><a href="${Catalog.catUrl(k.id)}">${k.name}</a></li>`).join('')}
        <li><a href="${Catalog.catUrl(parent.id)}" class="fw-semibold">Xem tất cả <i class="bi bi-arrow-right"></i></a></li></ul></div>
      <div class="col-3"><div class="mega-title">Thương hiệu</div>
        <ul class="mega-list">${brandIds.map(b => `<li><a href="${ROOT}san-pham.html?cat=${parent.id}&brand=${b}">${Utils.escape(Catalog.brand(b).name)}</a></li>`).join('')}</ul></div>
      <div class="col-3"><div class="mega-title">Mức giá</div>
        <ul class="mega-list">${ranges.map(([a, b, l]) => `<li><a href="${ROOT}san-pham.html?cat=${parent.id}${a ? '&min=' + a : ''}${b ? '&max=' + b : ''}">${l}</a></li>`).join('')}</ul></div>
      <div class="col-3">${hot ? `
        <a href="${Catalog.url(hot)}" class="mega-feature">
          <img src="${Img.product(hot)}" alt="${Utils.escape(hot.name)}">
          <div class="small text-muted mt-2">Bán chạy nhất</div>
          <div class="fw-semibold text-truncate">${Utils.escape(hot.name)}</div>
        </a>` : ''}</div>
    </div></div></div>`;
  }

  function header(active) {
    const s = S();
    const parents = Catalog.parents();
    return `
    <div class="topbar d-none d-md-block"><div class="container d-flex justify-content-between align-items-center">
      <div><i class="bi bi-telephone me-1"></i>Hotline <a href="tel:${s.hotline.replace(/\s/g, '')}">${s.hotline}</a><span class="mx-3 text-white-50">|</span>${s.workingHours}</div>
      <div class="d-flex gap-4">
        <a href="${ROOT}khuyen-mai.html"><i class="bi bi-gift me-1"></i>Khuyến mãi</a>
        <a href="${ROOT}lien-he.html"><i class="bi bi-envelope me-1"></i>Liên hệ</a>
        <a href="${ROOT}tai-khoan.html#orders"><i class="bi bi-truck me-1"></i>Theo dõi đơn hàng</a>
      </div>
    </div></div>
    <header class="site-header">
      <div class="container header-main">
        <button class="hd-icon d-lg-none" data-bs-toggle="offcanvas" data-bs-target="#mobileMenu" aria-label="Mở menu"><i class="bi bi-list"></i></button>
        <a href="${ROOT}index.html" class="logo" aria-label="${s.storeName} – Trang chủ">TIME<span>HOUSE</span></a>
        <form class="hd-search d-none d-lg-flex" role="search" action="${ROOT}san-pham.html">
          <i class="bi bi-search"></i>
          <input type="search" name="q" placeholder="Tìm đồng hồ, thương hiệu, mã sản phẩm…" autocomplete="off" value="${Utils.escape(Utils.param('q') || '')}" aria-label="Tìm kiếm">
          <div class="search-suggest"></div>
        </form>
        <div class="hd-actions">
          <button class="hd-icon d-lg-none js-search-toggle" aria-label="Tìm kiếm"><i class="bi bi-search"></i></button>
          ${accountMenu()}
          <a href="${ROOT}yeu-thich.html" class="hd-icon d-none d-sm-inline-flex" title="Yêu thích"><i class="bi bi-heart"></i><span class="hd-badge js-wish-count"></span></a>
          <a href="${ROOT}gio-hang.html" class="hd-icon" title="Giỏ hàng"><i class="bi bi-bag"></i><span class="hd-badge js-cart-count"></span></a>
        </div>
      </div>
      <form class="hd-search hd-search-mobile d-lg-none container" role="search" action="${ROOT}san-pham.html" hidden>
        <i class="bi bi-search"></i>
        <input type="search" name="q" placeholder="Tìm kiếm sản phẩm…" autocomplete="off" aria-label="Tìm kiếm">
        <div class="search-suggest"></div>
      </form>
      <nav class="main-nav d-none d-lg-block" aria-label="Danh mục chính"><div class="container">
        <ul class="nav-list">
          <li class="${active === 'home' ? 'active' : ''}"><a href="${ROOT}index.html"><i class="bi bi-house-door me-1"></i>Trang chủ</a></li>
          ${parents.map(p => `<li class="has-mega${active === p.id ? ' active' : ''}"><a href="${Catalog.catUrl(p.id)}">${p.short || p.name}</a>${megaMenu(p)}</li>`).join('')}
          <li class="${active === 'brands' ? 'active' : ''}"><a href="${ROOT}san-pham.html?view=brands">Thương hiệu</a></li>
          <li class="${active === 'promotions' ? 'active' : ''}"><a href="${ROOT}khuyen-mai.html" class="text-sale">Khuyến mãi</a></li>
          <li class="${active === 'news' ? 'active' : ''}"><a href="${ROOT}tin-tuc.html">Tin tức</a></li>
        </ul>
      </div></nav>
    </header>

    <div class="offcanvas offcanvas-start" tabindex="-1" id="mobileMenu" aria-labelledby="mobileMenuLabel">
      <div class="offcanvas-header border-bottom">
        <span class="logo" id="mobileMenuLabel">TIME<span>HOUSE</span></span>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Đóng"></button>
      </div>
      <div class="offcanvas-body p-0">
        <div class="mobile-links"><a href="${ROOT}index.html" class="fw-semibold"><i class="bi bi-house-door me-2"></i>Trang chủ</a></div>
        <div class="accordion accordion-flush" id="mobileCats">
          ${parents.map(p => `
          <div class="accordion-item">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mc-${p.id}">
              <i class="bi ${p.icon} me-2"></i>${p.name}</button></h2>
            <div id="mc-${p.id}" class="accordion-collapse collapse" data-bs-parent="#mobileCats"><div class="accordion-body py-2">
              <a class="d-block py-2 fw-semibold" href="${Catalog.catUrl(p.id)}">Tất cả ${p.name.toLowerCase()}</a>
              ${Catalog.children(p.id).map(k => `<a class="d-block py-2" href="${Catalog.catUrl(k.id)}">${k.name}</a>`).join('')}
            </div></div>
          </div>`).join('')}
        </div>
        <div class="mobile-links">
          <a href="${ROOT}khuyen-mai.html"><i class="bi bi-gift me-2"></i>Khuyến mãi</a>
          <a href="${ROOT}tin-tuc.html"><i class="bi bi-newspaper me-2"></i>Tin tức</a>
          <a href="${ROOT}yeu-thich.html"><i class="bi bi-heart me-2"></i>Yêu thích</a>
          <a href="${ROOT}lien-he.html"><i class="bi bi-envelope me-2"></i>Liên hệ</a>
          <a href="tel:${s.hotline.replace(/\s/g, '')}"><i class="bi bi-telephone me-2"></i>${s.hotline}</a>
        </div>
      </div>
    </div>`;
  }

  function footer() {
    const s = S();
    return `
    <section class="commit-bar"><div class="container"><div class="row g-3">
      ${[['bi-patch-check', 'Chính hãng 100%', 'Đền gấp 10 lần nếu phát hiện hàng giả'],
         ['bi-shield-check', 'Bảo hành đến 5 năm', 'Bảo hành máy tại toàn hệ thống'],
         ['bi-arrow-repeat', 'Đổi trả 7 ngày', 'Lỗi do nhà sản xuất'],
         ['bi-truck', 'Miễn phí vận chuyển', 'Đơn từ ' + Utils.formatPrice(s.freeShipThreshold)]]
        .map(([i, t, d]) => `<div class="col-6 col-lg-3"><div class="commit-item"><i class="bi ${i}"></i><div><div class="fw-semibold">${t}</div><div class="small text-muted">${d}</div></div></div></div>`).join('')}
    </div></div></section>
    <footer class="site-footer">
      <div class="container">
        <div class="row g-4">
          <div class="col-lg-4">
            <div class="logo mb-3">TIME<span>HOUSE</span></div>
            <p class="text-muted-2">${s.slogan}. Đồng hồ đeo tay, treo tường, để bàn, đồng hồ cây và phụ kiện chính hãng.</p>
            <ul class="list-unstyled small footer-contact">
              <li><i class="bi bi-geo-alt"></i>${s.address}</li>
              <li><i class="bi bi-telephone"></i><a href="tel:${s.hotline.replace(/\s/g, '')}">${s.hotline}</a></li>
              <li><i class="bi bi-envelope"></i><a href="mailto:${s.email}">${s.email}</a></li>
              <li><i class="bi bi-clock"></i>${s.workingHours}</li>
            </ul>
          </div>
          <div class="col-6 col-lg-2">
            <div class="footer-title">Sản phẩm</div>
            <ul class="footer-links">${Catalog.parents().map(p => `<li><a href="${Catalog.catUrl(p.id)}">${p.short || p.name}</a></li>`).join('')}</ul>
          </div>
          <div class="col-6 col-lg-2">
            <div class="footer-title">Chính sách</div>
            <ul class="footer-links">
              <li><a href="${ROOT}chinh-sach.html#bao-hanh">Bảo hành</a></li>
              <li><a href="${ROOT}chinh-sach.html#doi-tra">Đổi trả</a></li>
              <li><a href="${ROOT}chinh-sach.html#van-chuyen">Vận chuyển & lắp đặt</a></li>
              <li><a href="${ROOT}chinh-sach.html#thanh-toan">Thanh toán</a></li>
              <li><a href="${ROOT}chinh-sach.html#bao-mat">Bảo mật</a></li>
              <li><a href="${ROOT}cau-hoi-thuong-gap.html">Câu hỏi thường gặp</a></li>
            </ul>
          </div>
          <div class="col-lg-4">
            <div class="footer-title">Nhận tin khuyến mãi</div>
            <p class="small text-muted-2">Đăng ký để nhận ưu đãi độc quyền và mã giảm giá cho đơn đầu tiên.</p>
            <form class="newsletter js-newsletter" novalidate>
              <input type="email" class="form-control" placeholder="Email của bạn" aria-label="Email" required>
              <button class="btn btn-light" type="submit">Đăng ký</button>
            </form>
            <div class="footer-social mt-3">
              <a href="${s.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
              <a href="${s.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
              <a href="${s.youtube}" target="_blank" rel="noopener" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
              <a href="${s.zalo}" target="_blank" rel="noopener" aria-label="Zalo" class="zalo-txt">Zalo</a>
            </div>
            <div class="mt-3 small">
              <a href="${ROOT}gioi-thieu.html" class="me-3">Giới thiệu</a><a href="${ROOT}lien-he.html">Liên hệ</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} ${s.storeName}. Đồ án website bán đồng hồ – dữ liệu minh họa.</div>
      </div>
    </footer>
    <div class="float-contact">
      <a href="tel:${s.hotline.replace(/\s/g, '')}" class="fc-btn fc-phone" aria-label="Gọi hotline"><i class="bi bi-telephone-fill"></i></a>
      <a href="${s.zalo}" target="_blank" rel="noopener" class="fc-btn fc-zalo" aria-label="Chat Zalo">Zalo</a>
      <a href="${s.messenger}" target="_blank" rel="noopener" class="fc-btn fc-mess" aria-label="Messenger"><i class="bi bi-messenger"></i></a>
      <button class="fc-btn fc-top js-top" aria-label="Lên đầu trang"><i class="bi bi-arrow-up"></i></button>
    </div>`;
  }

  function updateBadges() {
    const set = (sel, n) => $$(sel).forEach(el => { el.textContent = n > 99 ? '99+' : n; el.hidden = !n; });
    set('.js-cart-count', Cart.count());
    set('.js-wish-count', Wishlist.ids().length);
  }

  function bindSearch(form) {
    const input = $('input', form);
    const box = $('.search-suggest', form);
    const render = Utils.debounce(() => {
      const q = input.value.trim();
      const list = Catalog.suggest(q);
      if (!q || q.length < 2) { box.classList.remove('show'); return; }
      box.innerHTML = list.length ? list.map(p => {
        const pr = Pricing.get(p);
        return `<a href="${Catalog.url(p)}" class="suggest-item">
          <img src="${Img.product(p)}" alt=""><div class="flex-grow-1 min-w-0"><div class="text-truncate">${Utils.escape(p.name)}</div>
          <div class="small"><span class="fw-semibold">${Utils.formatPrice(pr.price)}</span>${pr.percent ? ` <span class="price-old">${Utils.formatPrice(pr.original)}</span>` : ''}</div></div></a>`;
      }).join('') + `<a href="${ROOT}san-pham.html?q=${encodeURIComponent(q)}" class="suggest-all">Xem tất cả kết quả cho “${Utils.escape(q)}”</a>`
        : `<div class="p-3 small text-muted">Không tìm thấy sản phẩm phù hợp.</div>`;
      box.classList.add('show');
    }, 180);
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    document.addEventListener('click', e => { if (!form.contains(e.target)) box.classList.remove('show'); });
    form.addEventListener('submit', e => { if (!input.value.trim()) e.preventDefault(); });
  }

  function bind() {
    $$('.hd-search').forEach(bindSearch);
    const mob = $('.hd-search-mobile');
    $('.js-search-toggle')?.addEventListener('click', () => { mob.hidden = !mob.hidden; if (!mob.hidden) $('input', mob).focus(); });
    $$('.js-logout').forEach(b => b.addEventListener('click', () => Auth.logout()));
    const top = $('.js-top');
    top?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => top?.classList.toggle('show', window.scrollY > 500), { passive: true });
    $('.js-newsletter')?.addEventListener('submit', e => {
      e.preventDefault();
      const inp = $('input', e.target);
      if (!Utils.isEmail(inp.value)) { Utils.toast('Email không hợp lệ.', 'error'); return; }
      inp.value = '';
      Utils.toast('Đăng ký thành công! Mã <strong>WELCOME50</strong> đã được gửi tới email của bạn.');
    });
    ['th:cart', 'th:wishlist'].forEach(ev => document.addEventListener(ev, updateBadges));
    updateBadges();
  }

  return {
    // active: id danh mục cha hoặc 'promotions' | 'news' | 'brands'
    init({ active = '', title } = {}) {
      const h = $('#site-header'), f = $('#site-footer');
      if (h) h.outerHTML = header(active);
      if (f) f.outerHTML = footer();
      if (title) document.title = `${title} | ${S().storeName}`;
      bind();
    },
    updateBadges
  };
})();
