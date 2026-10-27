// Trang đặt hàng thành công: mã đơn, hướng dẫn thanh toán (QR chuyển khoản), tóm tắt đơn.
(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  const u = Auth.user();
  const o = DB.find('orders', Utils.param('id'));
  const root = $('#successRoot');
  if (!o || o.userId !== u.id) {
    root.innerHTML = `<div class="empty-state"><i class="bi bi-receipt"></i><div class="fw-semibold text-dark mb-2">Không tìm thấy đơn hàng</div>
      <a href="tai-khoan.html#orders" class="btn btn-dark">Xem đơn hàng của tôi</a></div>`;
    return;
  }
  const S = DB.settings();
  const transferNote = `TIMEHOUSE ${o.id}`;
  const needTransfer = o.paymentMethod === 'bank' && o.paymentStatus !== 'paid';

  root.innerHTML = `
  <div class="success-wrap">
    <div class="text-center">
      <div class="success-icon"><i class="bi bi-check-lg"></i></div>
      <h1 class="page-title mt-3">Đặt hàng thành công!</h1>
      <p class="text-muted-2">Cảm ơn ${Utils.escape(u.name)} đã mua sắm tại TIMEHOUSE. Chúng tôi sẽ liên hệ xác nhận đơn trong thời gian sớm nhất.</p>
      <div class="order-code">Mã đơn hàng <strong>${o.id}</strong>
        <button class="btn btn-link btn-sm p-0 ms-1 text-dark" id="copyId" title="Sao chép mã đơn" aria-label="Sao chép mã đơn"><i class="bi bi-copy"></i></button></div>
    </div>

    ${needTransfer ? `
    <div class="transfer-box">
      <div id="qr" class="qr" aria-label="Mã QR chuyển khoản"></div>
      <div>
        <div class="fw-semibold mb-2">Quét mã QR hoặc chuyển khoản theo thông tin:</div>
        <dl class="transfer-info">
          <div><dt>Ngân hàng</dt><dd>${S.bank.name}</dd></div>
          <div><dt>Số tài khoản</dt><dd>${S.bank.account}</dd></div>
          <div><dt>Chủ tài khoản</dt><dd>${S.bank.owner}</dd></div>
          <div><dt>Số tiền</dt><dd class="fw-bold">${Utils.formatPrice(o.total)}</dd></div>
          <div><dt>Nội dung</dt><dd class="fw-bold">${transferNote}</dd></div>
        </dl>
        <div class="small text-muted-2">Đơn hàng được xác nhận sau khi cửa hàng nhận được thanh toán (mô phỏng).</div>
      </div>
    </div>` : ''}
    ${o.paymentMethod === 'card' ? `<div class="alert alert-success small mt-4 mb-0"><i class="bi bi-credit-card me-1"></i>Đã thanh toán ${Utils.formatPrice(o.total)} bằng thẻ ${o.card.brand} •••• ${o.card.last4}.</div>` : ''}

    <div class="row g-4 mt-1">
      <div class="col-md-6">
        <div class="info-card h-100">
          <div class="summary-title">Thông tin nhận hàng</div>
          <div class="fw-semibold">${Utils.escape(o.shipping.name)} · ${Utils.escape(o.shipping.phone)}</div>
          <div class="small text-muted-2">${Utils.escape(Address.format(o.shipping))}</div>
          <hr>
          <div class="small"><span class="text-muted-2">Giao hàng:</span> ${SHIPPING_METHODS[o.shippingMethod].label} (${SHIPPING_METHODS[o.shippingMethod].desc})</div>
          <div class="small"><span class="text-muted-2">Thanh toán:</span> ${PAYMENT_METHODS[o.paymentMethod].label} – ${Orders.PAYMENT_STATUS[o.paymentStatus]}</div>
          <div class="small"><span class="text-muted-2">Trạng thái:</span> ${Orders.badge(o.status)}</div>
          ${o.note ? `<div class="small mt-1"><span class="text-muted-2">Ghi chú:</span> ${Utils.escape(o.note)}</div>` : ''}
        </div>
      </div>
      <div class="col-md-6">
        <div class="info-card h-100">
          <div class="summary-title">Sản phẩm</div>
          <div class="co-items">${o.items.map(it => {
            const p = Catalog.product(it.productId);
            const extras = [it.services.engrave ? `Khắc: “${Utils.escape(it.services.engrave)}”` : '', it.services.giftWrap ? 'Gói quà' : '', it.services.install ? 'Lắp đặt' : ''].filter(Boolean);
            return `<div class="co-item"><div class="co-item-img">${p ? `<img src="${Img.product(p)}" alt="">` : ''}<span>${it.qty}</span></div>
              <div class="flex-grow-1 min-w-0"><div class="small fw-medium text-truncate">${Utils.escape(it.name)}</div>${extras.length ? `<div class="small text-muted-2">${extras.join(' · ')}</div>` : ''}</div>
              <div class="small fw-semibold">${Utils.formatPrice(it.price * it.qty)}</div></div>`;
          }).join('')}</div>
          ${o.gifts.length ? `<div class="small mt-2"><i class="bi bi-gift me-1"></i>Quà tặng: ${o.gifts.map(Utils.escape).join('; ')}</div>` : ''}
          <dl class="summary-rows mb-0">
            <div><dt>Tạm tính</dt><dd>${Utils.formatPrice(o.subtotal)}</dd></div>
            ${o.serviceFee ? `<div><dt>Dịch vụ</dt><dd>${Utils.formatPrice(o.serviceFee)}</dd></div>` : ''}
            <div><dt>Vận chuyển</dt><dd>${o.shippingFee ? Utils.formatPrice(o.shippingFee) : 'Miễn phí'}</dd></div>
            ${o.couponDiscount ? `<div><dt>Mã ${o.couponCode}</dt><dd class="text-sale">-${Utils.formatPrice(o.couponDiscount)}</dd></div>` : ''}
            <div class="summary-total"><dt>Tổng cộng</dt><dd>${Utils.formatPrice(o.total)}</dd></div>
          </dl>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-center gap-2 mt-4 flex-wrap">
      <a href="tai-khoan.html#orders" class="btn btn-dark">Theo dõi đơn hàng</a>
      <a href="san-pham.html" class="btn btn-outline-dark">Tiếp tục mua sắm</a>
    </div>
  </div>`;

  if (needTransfer) {
    const box = $('#qr');
    if (window.QRCode) new QRCode(box, { text: `${S.bank.name}|${S.bank.account.replace(/\s/g, '')}|${o.total}|${transferNote}`, width: 168, height: 168 });
    else box.innerHTML = '<div class="small text-muted-2 p-3">Không tải được mã QR – vui lòng chuyển khoản theo thông tin bên cạnh.</div>';
  }
  $('#copyId').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(o.id); Utils.toast('Đã sao chép mã đơn hàng.'); } catch { Utils.toast('Mã đơn: ' + o.id, 'info'); }
  });
})();
