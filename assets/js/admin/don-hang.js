// Quản lý đơn hàng: lọc, xem chi tiết, chuyển trạng thái, xác nhận thanh toán, in hóa đơn, xuất CSV.
(function () {
  if (!Admin.init('orders', 'Đơn hàng')) return;
  const fp = Utils.formatPrice;
  const PER = 12;
  const state = { status: Utils.param('status') || 'all', q: '', pay: Utils.param('pay') || '', from: '', to: '', page: 1 };
  // Bước tiếp theo hợp lệ của từng trạng thái
  const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['completed'], completed: [], cancelled: [] };
  const NEXT_LABEL = { confirmed: 'Xác nhận đơn', shipping: 'Bàn giao vận chuyển', completed: 'Hoàn thành', cancelled: 'Hủy đơn' };

  $('#adminContent').innerHTML = `
    <div class="panel">
      <div class="status-tabs" id="stTabs"></div>
      <div class="filter-bar">
        <div class="position-relative flex-grow-1" style="min-width:220px"><i class="bi bi-search fb-icon"></i>
          <input type="search" class="form-control ps-5" id="fQ" placeholder="Mã đơn, tên, SĐT khách…" aria-label="Tìm đơn"></div>
        <select class="form-select" id="fPay" aria-label="Thanh toán" style="max-width:220px">
          <option value="">Mọi thanh toán</option><option value="unpaid">Chưa thanh toán</option><option value="paid">Đã thanh toán</option>
          <option value="bank-unpaid">Chuyển khoản chưa thanh toán</option>
          ${Object.entries(PAYMENT_METHODS).map(([k, v]) => `<option value="m:${k}">${v.label.split(' (')[0]}</option>`).join('')}
        </select>
        <input type="date" class="form-control" id="fFrom" aria-label="Từ ngày" style="max-width:160px">
        <input type="date" class="form-control" id="fTo" aria-label="Đến ngày" style="max-width:160px">
        <button class="btn btn-outline-dark" id="exportBtn"><i class="bi bi-download me-1"></i>Xuất CSV</button>
      </div>
      <div class="table-responsive"><table class="table admin-table align-middle">
        <thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Khách hàng</th><th class="text-center">SL</th><th class="text-end">Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody id="tbody"></tbody></table></div>
      <div id="pager"></div>
    </div>`;

  $('#adminModals').innerHTML = `
    <div class="modal fade" id="orderModal" tabindex="-1" aria-labelledby="omTitle" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="omTitle"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
        <div class="modal-body" id="omBody"></div>
        <div class="modal-footer" id="omFoot"></div>
      </div></div>
    </div>`;
  $('#fPay').value = state.pay;

  function filtered() {
    const q = Utils.normalize(state.q);
    return DB.all('orders').filter(o => {
      // 'processing' = đơn đang xử lý: đã xác nhận + đang giao (dùng từ Dashboard)
      if (state.status === 'processing') { if (!['confirmed', 'shipping'].includes(o.status)) return false; }
      else if (state.status !== 'all' && o.status !== state.status) return false;
      if (state.pay === 'bank-unpaid') { if (o.paymentMethod !== 'bank' || o.paymentStatus !== 'unpaid' || o.status === 'cancelled') return false; }
      else if (state.pay === 'paid' || state.pay === 'unpaid') { if (o.paymentStatus !== state.pay || o.status === 'cancelled') return false; }
      else if (state.pay.startsWith('m:') && o.paymentMethod !== state.pay.slice(2)) return false;
      if (state.from && new Date(o.createdAt) < new Date(state.from + 'T00:00')) return false;
      if (state.to && new Date(o.createdAt) > new Date(state.to + 'T23:59:59')) return false;
      if (q && !Utils.normalize(`${o.id} ${o.shipping.name} ${o.shipping.phone}`).includes(q)) return false;
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function render() {
    const all = DB.all('orders');
    $('#stTabs').innerHTML = [['all', 'Tất cả', all.length]].concat(Object.entries(Orders.STATUS).map(([k, v]) => [k, v.label, all.filter(o => o.status === k).length]))
      .concat(state.status === 'processing' ? [['processing', 'Đang xử lý / giao', all.filter(o => ['confirmed', 'shipping'].includes(o.status)).length]] : [])
      .map(([k, l, n]) => `<button type="button" data-st="${k}" class="${state.status === k ? 'active' : ''}">${l} <span>${n}</span></button>`).join('');
    const p = Admin.paginate(filtered(), state.page, PER);
    state.page = p.page;
    $('#tbody').innerHTML = p.rows.map(o => `
      <tr>
        <td><button class="btn btn-link p-0 fw-semibold js-view" data-id="${o.id}">${o.id}</button></td>
        <td class="small">${Utils.formatDate(o.createdAt, true)}</td>
        <td><div class="fw-medium">${Utils.escape(o.shipping.name)}</div><div class="small text-muted">${Utils.escape(o.shipping.phone)}</div></td>
        <td class="text-center">${o.items.reduce((s, i) => s + i.qty, 0)}</td>
        <td class="text-end fw-semibold">${fp(o.total)}</td>
        <td class="small">${PAYMENT_METHODS[o.paymentMethod].label.split(' (')[0].replace('Thanh toán khi nhận hàng', 'COD')}<br>
          <span class="badge ${o.paymentStatus === 'paid' ? 'text-bg-success' : o.paymentStatus === 'refunded' ? 'text-bg-secondary' : 'text-bg-light border'}">${Orders.PAYMENT_STATUS[o.paymentStatus]}</span></td>
        <td>${Orders.badge(o.status)}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-dark js-view" data-id="${o.id}">Xử lý</button></td>
      </tr>`).join('') || '<tr><td colspan="8" class="text-center text-muted py-5">Không có đơn hàng phù hợp.</td></tr>';
    $('#pager').innerHTML = Admin.pagerInfo(p, PER);
  }

  /* ---------- Chi tiết & xử lý ---------- */
  function openOrder(id) {
    const o = DB.find('orders', id);
    if (!o) { Utils.toast('Không tìm thấy đơn ' + Utils.escape(id), 'error'); return; }
    const customer = DB.find('users', o.userId);
    $('#omTitle').innerHTML = `Đơn hàng ${o.id} ${Orders.badge(o.status)}`;
    $('#omBody').innerHTML = `
      <div class="row g-3">
        <div class="col-md-4"><div class="info-box"><div class="ib-title">Khách hàng</div>
          <div class="fw-semibold">${Utils.escape(customer ? customer.name : '—')}</div>
          <div class="small text-muted">${customer ? `${Utils.escape(customer.email)} · ${customer.phone}` : ''}</div>
          <div class="small text-muted">Đặt lúc ${Utils.formatDate(o.createdAt, true)}</div></div></div>
        <div class="col-md-4"><div class="info-box"><div class="ib-title">Giao đến</div>
          <div class="fw-semibold">${Utils.escape(o.shipping.name)} · ${Utils.escape(o.shipping.phone)}</div>
          <div class="small">${Utils.escape(Address.format(o.shipping))}</div>
          <div class="small text-muted">${SHIPPING_METHODS[o.shippingMethod].label}</div>
          ${o.note ? `<div class="small mt-1"><i class="bi bi-chat-left-text me-1"></i>${Utils.escape(o.note)}</div>` : ''}</div></div>
        <div class="col-md-4"><div class="info-box"><div class="ib-title">Thanh toán</div>
          <div>${PAYMENT_METHODS[o.paymentMethod].label}${o.card ? ` – ${o.card.brand} •••• ${o.card.last4}` : ''}</div>
          <div class="small">Trạng thái: <strong>${Orders.PAYMENT_STATUS[o.paymentStatus]}</strong></div>
          ${o.couponCode ? `<div class="small">Mã giảm giá: <strong>${o.couponCode}</strong></div>` : ''}</div></div>
      </div>
      <div class="table-responsive mt-3"><table class="table admin-table align-middle">
        <thead><tr><th>Sản phẩm</th><th>Dịch vụ</th><th class="text-end">Đơn giá</th><th class="text-center">SL</th><th class="text-end">Thành tiền</th></tr></thead>
        <tbody>${o.items.map(it => {
          const p = Catalog.product(it.productId);
          return `<tr><td><div class="d-flex align-items-center gap-2">${p ? `<img src="${Img.product(p)}" alt="" width="44" height="44" class="rounded-2">` : ''}
            <div><div class="fw-medium">${Utils.escape(it.name)}</div><div class="small text-muted">${it.sku || it.productId}${it.priceSource === 'flash' ? ' · Flash sale' : ''}</div></div></div></td>
            <td class="small">${[it.services.engrave ? `Khắc: “${Utils.escape(it.services.engrave)}”` : '', it.services.giftWrap ? 'Gói quà' : '', it.services.install ? 'Lắp đặt' : ''].filter(Boolean).join('<br>') || '—'}</td>
            <td class="text-end">${fp(it.price)}${it.originalPrice > it.price ? `<div class="small text-muted"><s>${fp(it.originalPrice)}</s></div>` : ''}</td>
            <td class="text-center">${it.qty}</td><td class="text-end fw-semibold">${fp(it.price * it.qty)}</td></tr>`;
        }).join('')}</tbody></table></div>
      <div class="row g-3">
        <div class="col-md-6">
          ${o.gifts && o.gifts.length ? `<div class="gift-box mt-0 mb-3"><i class="bi bi-gift me-1"></i>Quà tặng kèm: ${o.gifts.map(Utils.escape).join('; ')}</div>` : ''}
          <div class="ib-title">Lịch sử xử lý</div>
          <ul class="history-list">${o.history.slice().reverse().map(h => `<li><span class="text-muted">${Utils.formatDate(h.at, true)}</span> · <strong>${Orders.STATUS[h.status].label}</strong> · ${Utils.escape(h.byName)}${h.note ? ` <span class="text-muted">– ${Utils.escape(h.note)}</span>` : ''}</li>`).join('')}</ul>
        </div>
        <div class="col-md-6"><dl class="summary-rows mt-0">
          <div><dt>Tạm tính</dt><dd>${fp(o.subtotal)}</dd></div>
          ${o.serviceFee ? `<div><dt>Dịch vụ</dt><dd>${fp(o.serviceFee)}</dd></div>` : ''}
          <div><dt>Vận chuyển</dt><dd>${o.shippingFee ? fp(o.shippingFee) : 'Miễn phí'}</dd></div>
          ${o.couponDiscount ? `<div><dt>Mã ${o.couponCode}</dt><dd class="text-danger">-${fp(o.couponDiscount)}</dd></div>` : ''}
          <div class="summary-total"><dt>Tổng cộng</dt><dd>${fp(o.total)}</dd></div></dl></div>
      </div>
      ${NEXT[o.status].length ? `<div class="mt-3"><label class="form-label small" for="stNote">Ghi chú khi cập nhật trạng thái</label>
        <input class="form-control" id="stNote" maxlength="200" placeholder="Ví dụ: đã gọi xác nhận, mã vận đơn GHN123…"></div>` : ''}`;

    const acts = NEXT[o.status].map(s => `<button class="btn ${s === 'cancelled' ? 'btn-outline-danger' : 'btn-dark'} js-next" data-st="${s}">${NEXT_LABEL[s]}</button>`);
    if (o.paymentStatus === 'unpaid' && o.paymentMethod !== 'cod' && o.status !== 'cancelled') acts.unshift('<button class="btn btn-outline-success js-paid"><i class="bi bi-cash me-1"></i>Xác nhận đã nhận tiền</button>');
    $('#omFoot').innerHTML = `<button class="btn btn-outline-dark me-auto js-print"><i class="bi bi-printer me-1"></i>In hóa đơn</button>${acts.join('')}`;
    $('#omFoot').dataset.id = o.id;
    Admin.modal('orderModal').modal.show();
  }

  async function changeStatus(id, status) {
    const o = DB.find('orders', id);
    let note = ($('#stNote') || {}).value || '';
    if (status === 'cancelled') {
      if (!note.trim()) { Utils.setInvalid($('#stNote'), 'Vui lòng nhập lý do hủy đơn.'); $('#stNote').focus(); return; }
      if (!await Utils.confirm(`Hủy đơn ${id}?`, 'Tồn kho và lượt dùng mã giảm giá sẽ được hoàn lại.', 'Hủy đơn')) return;
    }
    if (status === 'confirmed' && o.paymentMethod === 'bank' && o.paymentStatus === 'unpaid' &&
        !await Utils.confirm('Đơn chuyển khoản chưa thanh toán', 'Bạn vẫn muốn xác nhận đơn này?', 'Vẫn xác nhận')) return;
    const r = Orders.setStatus(id, status, note.trim());
    if (!r.ok) { Utils.toast(r.error, 'error'); return; }
    Utils.toast(`Đơn ${id}: ${Orders.STATUS[status].label}.`);
    render(); Admin.refreshBadges(); openOrder(id);
  }

  function printInvoice(id) {
    const o = DB.find('orders', id);
    const S = DB.settings();
    const w = window.open('', '_blank', 'width=820,height=900');
    if (!w) { Utils.toast('Trình duyệt chặn cửa sổ in. Hãy cho phép popup.', 'warning'); return; }
    w.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Hóa đơn ${o.id}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:14px}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}td.r,th.r{text-align:right}.head{display:flex;justify-content:space-between}.muted{color:#666}.total{font-size:18px;font-weight:bold}</style></head><body>
      <div class="head"><div><h1>TIMEHOUSE</h1><div class="muted">${S.address}<br>Hotline ${S.hotline} · ${S.email}</div></div>
      <div style="text-align:right"><h1>HÓA ĐƠN BÁN HÀNG</h1><div>Số: <b>${o.id}</b></div><div class="muted">Ngày ${Utils.formatDate(o.createdAt, true)}</div></div></div>
      <p><b>Khách hàng:</b> ${Utils.escape(o.shipping.name)} – ${Utils.escape(o.shipping.phone)}<br><b>Địa chỉ:</b> ${Utils.escape(Address.format(o.shipping))}<br>
      <b>Thanh toán:</b> ${PAYMENT_METHODS[o.paymentMethod].label} (${Orders.PAYMENT_STATUS[o.paymentStatus]})</p>
      <table><thead><tr><th>#</th><th>Sản phẩm</th><th class="r">Đơn giá</th><th class="r">SL</th><th class="r">Thành tiền</th></tr></thead><tbody>
      ${o.items.map((it, i) => `<tr><td>${i + 1}</td><td>${Utils.escape(it.name)}${it.services.engrave ? `<br><span class="muted">Khắc: ${Utils.escape(it.services.engrave)}</span>` : ''}</td><td class="r">${fp(it.price)}</td><td class="r">${it.qty}</td><td class="r">${fp(it.price * it.qty)}</td></tr>`).join('')}
      <tr><td colspan="4" class="r">Tạm tính</td><td class="r">${fp(o.subtotal)}</td></tr>
      ${o.serviceFee ? `<tr><td colspan="4" class="r">Dịch vụ</td><td class="r">${fp(o.serviceFee)}</td></tr>` : ''}
      <tr><td colspan="4" class="r">Vận chuyển</td><td class="r">${fp(o.shippingFee)}</td></tr>
      ${o.couponDiscount ? `<tr><td colspan="4" class="r">Giảm giá (${o.couponCode})</td><td class="r">-${fp(o.couponDiscount)}</td></tr>` : ''}
      <tr><td colspan="4" class="r total">Tổng cộng</td><td class="r total">${fp(o.total)}</td></tr></tbody></table>
      <p class="muted" style="margin-top:32px">Cảm ơn quý khách đã mua sắm tại TIMEHOUSE. Sản phẩm được bảo hành theo chính sách tại timehouse.vn/policy.</p>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }

  /* ---------- Sự kiện ---------- */
  $('#stTabs').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (b) { state.status = b.dataset.st; state.page = 1; render(); } });
  $('#fQ').addEventListener('input', Utils.debounce(e => { state.q = e.target.value.trim(); state.page = 1; render(); }, 250));
  $('#fPay').addEventListener('change', e => { state.pay = e.target.value; state.page = 1; render(); });
  $('#fFrom').addEventListener('change', e => { state.from = e.target.value; state.page = 1; render(); });
  $('#fTo').addEventListener('change', e => { state.to = e.target.value; state.page = 1; render(); });
  $('#pager').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.closest('.disabled')) { state.page = +b.dataset.page; render(); } });
  $('#tbody').addEventListener('click', e => { const b = e.target.closest('.js-view'); if (b) openOrder(b.dataset.id); });
  $('#omFoot').addEventListener('click', e => {
    const id = $('#omFoot').dataset.id;
    const next = e.target.closest('.js-next');
    if (next) changeStatus(id, next.dataset.st);
    else if (e.target.closest('.js-paid')) {
      DB.update('orders', id, { paymentStatus: 'paid' });
      Utils.toast(`Đã ghi nhận thanh toán cho đơn ${id}.`);
      render(); openOrder(id);
    } else if (e.target.closest('.js-print')) printInvoice(id);
  });
  $('#exportBtn').addEventListener('click', () => {
    const rows = filtered().map(o => [o.id, Utils.formatDate(o.createdAt, true), o.shipping.name, o.shipping.phone, Address.format(o.shipping),
      o.items.map(i => `${i.name} x${i.qty}`).join('; '), o.total, PAYMENT_METHODS[o.paymentMethod].label, Orders.PAYMENT_STATUS[o.paymentStatus], Orders.STATUS[o.status].label]);
    Admin.exportCsv(`don-hang-${new Date().toISOString().slice(0, 10)}.csv`, ['Mã đơn', 'Ngày', 'Khách', 'SĐT', 'Địa chỉ', 'Sản phẩm', 'Tổng tiền', 'Thanh toán', 'TT thanh toán', 'Trạng thái'], rows);
  });

  render();
  if (Utils.param('id')) openOrder(Utils.param('id'));
})();
