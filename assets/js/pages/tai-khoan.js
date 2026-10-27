// Trang tài khoản khách hàng. Điều hướng bằng hash: #profile, #orders, #orders/<mã>, #reviews, #coupons, #addresses, #password
(function () {
  if (!Auth.requireLogin()) return;
  if (!Auth.is('customer')) { location.replace('admin/tong-quan.html'); return; }
  Layout.init();

  const view = $('#accContent');
  const me = () => Auth.user();
  const CANCEL_REASONS = ['Tôi muốn thay đổi sản phẩm / số lượng', 'Tôi muốn thay đổi địa chỉ giao hàng', 'Tìm được nơi khác giá tốt hơn', 'Thời gian giao hàng quá lâu', 'Tôi không còn nhu cầu', 'Lý do khác'];
  let orderFilter = 'all', orderSearch = '', reviewTab = 'pending';

  /* ================= Thanh bên ================= */
  function renderSide() {
    const u = me();
    $('#accAvatar').textContent = u.name.trim().split(' ').pop()[0];
    $('#accName').textContent = u.name;
    $('#accSince').textContent = 'Thành viên từ ' + Utils.formatDate(u.createdAt);
    const orders = Orders.byUser(u.id);
    const active = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
    $('#navOrders').textContent = active || '';
    const pending = toReview().length;
    $('#navReviews').textContent = pending || '';
  }

  // Sản phẩm trong đơn Hoàn thành mà khách chưa đánh giá
  function toReview() {
    const u = me();
    const reviewed = new Set(DB.all('reviews').filter(r => r.userId === u.id).map(r => r.productId));
    const map = new Map();
    Orders.byUser(u.id).filter(o => o.status === 'completed').forEach(o => o.items.forEach(it => {
      if (!reviewed.has(it.productId) && !map.has(it.productId) && Catalog.product(it.productId)) map.set(it.productId, { item: it, order: o });
    }));
    return [...map.values()];
  }

  /* ================= Hồ sơ ================= */
  function renderProfile() {
    const u = me();
    const orders = Orders.byUser(u.id);
    const spent = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
    view.innerHTML = `
      <h1 class="acc-title">Hồ sơ của tôi</h1>
      <div class="row g-3 mb-4">
        ${[['bi-receipt', orders.length, 'Đơn hàng'], ['bi-bag-check', orders.filter(o => o.status === 'completed').length, 'Đã hoàn thành'],
           ['bi-wallet2', Utils.formatPrice(spent), 'Tổng chi tiêu'], ['bi-heart', Wishlist.ids().length, 'Yêu thích']]
          .map(([i, v, l]) => `<div class="col-6 col-md-3"><div class="stat-tile"><i class="bi ${i}"></i><div class="stat-value">${v}</div><div class="small text-muted-2">${l}</div></div></div>`).join('')}
      </div>
      <form class="acc-card" id="profileForm" novalidate>
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label" for="pName">Họ và tên</label><input class="form-control" id="pName" value="${Utils.escape(u.name)}"></div>
          <div class="col-md-6"><label class="form-label" for="pEmail">Email</label><input type="email" class="form-control" id="pEmail" value="${Utils.escape(u.email)}"></div>
          <div class="col-md-6"><label class="form-label" for="pPhone">Số điện thoại</label><input type="tel" class="form-control" id="pPhone" value="${Utils.escape(u.phone)}"></div>
          <div class="col-md-6"><label class="form-label" for="pBirth">Ngày sinh</label><input type="date" class="form-control" id="pBirth" value="${u.birthday || ''}" max="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="col-12"><div class="form-label">Giới tính</div>
            ${['Nam', 'Nữ', 'Khác'].map(g => `<div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="gender" id="g-${g}" value="${g}" ${u.gender === g ? 'checked' : ''}><label class="form-check-label" for="g-${g}">${g}</label></div>`).join('')}
          </div>
        </div>
        <button class="btn btn-dark mt-4" type="submit">Lưu thay đổi</button>
      </form>`;
    $('#profileForm').addEventListener('submit', e => {
      e.preventDefault();
      Utils.clearInvalid(e.target);
      const name = $('#pName'), email = $('#pEmail'), phone = $('#pPhone');
      const others = DB.all('users').filter(x => x.id !== u.id);
      let ok = true;
      if (name.value.trim().length < 2) { Utils.setInvalid(name, 'Vui lòng nhập họ tên.'); ok = false; }
      if (!Utils.isEmail(email.value)) { Utils.setInvalid(email, 'Email không hợp lệ.'); ok = false; }
      else if (others.some(x => x.email.toLowerCase() === email.value.trim().toLowerCase())) { Utils.setInvalid(email, 'Email đã được tài khoản khác sử dụng.'); ok = false; }
      if (!Utils.isPhone(phone.value)) { Utils.setInvalid(phone, 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.'); ok = false; }
      else if (others.some(x => x.phone === phone.value.trim())) { Utils.setInvalid(phone, 'Số điện thoại đã được tài khoản khác sử dụng.'); ok = false; }
      if (!ok) return;
      DB.update('users', u.id, {
        name: name.value.trim(), email: email.value.trim(), phone: phone.value.trim(),
        birthday: $('#pBirth').value || null, gender: ($('input[name="gender"]:checked') || {}).value || null
      });
      Utils.toast('Đã cập nhật hồ sơ.');
      renderSide();
    });
  }

  /* ================= Đơn hàng ================= */
  function itemsPreview(o) {
    const shown = o.items.slice(0, 2);
    return shown.map(it => {
      const p = Catalog.product(it.productId);
      return `<div class="co-item"><div class="co-item-img">${p ? `<img src="${Img.product(p)}" alt="">` : ''}<span>${it.qty}</span></div>
        <div class="flex-grow-1 min-w-0"><div class="small fw-medium text-truncate">${Utils.escape(it.name)}</div><div class="small text-muted-2">${Utils.formatPrice(it.price)}</div></div></div>`;
    }).join('') + (o.items.length > 2 ? `<div class="small text-muted-2">và ${o.items.length - 2} sản phẩm khác</div>` : '');
  }

  function orderActions(o, detail = false) {
    const acts = [];
    if (!detail) acts.push(`<a class="btn btn-sm btn-dark" href="#orders/${o.id}">Xem chi tiết</a>`);
    if (o.status === 'pending') acts.push(`<button class="btn btn-sm btn-outline-danger js-cancel" data-id="${o.id}">Hủy đơn</button>`);
    if (o.paymentMethod === 'bank' && o.paymentStatus === 'unpaid' && o.status !== 'cancelled') acts.push(`<a class="btn btn-sm btn-outline-dark" href="dat-hang-thanh-cong.html?id=${o.id}"><i class="bi bi-qr-code me-1"></i>Thanh toán</a>`);
    if (['completed', 'cancelled'].includes(o.status)) acts.push(`<button class="btn btn-sm btn-outline-dark js-reorder" data-id="${o.id}">Mua lại</button>`);
    return acts.join('');
  }

  function renderOrders() {
    const all = Orders.byUser(me().id);
    const counts = { all: all.length };
    Object.keys(Orders.STATUS).forEach(s => counts[s] = all.filter(o => o.status === s).length);
    let list = orderFilter === 'all' ? all : all.filter(o => o.status === orderFilter);
    if (orderSearch) list = list.filter(o => o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.items.some(i => Utils.normalize(i.name).includes(Utils.normalize(orderSearch))));
    view.innerHTML = `
      <h1 class="acc-title">Đơn hàng của tôi</h1>
      <div class="order-tabs" role="tablist">
        ${[['all', 'Tất cả']].concat(Object.entries(Orders.STATUS).map(([k, v]) => [k, v.label]))
          .map(([k, l]) => `<button type="button" data-f="${k}" class="${orderFilter === k ? 'active' : ''}">${l}${counts[k] ? ` <span>${counts[k]}</span>` : ''}</button>`).join('')}
      </div>
      <div class="position-relative my-3">
        <i class="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
        <input type="search" class="form-control ps-5" id="orderSearch" placeholder="Tìm theo mã đơn hoặc tên sản phẩm" value="${Utils.escape(orderSearch)}" aria-label="Tìm đơn hàng">
      </div>
      <div id="orderList" class="d-grid gap-3">
        ${list.length ? list.map(o => `
          <article class="order-card">
            <div class="order-card-head">
              <div><strong>${o.id}</strong> <span class="text-muted-2 small ms-2">${Utils.formatDate(o.createdAt, true)}</span></div>
              ${Orders.badge(o.status)}
            </div>
            <div class="order-card-body">
              <div class="d-grid gap-2 flex-grow-1">${itemsPreview(o)}</div>
              <div class="text-end"><div class="small text-muted-2">Tổng tiền</div><div class="fw-bold fs-5">${Utils.formatPrice(o.total)}</div>
                <div class="small text-muted-2">${PAYMENT_METHODS[o.paymentMethod].label.split(' (')[0]} · ${Orders.PAYMENT_STATUS[o.paymentStatus]}</div></div>
            </div>
            <div class="order-card-foot">${orderActions(o)}</div>
          </article>`).join('') : `<div class="empty-state"><i class="bi bi-receipt"></i><div class="mb-3">Không có đơn hàng nào${orderFilter !== 'all' ? ' ở trạng thái này' : ''}.</div><a href="san-pham.html" class="btn btn-dark">Mua sắm ngay</a></div>`}
      </div>`;
    $$('.order-tabs button').forEach(b => b.addEventListener('click', () => { orderFilter = b.dataset.f; renderOrders(); }));
    $('#orderSearch').addEventListener('input', Utils.debounce(e => {
      orderSearch = e.target.value.trim();
      const pos = e.target.selectionStart;
      renderOrders();
      const inp = $('#orderSearch'); inp.focus(); inp.setSelectionRange(pos, pos);
    }, 300));
  }

  function timeline(o) {
    const at = s => { const h = o.history.filter(x => x.status === s).pop(); return h ? h.at : null; };
    const steps = o.status === 'cancelled'
      ? ['pending', 'cancelled']
      : Orders.FLOW;
    const reached = o.status === 'cancelled' ? 2 : Orders.FLOW.indexOf(o.status) + 1;
    return `<ol class="timeline">${steps.map((s, i) => {
      const t = at(s);
      return `<li class="${i < reached ? 'done' : ''}${s === 'cancelled' ? ' cancelled' : ''}">
        <span class="tl-dot"><i class="bi ${Orders.STATUS[s].icon}"></i></span>
        <span class="tl-label">${Orders.STATUS[s].label}</span>
        <span class="tl-time">${t ? Utils.formatDate(t, true) : ''}</span></li>`;
    }).join('')}</ol>`;
  }

  function renderOrderDetail(id) {
    const o = DB.find('orders', id);
    if (!o || o.userId !== me().id) { view.innerHTML = '<div class="empty-state"><i class="bi bi-receipt"></i>Không tìm thấy đơn hàng.<div class="mt-3"><a href="#orders" class="btn btn-dark">Quay lại</a></div></div>'; return; }
    const reviewed = new Set(DB.all('reviews').filter(r => r.userId === me().id).map(r => r.productId));
    const cancelNote = o.status === 'cancelled' ? o.history.filter(h => h.status === 'cancelled').pop() : null;
    view.innerHTML = `
      <a href="#orders" class="small text-muted-2"><i class="bi bi-arrow-left me-1"></i>Tất cả đơn hàng</a>
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 mb-3">
        <h1 class="acc-title mb-0">Đơn hàng ${o.id}</h1>${Orders.badge(o.status)}
      </div>
      <div class="acc-card">${timeline(o)}
        ${cancelNote ? `<div class="alert alert-secondary small mt-3 mb-0">Đã hủy bởi ${Utils.escape(cancelNote.byName)}${cancelNote.note ? ` – lý do: ${Utils.escape(cancelNote.note)}` : ''}.</div>` : ''}
      </div>
      <div class="row g-3 mt-1">
        <div class="col-md-6"><div class="acc-card h-100">
          <div class="summary-title">Địa chỉ nhận hàng</div>
          <div class="fw-semibold">${Utils.escape(o.shipping.name)} · ${Utils.escape(o.shipping.phone)}</div>
          <div class="small text-muted-2">${Utils.escape(Address.format(o.shipping))}</div>
          ${o.note ? `<div class="small mt-2"><span class="text-muted-2">Ghi chú:</span> ${Utils.escape(o.note)}</div>` : ''}
        </div></div>
        <div class="col-md-6"><div class="acc-card h-100">
          <div class="summary-title">Giao hàng & thanh toán</div>
          <div class="small">${SHIPPING_METHODS[o.shippingMethod].label} – ${SHIPPING_METHODS[o.shippingMethod].desc}</div>
          <div class="small mt-1">${PAYMENT_METHODS[o.paymentMethod].label}${o.card ? ` (${o.card.brand} •••• ${o.card.last4})` : ''}</div>
          <div class="small mt-1">Trạng thái thanh toán: <strong>${Orders.PAYMENT_STATUS[o.paymentStatus]}</strong></div>
        </div></div>
      </div>
      <div class="acc-card mt-3">
        <div class="summary-title">Sản phẩm</div>
        ${o.items.map(it => {
          const p = Catalog.product(it.productId);
          const extras = [it.services.engrave ? `Khắc: “${Utils.escape(it.services.engrave)}”` : '', it.services.giftWrap ? 'Gói quà' : '', it.services.install ? 'Lắp đặt tại nhà' : ''].filter(Boolean);
          return `<div class="od-item">
            <a href="${p ? Catalog.url(p) : '#'}" class="cart-img">${p ? `<img src="${Img.product(p)}" alt="">` : ''}</a>
            <div class="flex-grow-1 min-w-0">
              <a href="${p ? Catalog.url(p) : '#'}" class="cart-name">${Utils.escape(it.name)}</a>
              <div class="small text-muted-2">${Utils.formatPrice(it.price)} × ${it.qty}${it.originalPrice > it.price ? ` <s class="ms-1">${Utils.formatPrice(it.originalPrice)}</s>` : ''}</div>
              ${extras.length ? `<div class="small">${extras.join(' · ')}</div>` : ''}
            </div>
            <div class="text-end">
              <div class="fw-semibold">${Utils.formatPrice(it.price * it.qty)}</div>
              ${o.status === 'completed' && p ? (reviewed.has(it.productId)
                ? '<span class="small text-success"><i class="bi bi-check2"></i> Đã đánh giá</span>'
                : `<a class="btn btn-sm btn-outline-dark mt-1" href="chi-tiet-san-pham.html?id=${it.productId}#write-review">Đánh giá</a>`) : ''}
            </div></div>`;
        }).join('')}
        ${o.gifts && o.gifts.length ? `<div class="gift-box"><i class="bi bi-gift me-1"></i>Quà tặng: ${o.gifts.map(Utils.escape).join('; ')}</div>` : ''}
        <dl class="summary-rows mb-0 ms-auto" style="max-width:360px">
          <div><dt>Tạm tính</dt><dd>${Utils.formatPrice(o.subtotal)}</dd></div>
          ${o.serviceFee ? `<div><dt>Dịch vụ kèm theo</dt><dd>${Utils.formatPrice(o.serviceFee)}</dd></div>` : ''}
          <div><dt>Phí vận chuyển</dt><dd>${o.shippingFee ? Utils.formatPrice(o.shippingFee) : 'Miễn phí'}</dd></div>
          ${o.couponDiscount ? `<div><dt>Mã ${o.couponCode}</dt><dd class="text-sale">-${Utils.formatPrice(o.couponDiscount)}</dd></div>` : ''}
          <div class="summary-total"><dt>Tổng cộng</dt><dd>${Utils.formatPrice(o.total)}</dd></div>
        </dl>
      </div>
      <div class="acc-card mt-3">
        <div class="summary-title">Lịch sử đơn hàng</div>
        <ul class="history-list">${o.history.slice().reverse().map(h => `<li><span class="text-muted-2">${Utils.formatDate(h.at, true)}</span> – ${Orders.STATUS[h.status].label}${h.note ? ` <span class="text-muted-2">(${Utils.escape(h.note)})</span>` : ''}</li>`).join('')}</ul>
      </div>
      <div class="d-flex gap-2 mt-3 flex-wrap">${orderActions(o, true)}</div>`;
  }

  // Hủy đơn
  let cancelId = null;
  $('#cancelReasons').innerHTML = CANCEL_REASONS.map((r, i) => `
    <label class="option-card py-2"><input class="form-check-input" type="radio" name="reason" value="${r}" ${i === 0 ? 'checked' : ''}><span class="small">${r}</span></label>`).join('');
  $('#cancelReasons').addEventListener('change', e => {
    $$('#cancelReasons .option-card').forEach(c => c.classList.toggle('active', c.contains(e.target) && e.target.checked));
    $('#cancelOther').hidden = e.target.value !== 'Lý do khác';
  });
  $('#cancelForm').addEventListener('submit', e => {
    e.preventDefault();
    let reason = $('input[name="reason"]:checked').value;
    if (reason === 'Lý do khác') {
      reason = $('#cancelOther').value.trim();
      if (reason.length < 5) { Utils.setInvalid($('#cancelOther'), 'Vui lòng nhập lý do (tối thiểu 5 ký tự).'); return; }
    }
    const r = Orders.cancel(cancelId, reason);
    bootstrap.Modal.getOrCreateInstance('#cancelModal').hide();
    Utils.toast(r.ok ? `Đã hủy đơn ${cancelId}.` : r.error, r.ok ? 'info' : 'error');
    route();
  });

  /* ================= Đánh giá của tôi ================= */
  function renderReviews() {
    const pending = toReview();
    const mine = DB.all('reviews').filter(r => r.userId === me().id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    view.innerHTML = `
      <h1 class="acc-title">Đánh giá của tôi</h1>
      <div class="order-tabs">
        <button type="button" data-t="pending" class="${reviewTab === 'pending' ? 'active' : ''}">Chờ đánh giá ${pending.length ? `<span>${pending.length}</span>` : ''}</button>
        <button type="button" data-t="done" class="${reviewTab === 'done' ? 'active' : ''}">Đã đánh giá ${mine.length ? `<span>${mine.length}</span>` : ''}</button>
      </div>
      <div class="d-grid gap-3 mt-3">
      ${reviewTab === 'pending'
        ? (pending.length ? pending.map(({ item, order }) => {
            const p = Catalog.product(item.productId);
            return `<div class="acc-card d-flex align-items-center gap-3">
              <a href="${Catalog.url(p)}" class="cart-img flex-none"><img src="${Img.product(p)}" alt=""></a>
              <div class="flex-grow-1 min-w-0"><a href="${Catalog.url(p)}" class="cart-name">${Utils.escape(p.name)}</a>
                <div class="small text-muted-2">Đơn ${order.id} · hoàn thành ${Utils.formatDate(order.history[order.history.length - 1].at)}</div></div>
              <a href="chi-tiet-san-pham.html?id=${p.id}#write-review" class="btn btn-dark btn-sm text-nowrap"><i class="bi bi-pencil-square me-1"></i>Viết đánh giá</a></div>`;
          }).join('') : '<div class="empty-state"><i class="bi bi-star"></i>Bạn đã đánh giá tất cả sản phẩm đã mua. Cảm ơn bạn!</div>')
        : (mine.length ? mine.map(r => {
            const p = Catalog.product(r.productId);
            if (!p) return '';
            return `<div class="acc-card">
              <div class="d-flex gap-3">
                <a href="${Catalog.url(p)}" class="cart-img flex-none"><img src="${Img.product(p)}" alt=""></a>
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex justify-content-between gap-2 flex-wrap"><a href="${Catalog.url(p)}" class="cart-name">${Utils.escape(p.name)}</a>
                    <span class="badge ${r.status === 'approved' ? 'text-bg-success' : r.status === 'pending' ? 'text-bg-warning' : 'text-bg-secondary'}">${Reviews.STATUS_LABEL[r.status]}</span></div>
                  <div class="small mt-1">${Reviews.stars(r.rating)} <span class="text-muted-2 ms-1">${Utils.formatDate(r.createdAt)}</span></div>
                  ${r.title ? `<div class="fw-semibold mt-2">${Utils.escape(r.title)}</div>` : ''}
                  <p class="mb-1">${Utils.escape(r.content)}</p>
                  ${r.images.length ? `<div class="rv-images">${r.images.map(s => `<img src="${s}" alt="" width="56" height="56" class="rounded-2 object-fit-cover">`).join('')}</div>` : ''}
                  ${r.reply ? `<div class="rv-reply"><strong class="small">Phản hồi từ cửa hàng:</strong> ${Utils.escape(r.reply.content)}</div>` : ''}
                  <div class="rv-actions mt-2">
                    <span class="small text-muted-2"><i class="bi bi-hand-thumbs-up"></i> ${r.helpful.length} hữu ích</span>
                    ${Reviews.editable(r) ? `<a href="chi-tiet-san-pham.html?id=${p.id}#write-review" class="small"><i class="bi bi-pencil"></i> Sửa</a>` : '<span class="small text-muted-2">Hết hạn sửa</span>'}
                    <button type="button" class="js-del-review small" data-id="${r.id}"><i class="bi bi-trash"></i> Xóa</button>
                  </div>
                </div>
              </div></div>`;
          }).join('') : '<div class="empty-state"><i class="bi bi-chat-square-text"></i>Bạn chưa viết đánh giá nào.</div>')}
      </div>`;
    $$('.order-tabs button').forEach(b => b.addEventListener('click', () => { reviewTab = b.dataset.t; renderReviews(); }));
  }

  /* ================= Ví mã giảm giá ================= */
  function renderCoupons() {
    const u = me();
    const saved = new Set(u.savedCoupons || []);
    const coupons = Promo.all().filter(p => p.type === 'coupon' && (saved.has(p.code) || ['running', 'upcoming'].includes(Promo.status(p))));
    const card = c => {
      const st = Promo.status(c);
      const used = OrderCalc.couponUsage(c.code, u.id);
      const left = c.perUser ? c.perUser - used : null;
      const unusable = st === 'ended' || st === 'paused' || (c.usageLimit && c.used >= c.usageLimit) || left === 0;
      return `<div class="ticket ticket-lg${unusable ? ' disabled' : ''}">
        <div class="ticket-left">${c.discountType === 'percent' ? c.value + '%' : Math.round(c.value / 1000) + 'K'}</div>
        <div class="ticket-body">
          <div class="d-flex align-items-center gap-2 flex-wrap"><strong>${c.code}</strong>
            <span class="badge ${st === 'running' ? 'text-bg-success' : st === 'upcoming' ? 'text-bg-info' : 'text-bg-secondary'}">${Promo.STATUS_LABEL[st]}</span></div>
          <div class="small">${Utils.escape(c.description)}</div>
          <div class="small text-muted-2">Đơn tối thiểu ${Utils.formatPrice(c.minOrder || 0)}${c.maxDiscount ? ` · Giảm tối đa ${Utils.formatPrice(c.maxDiscount)}` : ''}</div>
          <div class="small text-muted-2">${st === 'upcoming' ? 'Bắt đầu ' + Utils.formatDate(c.start) : 'HSD ' + Utils.formatDate(c.end)}${left !== null ? ` · Bạn còn ${Math.max(0, left)}/${c.perUser} lượt` : ''}</div>
        </div>
        <div class="d-flex flex-column gap-1">
          ${saved.has(c.code)
            ? `<button class="btn btn-sm btn-outline-dark js-copy" data-code="${c.code}">Sao chép</button>
               ${!unusable && st === 'running' ? `<a class="btn btn-sm btn-dark" href="san-pham.html">Dùng ngay</a>` : `<button class="btn btn-sm btn-link text-muted js-unsave" data-code="${c.code}">Bỏ lưu</button>`}`
            : `<button class="btn btn-sm btn-dark js-save" data-code="${c.code}" ${unusable ? 'disabled' : ''}>Lưu mã</button>`}
        </div></div>`;
    };
    const mine = coupons.filter(c => saved.has(c.code));
    const more = coupons.filter(c => !saved.has(c.code));
    view.innerHTML = `
      <h1 class="acc-title">Ví mã giảm giá</h1>
      <div class="summary-title">Mã của bạn (${mine.length})</div>
      <div class="d-grid gap-2">${mine.map(card).join('') || '<div class="small text-muted-2">Bạn chưa lưu mã nào.</div>'}</div>
      <div class="summary-title mt-4">Mã đang có thể lưu</div>
      <div class="d-grid gap-2">${more.map(card).join('') || '<div class="small text-muted-2">Hiện chưa có mã mới.</div>'}</div>`;
  }

  /* ================= Sổ địa chỉ ================= */
  let editingAddress = null;
  $('#adProvince').innerHTML += PROVINCES.map(p => `<option>${p}</option>`).join('');
  function renderAddresses() {
    const list = (me().addresses || []).slice().sort((a, b) => b.isDefault - a.isDefault);
    view.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3"><h1 class="acc-title mb-0">Sổ địa chỉ</h1>
        <button class="btn btn-dark btn-sm js-add-address"><i class="bi bi-plus-lg me-1"></i>Thêm địa chỉ</button></div>
      <div class="d-grid gap-3">${list.length ? list.map(a => `
        <div class="acc-card d-flex justify-content-between gap-3 flex-wrap">
          <div><div class="fw-semibold">${Utils.escape(a.name)} · ${Utils.escape(a.phone)} ${a.isDefault ? '<span class="badge text-bg-dark ms-1">Mặc định</span>' : ''}</div>
            <div class="small text-muted-2">${Utils.escape(Address.format(a))}</div></div>
          <div class="d-flex gap-2 align-items-start">
            ${a.isDefault ? '' : `<button class="btn btn-sm btn-outline-dark js-default" data-id="${a.id}">Đặt mặc định</button>`}
            <button class="btn btn-sm btn-outline-dark js-edit-address" data-id="${a.id}">Sửa</button>
            <button class="btn btn-sm btn-outline-danger js-del-address" data-id="${a.id}">Xóa</button>
          </div></div>`).join('') : '<div class="empty-state"><i class="bi bi-geo-alt"></i>Chưa có địa chỉ nào.</div>'}</div>`;
  }
  function openAddress(a) {
    editingAddress = a ? a.id : null;
    $('#addressTitle').textContent = a ? 'Sửa địa chỉ' : 'Thêm địa chỉ';
    $('#adName').value = a ? a.name : me().name;
    $('#adPhone').value = a ? a.phone : me().phone;
    $('#adProvince').value = a ? a.province : '';
    $('#adWard').value = a ? a.ward || '' : '';
    $('#adStreet').value = a ? a.street : '';
    $('#adDefault').checked = a ? a.isDefault : !(me().addresses || []).length;
    Utils.clearInvalid($('#addressForm'));
    bootstrap.Modal.getOrCreateInstance('#addressModal').show();
  }
  function saveAddresses(list) {
    if (list.length && !list.some(a => a.isDefault)) list[0].isDefault = true;
    DB.update('users', me().id, { addresses: list });
  }
  $('#addressForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    const f = id => $('#' + id);
    let ok = true;
    const fail = (id, m) => { Utils.setInvalid(f(id), m); ok = false; };
    if (f('adName').value.trim().length < 2) fail('adName', 'Vui lòng nhập họ tên.');
    if (!Utils.isPhone(f('adPhone').value)) fail('adPhone', 'Số điện thoại không hợp lệ.');
    if (!f('adProvince').value) fail('adProvince', 'Vui lòng chọn tỉnh/thành.');
    if (f('adWard').value.trim().length < 2) fail('adWard', 'Vui lòng nhập phường/xã.');
    if (f('adStreet').value.trim().length < 5) fail('adStreet', 'Vui lòng nhập địa chỉ cụ thể.');
    if (!ok) return;
    const data = { name: f('adName').value.trim(), phone: f('adPhone').value.trim(), province: f('adProvince').value, ward: f('adWard').value.trim(), street: f('adStreet').value.trim(), isDefault: f('adDefault').checked };
    let list = (me().addresses || []).map(a => Object.assign({}, a, data.isDefault ? { isDefault: false } : {}));
    if (editingAddress) list = list.map(a => a.id === editingAddress ? Object.assign({}, a, data, { district: undefined }) : a);
    else list.push(Object.assign({ id: Utils.uid('a') }, data));
    saveAddresses(list);
    bootstrap.Modal.getOrCreateInstance('#addressModal').hide();
    Utils.toast(editingAddress ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ mới.');
    renderAddresses();
  });

  /* ================= Đổi mật khẩu ================= */
  function renderPassword() {
    view.innerHTML = `
      <h1 class="acc-title">Đổi mật khẩu</h1>
      <form class="acc-card" id="pwForm" novalidate style="max-width:480px">
        <div class="mb-3"><label class="form-label" for="pwOld">Mật khẩu hiện tại</label><input type="password" class="form-control" id="pwOld" autocomplete="current-password"></div>
        <div class="mb-3"><label class="form-label" for="pwNew">Mật khẩu mới</label><input type="password" class="form-control" id="pwNew" autocomplete="new-password"><div class="form-text">Tối thiểu 6 ký tự.</div></div>
        <div class="mb-3"><label class="form-label" for="pwNew2">Nhập lại mật khẩu mới</label><input type="password" class="form-control" id="pwNew2" autocomplete="new-password"></div>
        <button class="btn btn-dark" type="submit">Cập nhật mật khẩu</button>
      </form>`;
    $('#pwForm').addEventListener('submit', e => {
      e.preventDefault();
      Utils.clearInvalid(e.target);
      const o = $('#pwOld'), n = $('#pwNew'), n2 = $('#pwNew2');
      let ok = true;
      if (o.value !== me().password) { Utils.setInvalid(o, 'Mật khẩu hiện tại không đúng.'); ok = false; }
      if (n.value.length < 6) { Utils.setInvalid(n, 'Mật khẩu mới tối thiểu 6 ký tự.'); ok = false; }
      else if (n.value === o.value) { Utils.setInvalid(n, 'Mật khẩu mới phải khác mật khẩu hiện tại.'); ok = false; }
      if (n2.value !== n.value) { Utils.setInvalid(n2, 'Mật khẩu nhập lại không khớp.'); ok = false; }
      if (!ok) return;
      DB.update('users', me().id, { password: n.value });
      e.target.reset();
      Utils.toast('Đổi mật khẩu thành công.');
    });
  }

  /* ================= Sự kiện chung ================= */
  view.addEventListener('click', async e => {
    const b = sel => e.target.closest(sel);
    if (b('.js-cancel')) {
      cancelId = b('.js-cancel').dataset.id;
      $('#cancelId').textContent = cancelId;
      $('#cancelForm').reset();
      $('#cancelOther').hidden = true;
      $$('#cancelReasons .option-card').forEach((c, i) => c.classList.toggle('active', i === 0));
      bootstrap.Modal.getOrCreateInstance('#cancelModal').show();
    } else if (b('.js-reorder')) {
      const o = DB.find('orders', b('.js-reorder').dataset.id);
      let added = 0;
      o.items.forEach(it => { const p = Catalog.product(it.productId); if (p && p.status === 'active' && p.stock > 0 && Cart.add(it.productId, Math.min(it.qty, p.stock), { silent: true })) added++; });
      if (added) { Utils.toast(`Đã thêm ${added}/${o.items.length} sản phẩm vào giỏ.`); setTimeout(() => location.href = 'gio-hang.html', 600); }
      else Utils.toast('Các sản phẩm trong đơn hiện không còn hàng.', 'warning');
    } else if (b('.js-del-review')) {
      if (!await Utils.confirm('Xóa đánh giá này?', 'Thao tác không thể hoàn tác.', 'Xóa')) return;
      Reviews.remove(b('.js-del-review').dataset.id);
      Utils.toast('Đã xóa đánh giá.', 'info');
      renderReviews(); renderSide();
    } else if (b('.js-save') || b('.js-unsave')) {
      const code = (b('.js-save') || b('.js-unsave')).dataset.code;
      const set = new Set(me().savedCoupons || []);
      b('.js-save') ? set.add(code) : set.delete(code);
      DB.update('users', me().id, { savedCoupons: [...set] });
      Utils.toast(b('.js-save') ? `Đã lưu mã ${code} vào ví.` : `Đã bỏ lưu mã ${code}.`, b('.js-save') ? 'success' : 'info');
      renderCoupons();
    } else if (b('.js-copy')) {
      const code = b('.js-copy').dataset.code;
      try { await navigator.clipboard.writeText(code); } catch { /* trình duyệt chặn clipboard */ }
      Utils.toast(`Đã sao chép mã ${code}.`);
    } else if (b('.js-add-address')) openAddress(null);
    else if (b('.js-edit-address')) openAddress(me().addresses.find(a => a.id === b('.js-edit-address').dataset.id));
    else if (b('.js-default')) {
      const id = b('.js-default').dataset.id;
      saveAddresses(me().addresses.map(a => Object.assign({}, a, { isDefault: a.id === id })));
      renderAddresses();
    } else if (b('.js-del-address')) {
      if (!await Utils.confirm('Xóa địa chỉ này?', '', 'Xóa')) return;
      saveAddresses(me().addresses.filter(a => a.id !== b('.js-del-address').dataset.id));
      renderAddresses();
    }
  });

  /* ================= Điều hướng ================= */
  function route() {
    const [tab, sub] = (location.hash.slice(1) || 'profile').split('/');
    $$('#accNav a[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    renderSide();
    const pages = { profile: renderProfile, orders: () => sub ? renderOrderDetail(sub) : renderOrders(), reviews: renderReviews, coupons: renderCoupons, addresses: renderAddresses, password: renderPassword };
    (pages[tab] || renderProfile)();
    document.title = ($('.acc-title') ? $('.acc-title').textContent : 'Tài khoản') + ' | TIMEHOUSE';
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);
  route();
})();
