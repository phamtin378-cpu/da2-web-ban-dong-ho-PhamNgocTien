// Trang giỏ hàng: số lượng, dịch vụ kèm theo, mã giảm giá, quà tặng, tạm tính.
Layout.init();

(function () {
  const root = $('#cartRoot');
  const S = DB.settings();
  const u = Auth.user();

  if (!u) {
    root.innerHTML = `<div class="empty-state"><i class="bi bi-bag"></i>
      <div class="fw-semibold text-dark mb-1">Vui lòng đăng nhập để xem giỏ hàng</div>
      <div class="mb-3">Giỏ hàng được lưu theo tài khoản để bạn tiếp tục mua sắm trên mọi thiết bị.</div>
      <a href="${Auth.loginUrl()}" class="btn btn-dark">Đăng nhập</a> <a href="dang-ky.html" class="btn btn-outline-dark ms-2">Đăng ký</a></div>`;
    return;
  }
  if (u.role !== 'customer') {
    root.innerHTML = `<div class="empty-state"><i class="bi bi-person-badge"></i>
      <div class="fw-semibold text-dark mb-1">Tài khoản nội bộ không có giỏ hàng</div>
      <a href="admin/tong-quan.html" class="btn btn-dark mt-2">Về trang quản trị</a></div>`;
    return;
  }

  let couponMsg = '';

  function serviceRow(l) {
    const s = l.item.services || {};
    const id = l.product.id;
    return `
      <div class="cart-services">
        ${l.canEngrave ? `
        <div class="form-check">
          <input class="form-check-input js-svc" type="checkbox" id="eg-${id}" data-svc="engrave" ${s.engrave ? 'checked' : ''}>
          <label class="form-check-label" for="eg-${id}">Khắc tên <span class="text-muted-2">+${Utils.formatPrice(S.engraveFee)}/sp</span></label>
        </div>
        <input type="text" class="form-control form-control-sm js-engrave mt-1 mb-2" maxlength="20" placeholder="Nội dung khắc (tối đa 20 ký tự)"
          value="${Utils.escape(typeof s.engrave === 'string' ? s.engrave : '')}" ${s.engrave ? '' : 'hidden'} aria-label="Nội dung khắc">` : ''}
        <div class="form-check">
          <input class="form-check-input js-svc" type="checkbox" id="gw-${id}" data-svc="giftWrap" ${s.giftWrap ? 'checked' : ''}>
          <label class="form-check-label" for="gw-${id}">Gói quà kèm thiệp <span class="text-muted-2">+${Utils.formatPrice(S.giftWrapFee)}/sp</span></label>
        </div>
        ${l.canInstall ? `
        <div class="form-check">
          <input class="form-check-input js-svc" type="checkbox" id="in-${id}" data-svc="install" ${s.install ? 'checked' : ''}>
          <label class="form-check-label" for="in-${id}">Lắp đặt & cân chỉnh tại nhà <span class="text-muted-2">+${Utils.formatPrice(S.installFee)}/sp</span></label>
        </div>` : ''}
      </div>`;
  }

  function lineHtml(l) {
    const p = l.product;
    const pr = l.price;
    return `
    <div class="cart-line${l.issue ? ' has-issue' : ''}" data-id="${p.id}">
      <a href="${Catalog.url(p)}" class="cart-img"><img src="${Img.product(p)}" alt="${Utils.escape(p.name)}"></a>
      <div class="cart-info">
        <div class="pc-brand">${Utils.escape(Catalog.brand(p.brandId).name)}</div>
        <a href="${Catalog.url(p)}" class="cart-name">${Utils.escape(p.name)}</a>
        <div class="small mt-1">
          <span class="fw-semibold">${Utils.formatPrice(pr.price)}</span>
          ${pr.percent ? `<span class="price-old ms-1">${Utils.formatPrice(pr.original)}</span>` : ''}
          ${pr.source === 'flash' ? '<span class="badge-tag tag-flash ms-1"><i class="bi bi-lightning-charge-fill"></i> Flash sale</span>' : ''}
          ${pr.source === 'promo' ? `<span class="small text-muted-2 ms-1">· ${Utils.escape(pr.promo.name)}</span>` : ''}
        </div>
        ${l.flashNote ? `<div class="cart-note"><i class="bi bi-info-circle"></i> ${l.flashNote}</div>` : ''}
        ${l.issue ? `<div class="cart-issue"><i class="bi bi-exclamation-triangle"></i> ${l.issue}</div>` : ''}
        ${!l.issue ? serviceRow(l) : ''}
      </div>
      <div class="cart-qty">
        ${p.stock > 0 && p.status === 'active' ? `
        <div class="qty-input sm" role="group" aria-label="Số lượng">
          <button type="button" class="js-dec" aria-label="Giảm"><i class="bi bi-dash"></i></button>
          <input type="number" class="js-qty" value="${l.qty}" min="1" max="${p.stock}" aria-label="Số lượng">
          <button type="button" class="js-inc" aria-label="Tăng" ${l.qty >= p.stock ? 'disabled' : ''}><i class="bi bi-plus"></i></button>
        </div>` : ''}
      </div>
      <div class="cart-total">${l.issue ? '' : Utils.formatPrice(l.total)}</div>
      <button class="cart-remove js-remove" title="Xóa" aria-label="Xóa ${Utils.escape(p.name)}"><i class="bi bi-x-lg"></i></button>
    </div>`;
  }

  function couponList(calc) {
    const draft = Draft.get();
    return availableCoupons(Auth.user()).map(({ promo: c, saved, status }) => {
      const check = OrderCalc.checkCoupon(c.code, calc.subtotal, u.id);
      const applied = draft.coupon === c.code && calc.coupon.ok;
      return `<div class="ticket${check.ok ? '' : ' disabled'}${applied ? ' applied' : ''}">
        <div class="ticket-left">${c.discountType === 'percent' ? c.value + '%' : Math.round(c.value / 1000) + 'K'}</div>
        <div class="ticket-body">
          <div class="fw-semibold">${c.code} ${saved ? '<span class="badge text-bg-light border ms-1">Đã lưu</span>' : ''}</div>
          <div class="small text-muted-2">${Utils.escape(c.description)}</div>
          <div class="small text-muted-2">HSD: ${Utils.formatDate(c.end)}${status !== 'running' ? ' · ' + Promo.STATUS_LABEL[status] : ''}</div>
          ${!check.ok && check.error ? `<div class="small text-sale">${check.error}</div>` : ''}
        </div>
        <button class="btn btn-sm ${applied ? 'btn-outline-dark' : 'btn-dark'} js-use-coupon" data-code="${c.code}" ${check.ok || applied ? '' : 'disabled'}>${applied ? 'Bỏ' : 'Dùng'}</button>
      </div>`;
    }).join('') || '<div class="small text-muted-2">Chưa có mã giảm giá khả dụng.</div>';
  }

  function render() {
    const items = Cart.items();
    const draft = Draft.get();
    $('#cartCount').textContent = items.length ? `(${Cart.count()} sản phẩm)` : '';
    if (!items.length) {
      root.innerHTML = `<div class="empty-state"><i class="bi bi-bag"></i>
        <div class="fw-semibold text-dark mb-1">Giỏ hàng của bạn đang trống</div>
        <div class="mb-3">Khám phá hàng trăm mẫu đồng hồ chính hãng đang chờ bạn.</div>
        <a href="san-pham.html" class="btn btn-dark">Tiếp tục mua sắm</a></div>`;
      return;
    }
    const calc = OrderCalc.compute(items, { couponCode: draft.coupon, userId: u.id });
    // Mã đã chọn trước đó nay không còn hợp lệ (vd: giảm số lượng dưới mức tối thiểu) → báo lỗi nhưng giữ mã
    const couponError = draft.coupon && !calc.coupon.ok ? calc.coupon.error : '';
    const hasIssue = calc.lines.some(l => l.issue);
    const pct = Math.min(100, Math.round(calc.subtotal / S.freeShipThreshold * 100));
    const sv = calc.services;

    root.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="cart-head d-none d-md-grid"><span>Sản phẩm</span><span>Số lượng</span><span class="text-end">Thành tiền</span><span></span></div>
        <div id="cartLines">${calc.lines.map(lineHtml).join('')}</div>
        <div class="d-flex justify-content-between mt-3">
          <a href="san-pham.html" class="btn btn-link text-dark px-0"><i class="bi bi-arrow-left me-1"></i>Tiếp tục mua sắm</a>
          <button class="btn btn-link text-muted px-0 js-clear">Xóa toàn bộ giỏ hàng</button>
        </div>
      </div>
      <div class="col-lg-4">
        <aside class="summary-card">
          ${calc.freeShipLeft > 0 ? `
          <div class="ship-progress">
            <div class="small">Mua thêm <strong>${Utils.formatPrice(calc.freeShipLeft)}</strong> để được miễn phí vận chuyển</div>
            <div class="bar"><div style="width:${pct}%"></div></div>
          </div>` : '<div class="ship-progress small"><i class="bi bi-truck me-1"></i>Đơn hàng được <strong>miễn phí vận chuyển</strong> tiêu chuẩn.</div>'}

          <div class="summary-title">Mã giảm giá</div>
          <form class="coupon-form" id="couponForm" novalidate>
            <input type="text" class="form-control text-uppercase" id="couponInput" placeholder="Nhập mã giảm giá" value="${Utils.escape(draft.coupon)}" aria-label="Mã giảm giá">
            <button class="btn btn-dark" type="submit">Áp dụng</button>
          </form>
          <div class="small mt-2 ${couponError || couponMsg ? '' : 'd-none'} ${couponError ? 'text-sale' : 'text-success'}" id="couponMsg">${couponError || couponMsg}</div>
          <button class="btn btn-link btn-sm px-0 text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#couponWallet" aria-expanded="false">
            <i class="bi bi-ticket-perforated me-1"></i>Chọn mã từ ví của bạn</button>
          <div class="collapse" id="couponWallet"><div class="coupon-wallet">${couponList(calc)}</div></div>

          ${calc.gifts.length ? `<div class="gift-box"><div class="fw-semibold mb-1"><i class="bi bi-gift me-1"></i>Quà tặng kèm đơn hàng</div>
            <ul class="mb-0">${calc.gifts.map(g => `<li>${Utils.escape(g.gift)}</li>`).join('')}</ul></div>` : ''}

          <dl class="summary-rows">
            <div><dt>Tạm tính (${calc.valid.reduce((s, l) => s + l.qty, 0)} sản phẩm)</dt><dd>${Utils.formatPrice(calc.originalTotal)}</dd></div>
            ${calc.productSaving ? `<div><dt>Giảm giá sản phẩm</dt><dd class="text-sale">-${Utils.formatPrice(calc.productSaving)}</dd></div>` : ''}
            ${sv.engrave ? `<div><dt>Khắc tên</dt><dd>${sv.engraveFree ? `<s class="text-muted-2 me-1">${Utils.formatPrice(sv.engrave)}</s>Miễn phí` : Utils.formatPrice(sv.engrave)}</dd></div>` : ''}
            ${sv.giftWrap ? `<div><dt>Gói quà</dt><dd>${sv.giftWrapFree ? `<s class="text-muted-2 me-1">${Utils.formatPrice(sv.giftWrap)}</s>Miễn phí` : Utils.formatPrice(sv.giftWrap)}</dd></div>` : ''}
            ${sv.install ? `<div><dt>Lắp đặt tại nhà</dt><dd>${Utils.formatPrice(sv.install)}</dd></div>` : ''}
            <div><dt>Phí vận chuyển <span class="text-muted-2">(tạm tính)</span></dt><dd>${calc.shippingFee ? Utils.formatPrice(calc.shippingFee) : 'Miễn phí'}</dd></div>
            ${calc.heavy ? `<div class="small text-muted-2 d-block">Đã gồm phụ phí hàng cồng kềnh ${Utils.formatPrice(S.heavyShipFee)}</div>` : ''}
            ${calc.couponDiscount ? `<div><dt>Mã ${calc.coupon.promo.code}</dt><dd class="text-sale">-${Utils.formatPrice(calc.couponDiscount)}</dd></div>` : ''}
            <div class="summary-total"><dt>Tổng cộng</dt><dd>${Utils.formatPrice(calc.total)}</dd></div>
          </dl>
          ${calc.productSaving + calc.couponDiscount > 0 ? `<div class="small text-success text-end mb-3">Bạn tiết kiệm được ${Utils.formatPrice(calc.productSaving + calc.couponDiscount)}</div>` : ''}
          ${hasIssue ? '<div class="alert alert-warning small py-2">Vui lòng xóa hoặc điều chỉnh sản phẩm không hợp lệ trước khi thanh toán.</div>' : ''}
          <a href="thanh-toan.html" class="btn btn-dark btn-lg w-100${hasIssue || !calc.valid.length ? ' disabled' : ''}" id="checkoutBtn">Tiến hành thanh toán</a>
          <div class="small text-muted-2 text-center mt-2"><i class="bi bi-shield-lock me-1"></i>Thanh toán an toàn & bảo mật</div>
        </aside>
      </div>
    </div>`;
  }

  /* ---------- Sự kiện ---------- */
  function applyCoupon(code) {
    code = code.trim().toUpperCase();
    if (!code) { Draft.set({ coupon: '' }); couponMsg = ''; render(); return; }
    const calc = OrderCalc.compute(Cart.items(), { userId: u.id });
    const r = OrderCalc.checkCoupon(code, calc.subtotal, u.id);
    if (!r.ok) {
      couponMsg = '';
      render();
      const m = $('#couponMsg');
      m.textContent = r.error; m.className = 'small mt-2 text-sale';
      $('#couponInput').value = code;
      return;
    }
    Draft.set({ coupon: code });
    couponMsg = `Áp dụng mã ${code} thành công – giảm ${Utils.formatPrice(r.discount)}.`;
    render();
  }

  root.addEventListener('submit', e => {
    if (e.target.id === 'couponForm') { e.preventDefault(); applyCoupon($('#couponInput').value); }
  });

  root.addEventListener('click', async e => {
    const line = e.target.closest('.cart-line');
    const id = line && line.dataset.id;
    if (e.target.closest('.js-dec') || e.target.closest('.js-inc')) {
      const input = $('.js-qty', line);
      const next = +input.value + (e.target.closest('.js-inc') ? 1 : -1);
      if (next < 1) return;
      Cart.setQty(id, next);
      render();
      return;
    }
    if (e.target.closest('.js-remove')) {
      if (!await Utils.confirm('Xóa sản phẩm khỏi giỏ hàng?', Catalog.product(id).name, 'Xóa')) return;
      Cart.remove(id);
      render();
      return;
    }
    if (e.target.closest('.js-clear')) {
      if (!await Utils.confirm('Xóa toàn bộ giỏ hàng?', '', 'Xóa hết')) return;
      Cart.clear(); Draft.set({ coupon: '' });
      render();
      return;
    }
    const use = e.target.closest('.js-use-coupon');
    if (use) {
      const isApplied = Draft.get().coupon === use.dataset.code;
      couponMsg = '';
      applyCoupon(isApplied ? '' : use.dataset.code);
      if (!isApplied) bootstrap.Collapse.getOrCreateInstance('#couponWallet', { toggle: false }).hide();
    }
  });

  root.addEventListener('change', e => {
    const line = e.target.closest('.cart-line');
    if (!line) return;
    const id = line.dataset.id;
    if (e.target.classList.contains('js-qty')) {
      const v = Math.floor(+e.target.value) || 1;
      const p = Catalog.product(id);
      if (v > p.stock) Utils.toast(`Chỉ còn ${p.stock} sản phẩm trong kho.`, 'warning');
      Cart.setQty(id, v);
      render();
    } else if (e.target.classList.contains('js-svc')) {
      const svc = e.target.dataset.svc;
      if (svc === 'engrave') {
        const text = $('.js-engrave', line);
        // Khi bật khắc tên, lưu nội dung (có thể rỗng → nhắc nhập ở bước thanh toán)
        Cart.setServices(id, { engrave: e.target.checked ? (text.value.trim() || ' ') : '' });
      } else {
        Cart.setServices(id, { [svc]: e.target.checked });
      }
      render();
      if (svc === 'engrave' && e.target.checked) $(`.cart-line[data-id="${id}"] .js-engrave`).focus();
    } else if (e.target.classList.contains('js-engrave')) {
      Cart.setServices(id, { engrave: e.target.value.trim() || ' ' });
    }
  });

  render();
})();
