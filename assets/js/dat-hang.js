// Tính tiền đơn hàng, mã giảm giá, quà tặng, đặt hàng & trạng thái đơn.
// Dùng chung cho giỏ hàng, thanh toán, tài khoản và trang quản trị.

// 34 tỉnh/thành sau sắp xếp đơn vị hành chính 2025 (mô hình 2 cấp: tỉnh → phường/xã)
const PROVINCES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế',
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai',
  'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình',
  'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên', 'Thanh Hóa',
  'Tuyên Quang', 'Vĩnh Long'];

const Address = {
  format: a => [a.street, a.ward, a.district, a.province].filter(Boolean).join(', ')
};

const SHIPPING_METHODS = {
  standard: { label: 'Giao tiêu chuẩn', desc: '3 – 5 ngày làm việc' },
  express: { label: 'Giao hỏa tốc', desc: '1 – 2 ngày (nội thành Hà Nội, TP. HCM, Đà Nẵng)' }
};
const PAYMENT_METHODS = {
  cod: { label: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash-coin' },
  bank: { label: 'Chuyển khoản ngân hàng / QR', icon: 'bi-qr-code' },
  card: { label: 'Thẻ ATM / Visa / Mastercard', icon: 'bi-credit-card' }
};

const OrderCalc = {
  // Các dòng hàng hợp lệ + giá áp dụng
  lines(items) {
    return items.map(item => {
      const p = Catalog.product(item.productId);
      if (!p) return null;
      const parent = Catalog.parentOf(p.categoryId);
      let pr = Pricing.get(p);
      let flashNote = '';
      // Flash sale chỉ áp dụng khi số lượng mua không vượt số suất còn lại
      if (pr.source === 'flash' && item.qty > pr.flash.quota - pr.flash.sold) {
        flashNote = `Flash sale chỉ còn ${pr.flash.quota - pr.flash.sold} suất – áp dụng giá thường cho cả dòng.`;
        pr = Pricing.get(p, { noFlash: true });
      }
      const issue = p.status !== 'active' ? 'Sản phẩm đã ngừng kinh doanh'
        : p.stock <= 0 ? 'Sản phẩm đã hết hàng'
        : item.qty > p.stock ? `Chỉ còn ${p.stock} sản phẩm` : '';
      return {
        item, product: p, price: pr, qty: item.qty, issue, flashNote,
        canEngrave: ['deo-tay', 'bo-tui'].includes(parent.id),
        canInstall: !!p.heavy,
        total: pr.price * item.qty, originalTotal: pr.original * item.qty
      };
    }).filter(Boolean);
  },

  // Quà tặng đang áp dụng cho giỏ
  gifts(lines, subtotal) {
    return Promo.running('gift').filter(g => {
      if (subtotal < (g.minOrder || 0)) return false;
      if (g.scope.type === 'all' && !g.minItemPrice) return lines.length > 0;
      return lines.some(l => Promo.inScope(l.product, g.scope) && l.price.price >= (g.minItemPrice || 0));
    });
  },

  // Số lần khách đã dùng 1 mã (đơn chưa hủy)
  couponUsage(code, userId) {
    return DB.all('orders').filter(o => o.userId === userId && o.couponCode === code && o.status !== 'cancelled').length;
  },

  // Kiểm tra mã: trả về { ok, promo, discount, error }
  checkCoupon(code, subtotal, userId) {
    if (!code) return { ok: false };
    const c = Promo.coupon(code);
    if (!c) return { ok: false, error: 'Mã giảm giá không tồn tại.' };
    const st = Promo.status(c);
    if (st === 'upcoming') return { ok: false, error: `Mã ${c.code} bắt đầu từ ${Utils.formatDate(c.start)}.` };
    if (st === 'ended') return { ok: false, error: `Mã ${c.code} đã hết hạn.` };
    if (st === 'paused') return { ok: false, error: `Mã ${c.code} đang tạm dừng.` };
    if (c.usageLimit && c.used >= c.usageLimit) return { ok: false, error: `Mã ${c.code} đã hết lượt sử dụng.` };
    if (userId && c.perUser && OrderCalc.couponUsage(c.code, userId) >= c.perUser) return { ok: false, error: `Bạn đã dùng hết lượt của mã ${c.code}.` };
    if (subtotal < (c.minOrder || 0)) return { ok: false, error: `Đơn tối thiểu ${Utils.formatPrice(c.minOrder)} để dùng mã ${c.code} (còn thiếu ${Utils.formatPrice(c.minOrder - subtotal)}).` };
    let discount = c.discountType === 'percent' ? Math.round(subtotal * c.value / 100) : c.value;
    if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
    return { ok: true, promo: c, discount: Math.min(discount, subtotal) };
  },

  // Tính toàn bộ đơn
  compute(items, { couponCode = '', shippingMethod = 'standard', userId = null } = {}) {
    const S = DB.settings();
    const lines = OrderCalc.lines(items);
    const valid = lines.filter(l => !l.issue);
    const subtotal = valid.reduce((s, l) => s + l.total, 0);
    const originalTotal = valid.reduce((s, l) => s + l.originalTotal, 0);
    const gifts = OrderCalc.gifts(valid, subtotal);
    const free = new Set(gifts.flatMap(g => g.freeServices || []));

    let engrave = 0, giftWrap = 0, install = 0;
    valid.forEach(l => {
      const s = l.item.services || {};
      if (l.canEngrave && s.engrave) engrave += S.engraveFee * l.qty;
      if (s.giftWrap) giftWrap += S.giftWrapFee * l.qty;
      if (l.canInstall && s.install) install += S.installFee * l.qty;
    });
    const services = {
      engrave, giftWrap, install,
      engraveFree: free.has('engrave') && engrave > 0, giftWrapFree: free.has('giftWrap') && giftWrap > 0
    };
    const serviceFee = (services.engraveFree ? 0 : engrave) + (services.giftWrapFree ? 0 : giftWrap) + install;

    const heavy = valid.some(l => l.product.heavy);
    const baseShip = subtotal >= S.freeShipThreshold ? 0 : S.shipFee;
    const shippingFee = valid.length ? baseShip + (heavy ? S.heavyShipFee : 0) + (shippingMethod === 'express' ? S.expressFee : 0) : 0;

    const coupon = couponCode ? OrderCalc.checkCoupon(couponCode, subtotal, userId) : { ok: false };
    const couponDiscount = coupon.ok ? coupon.discount : 0;

    return {
      lines, valid, subtotal, originalTotal, productSaving: originalTotal - subtotal,
      services, serviceFee, heavy, shippingFee, freeShipLeft: Math.max(0, S.freeShipThreshold - subtotal),
      coupon, couponDiscount, gifts,
      total: Math.max(0, subtotal + serviceFee + shippingFee - couponDiscount)
    };
  }
};

const Orders = {
  STATUS: {
    pending: { label: 'Chờ xác nhận', cls: 'st-pending', icon: 'bi-hourglass-split' },
    confirmed: { label: 'Đã xác nhận', cls: 'st-confirmed', icon: 'bi-check2-circle' },
    shipping: { label: 'Đang giao', cls: 'st-shipping', icon: 'bi-truck' },
    completed: { label: 'Hoàn thành', cls: 'st-completed', icon: 'bi-bag-check' },
    cancelled: { label: 'Đã hủy', cls: 'st-cancelled', icon: 'bi-x-circle' }
  },
  FLOW: ['pending', 'confirmed', 'shipping', 'completed'],
  PAYMENT_STATUS: { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' },

  badge(status) {
    const s = Orders.STATUS[status];
    return `<span class="status-badge ${s.cls}"><i class="bi ${s.icon}"></i>${s.label}</span>`;
  },

  byUser: userId => DB.all('orders').filter(o => o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  newId() {
    const d = new Date();
    const prefix = 'DH' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const ids = new Set(DB.all('orders').map(o => o.id));
    let id;
    do { id = prefix + String(Math.floor(100 + Math.random() * 900)); } while (ids.has(id));
    return id;
  },

  // Đặt hàng: kiểm tra lại tồn kho, mã giảm giá; trừ kho, cộng lượt bán, suất flash sale, lượt dùng mã.
  place({ items, shipping, shippingMethod, paymentMethod, couponCode, note, card }) {
    const u = Auth.user();
    const calc = OrderCalc.compute(items, { couponCode, shippingMethod, userId: u.id });
    if (calc.lines.some(l => l.issue)) return { ok: false, error: 'Giỏ hàng có sản phẩm không hợp lệ. Vui lòng kiểm tra lại.' };
    if (!calc.valid.length) return { ok: false, error: 'Giỏ hàng trống.' };
    if (couponCode && !calc.coupon.ok) return { ok: false, error: calc.coupon.error };

    const now = new Date().toISOString();
    const order = {
      id: Orders.newId(), userId: u.id,
      items: calc.valid.map(l => ({
        productId: l.product.id, name: l.product.name, sku: l.product.sku,
        price: l.price.price, originalPrice: l.price.original, qty: l.qty, priceSource: l.price.source,
        services: {
          engrave: l.canEngrave && l.item.services.engrave ? String(l.item.services.engrave).trim() || null : null,
          giftWrap: !!l.item.services.giftWrap, install: l.canInstall && !!l.item.services.install
        }
      })),
      shipping, shippingMethod, paymentMethod,
      paymentStatus: paymentMethod === 'card' ? 'paid' : 'unpaid',
      card: card ? { last4: card.last4, brand: card.brand } : null,
      subtotal: calc.subtotal, productSaving: calc.productSaving,
      couponCode: calc.coupon.ok ? calc.coupon.promo.code : null, couponDiscount: calc.couponDiscount,
      shippingFee: calc.shippingFee, serviceFee: calc.serviceFee, services: calc.services,
      total: calc.total, gifts: calc.gifts.map(g => g.gift),
      note: (note || '').trim(), status: 'pending',
      history: [{ status: 'pending', at: now, by: u.id, byName: u.name, note: 'Đặt hàng' }],
      createdAt: now
    };

    // Cập nhật kho / lượt bán / flash sale
    const products = DB.all('products');
    order.items.forEach(it => {
      const p = products.find(x => x.id === it.productId);
      p.stock -= it.qty;
      p.sold += it.qty;
    });
    DB.save('products', products);
    const promos = DB.all('promotions');
    order.items.filter(it => it.priceSource === 'flash').forEach(it => {
      promos.filter(pr => pr.type === 'flashsale').forEach(fs => {
        const fi = fs.items.find(x => x.productId === it.productId);
        if (fi) fi.sold = Math.min(fi.quota, fi.sold + it.qty);
      });
    });
    if (order.couponCode) {
      const c = promos.find(pr => pr.type === 'coupon' && pr.code === order.couponCode);
      if (c) c.used++;
    }
    DB.save('promotions', promos);
    DB.insert('orders', order);
    return { ok: true, order };
  },

  // Khách hủy đơn (chỉ khi Chờ xác nhận) → hoàn kho
  cancel(orderId, reason, by = Auth.user()) {
    const o = DB.find('orders', orderId);
    if (!o || o.status !== 'pending') return { ok: false, error: 'Chỉ có thể hủy đơn ở trạng thái Chờ xác nhận.' };
    return Orders.setStatus(orderId, 'cancelled', reason, by);
  },

  // Đổi trạng thái (dùng cả cho nhân viên). Hủy → hoàn kho & lượt dùng mã.
  setStatus(orderId, status, note = '', by = Auth.user()) {
    const o = DB.find('orders', orderId);
    if (!o) return { ok: false, error: 'Không tìm thấy đơn hàng.' };
    if (status === 'cancelled' && o.status !== 'cancelled') {
      const products = DB.all('products');
      o.items.forEach(it => {
        const p = products.find(x => x.id === it.productId);
        if (p) { p.stock += it.qty; p.sold = Math.max(0, p.sold - it.qty); }
      });
      DB.save('products', products);
      if (o.couponCode) {
        const promos = DB.all('promotions');
        const c = promos.find(pr => pr.type === 'coupon' && pr.code === o.couponCode);
        if (c) { c.used = Math.max(0, c.used - 1); DB.save('promotions', promos); }
      }
    }
    const patch = {
      status,
      history: o.history.concat({ status, at: new Date().toISOString(), by: by.id, byName: by.name, note })
    };
    if (status === 'completed' && o.paymentMethod === 'cod') patch.paymentStatus = 'paid';
    if (status === 'cancelled' && o.paymentStatus === 'paid') patch.paymentStatus = 'refunded';
    return { ok: true, order: DB.update('orders', orderId, patch) };
  }
};

// Lựa chọn tạm khi mua hàng (mã giảm giá, cách giao) – lưu theo tài khoản để giỏ hàng & thanh toán dùng chung
const Draft = {
  get() {
    const u = Auth.user();
    return Object.assign({ coupon: '', shippingMethod: 'standard' }, u ? (DB.get('drafts', {})[u.id] || {}) : {});
  },
  set(patch) {
    const u = Auth.user();
    if (!u) return;
    const all = DB.get('drafts', {});
    all[u.id] = Object.assign(Draft.get(), patch);
    DB.set('drafts', all);
  },
  clear() {
    const u = Auth.user();
    const all = DB.get('drafts', {});
    delete all[u.id];
    DB.set('drafts', all);
  }
};

// Mã giảm giá hiển thị cho khách: mã đã lưu trong ví + mã công khai đang chạy
function availableCoupons(user) {
  const saved = new Set((user && user.savedCoupons) || []);
  return Promo.all().filter(p => p.type === 'coupon' && (saved.has(p.code) || Promo.status(p) === 'running'))
    .map(c => ({ promo: c, saved: saved.has(c.code), status: Promo.status(c) }));
}