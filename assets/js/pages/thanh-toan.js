// Trang thanh toán: địa chỉ, giao hàng, thanh toán, xác nhận đặt hàng.
(function () {
  if (!Auth.requireLogin()) return;
  const u = Auth.user();
  if (u.role !== 'customer') { location.replace('index.html'); return; }
  if (!Cart.items().length) { location.replace('gio-hang.html'); return; }
  Layout.init();

  const S = DB.settings();
  const state = Object.assign({ address: null, payment: 'cod' }, Draft.get());
  // Bản nháp cũ có thể còn lưu phương thức đã ngừng (thẻ) → quay về COD
  if (!PAYMENT_METHODS[state.payment] || PAYMENT_METHODS[state.payment].disabled) state.payment = 'cod';
  const addresses = (u.addresses || []).slice().sort((a, b) => b.isDefault - a.isDefault);
  state.address = addresses.length ? addresses[0].id : 'new';

  /* ---------- Địa chỉ ---------- */
  $('#aProvince').innerHTML += PROVINCES.map(p => `<option>${p}</option>`).join('');
  function renderAddresses() {
    $('#addressList').innerHTML = addresses.map(a => `
      <label class="option-card${state.address === a.id ? ' active' : ''}">
        <input class="form-check-input" type="radio" name="address" value="${a.id}" ${state.address === a.id ? 'checked' : ''}>
        <div><div class="fw-semibold">${Utils.escape(a.name)} · ${Utils.escape(a.phone)} ${a.isDefault ? '<span class="badge text-bg-light border ms-1">Mặc định</span>' : ''}</div>
        <div class="small text-muted-2">${Utils.escape(Address.format(a))}</div></div>
      </label>`).join('') + `
      <label class="option-card${state.address === 'new' ? ' active' : ''}">
        <input class="form-check-input" type="radio" name="address" value="new" ${state.address === 'new' ? 'checked' : ''}>
        <div class="fw-semibold"><i class="bi bi-plus-lg me-1"></i>Giao tới địa chỉ khác</div>
      </label>`;
    $('#newAddress').hidden = state.address !== 'new';
    if (state.address === 'new' && !$('#aName').value) { $('#aName').value = u.name; $('#aPhone').value = u.phone; }
  }

  /* ---------- Giao hàng & thanh toán ---------- */
  function renderShip(calc) {
    const base = calc.subtotal >= S.freeShipThreshold ? 0 : S.shipFee;
    $('#shipList').innerHTML = Object.entries(SHIPPING_METHODS).map(([k, m]) => {
      const fee = base + (k === 'express' ? S.expressFee : 0);
      return `<label class="option-card${state.shippingMethod === k ? ' active' : ''}">
        <input class="form-check-input" type="radio" name="ship" value="${k}" ${state.shippingMethod === k ? 'checked' : ''}>
        <div class="flex-grow-1"><div class="fw-semibold">${m.label}</div><div class="small text-muted-2">${m.desc}</div></div>
        <div class="fw-semibold">${fee ? Utils.formatPrice(fee) : 'Miễn phí'}</div></label>`;
    }).join('');
  }
  function renderPay() {
    $('#payList').innerHTML = Object.entries(PAYMENT_METHODS).filter(([, m]) => !m.disabled).map(([k, m]) => `
      <label class="option-card${state.payment === k ? ' active' : ''}">
        <input class="form-check-input" type="radio" name="pay" value="${k}" ${state.payment === k ? 'checked' : ''}>
        <i class="bi ${m.icon} fs-5"></i><div class="fw-semibold">${m.label}</div></label>`).join('');
    $('#bankInfo').hidden = state.payment !== 'bank';
  }

  /* ---------- Tóm tắt đơn ---------- */
  function renderSummary() {
    const calc = OrderCalc.compute(Cart.items(), { couponCode: state.coupon, shippingMethod: state.shippingMethod, userId: u.id });
    if (calc.lines.some(l => l.issue)) { location.replace('gio-hang.html'); return calc; }
    $('#summary').innerHTML = `
      <div class="summary-title d-flex justify-content-between">Đơn hàng (${calc.valid.reduce((s, l) => s + l.qty, 0)} sản phẩm) <a href="gio-hang.html" class="small fw-normal text-decoration-underline">Sửa</a></div>
      <div class="co-items">${calc.valid.map(l => {
        const s = l.item.services || {};
        const extras = [l.canEngrave && s.engrave ? `Khắc: “${Utils.escape(String(s.engrave).trim() || '…')}”` : '', s.giftWrap ? 'Gói quà' : ''].filter(Boolean);
        return `<div class="co-item">
          <div class="co-item-img"><img src="${Img.product(l.product)}" alt=""><span>${l.qty}</span></div>
          <div class="flex-grow-1 min-w-0"><div class="text-truncate small fw-medium">${Utils.escape(l.product.name)}</div>
            ${extras.length ? `<div class="small text-muted-2">${extras.join(' · ')}</div>` : ''}</div>
          <div class="small fw-semibold">${Utils.formatPrice(l.total)}</div></div>`;
      }).join('')}</div>

      <div class="coupon-form mt-3">
        <input type="text" class="form-control text-uppercase" id="coCoupon" placeholder="Mã giảm giá" value="${Utils.escape(state.coupon || '')}" aria-label="Mã giảm giá">
        <button class="btn btn-outline-dark" type="button" id="coApply">${calc.coupon.ok ? 'Đổi' : 'Áp dụng'}</button>
      </div>
      ${state.coupon && !calc.coupon.ok ? `<div class="small text-sale mt-2">${calc.coupon.error}</div>` : ''}
      ${calc.coupon.ok ? `<div class="small text-success mt-2"><i class="bi bi-check-circle me-1"></i>Đã áp dụng mã ${calc.coupon.promo.code} <button type="button" class="btn btn-link btn-sm p-0 ms-1 text-muted" id="coRemove">Bỏ mã</button></div>` : ''}

      <dl class="summary-rows">
        <div><dt>Tạm tính</dt><dd>${Utils.formatPrice(calc.originalTotal)}</dd></div>
        ${calc.productSaving ? `<div><dt>Giảm giá sản phẩm</dt><dd class="text-sale">-${Utils.formatPrice(calc.productSaving)}</dd></div>` : ''}
        ${calc.serviceFee ? `<div><dt>Dịch vụ kèm theo</dt><dd>${Utils.formatPrice(calc.serviceFee)}</dd></div>` : ''}
        <div><dt>Phí vận chuyển</dt><dd>${calc.shippingFee ? Utils.formatPrice(calc.shippingFee) : 'Miễn phí'}</dd></div>
        ${calc.couponDiscount ? `<div><dt>Mã ${calc.coupon.promo.code}</dt><dd class="text-sale">-${Utils.formatPrice(calc.couponDiscount)}</dd></div>` : ''}
        <div class="summary-total"><dt>Tổng thanh toán</dt><dd>${Utils.formatPrice(calc.total)}</dd></div>
      </dl>
      <button type="submit" class="btn btn-dark btn-lg w-100" id="placeBtn">Đặt hàng</button>
      <p class="small text-muted-2 text-center mt-2 mb-0">Bằng việc đặt hàng, bạn đồng ý với <a href="chinh-sach.html" class="text-decoration-underline">chính sách mua hàng</a> của TIMEHOUSE.</p>`;
    return calc;
  }

  function renderAll() {
    renderAddresses();
    const calc = renderSummary();
    renderShip(calc);
    renderPay();
  }

  /* ---------- Sự kiện ---------- */
  $('#checkoutForm').addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'address') { state.address = t.value; renderAddresses(); }
    else if (t.name === 'ship') { state.shippingMethod = t.value; Draft.set({ shippingMethod: t.value }); renderAll(); }
    else if (t.name === 'pay') { state.payment = t.value; renderPay(); }
  });
  $('#summary').addEventListener('click', e => {
    if (e.target.id === 'coApply') {
      state.coupon = $('#coCoupon').value.trim().toUpperCase();
      Draft.set({ coupon: state.coupon });
      renderAll();
    } else if (e.target.id === 'coRemove') {
      state.coupon = '';
      Draft.set({ coupon: '' });
      renderAll();
    }
  });
  $('#summary').addEventListener('keydown', e => {
    if (e.target.id === 'coCoupon' && e.key === 'Enter') { e.preventDefault(); $('#coApply').click(); }
  });

  function validate() {
    const form = $('#checkoutForm');
    Utils.clearInvalid(form);
    let ok = true;
    const fail = (el, msg) => { Utils.setInvalid(el, msg); if (ok) el.focus(); ok = false; };
    let shipping;
    if (state.address === 'new') {
      if ($('#aName').value.trim().length < 2) fail($('#aName'), 'Vui lòng nhập họ tên người nhận.');
      if (!Utils.isPhone($('#aPhone').value)) fail($('#aPhone'), 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');
      if (!$('#aProvince').value) fail($('#aProvince'), 'Vui lòng chọn tỉnh/thành phố.');
      if ($('#aWard').value.trim().length < 2) fail($('#aWard'), 'Vui lòng nhập phường/xã.');
      if ($('#aStreet').value.trim().length < 5) fail($('#aStreet'), 'Vui lòng nhập địa chỉ cụ thể.');
      shipping = { name: $('#aName').value.trim(), phone: $('#aPhone').value.trim(), province: $('#aProvince').value, ward: $('#aWard').value.trim(), street: $('#aStreet').value.trim() };
    } else {
      const a = addresses.find(x => x.id === state.address);
      shipping = { name: a.name, phone: a.phone, province: a.province, ward: a.ward, district: a.district, street: a.street };
    }
    // Nội dung khắc tên bắt buộc khi đã chọn dịch vụ khắc
    const blankEngrave = OrderCalc.lines(Cart.items()).find(l => l.canEngrave && l.item.services.engrave && !String(l.item.services.engrave).trim());
    if (blankEngrave) { Utils.toast(`Vui lòng nhập nội dung khắc cho “${Utils.escape(blankEngrave.product.name)}” trong giỏ hàng.`, 'warning'); ok = false; }

    return ok ? { shipping } : null;
  }

  $('#checkoutForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = validate();
    if (!v) return;
    const btn = $('#placeBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang đặt hàng…';
    setTimeout(() => {
      const r = Orders.place({
        items: Cart.items(), shipping: v.shipping, shippingMethod: state.shippingMethod,
        paymentMethod: state.payment, couponCode: state.coupon, note: $('#note').value
      });
      if (!r.ok) {
        Utils.toast(r.error, 'error');
        btn.disabled = false;
        renderAll();
        return;
      }
      if (state.address === 'new' && $('#aSave').checked) {
        DB.update('users', u.id, user => Object.assign({}, user, {
          addresses: (user.addresses || []).concat(Object.assign({ id: Utils.uid('a'), isDefault: !(user.addresses || []).length }, v.shipping))
        }));
      }
      Cart.clear();
      Draft.clear();
      location.replace('dat-hang-thanh-cong.html?id=' + r.order.id);
    }, 500);
  });

  renderAll();
})();
