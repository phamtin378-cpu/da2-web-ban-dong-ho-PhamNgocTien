// Đơn hàng mẫu (phục vụ lịch sử đơn của khách và báo cáo doanh thu). Cần nạp sau san-pham.js & nguoi-dung.js.
(function () {
  const products = window.SEED_PRODUCTS;
  const users = window.SEED_USERS.filter(u => u.role === 'customer' && u.addresses.length);
  const byId = id => products.find(p => p.id === id);
  let seed = 4242;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  const STAFF = [{ id: 'u-staff1', name: 'Nguyễn Thu Trang' }, { id: 'u-staff2', name: 'Lê Minh Đức' }];
  const FLOW = ['pending', 'confirmed', 'shipping', 'completed'];

  function make(n, user, items, daysAgo, status, extra = {}) {
    const created = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rnd() * 36000000));
    const lines = items.map(([pid, qty]) => {
      const p = byId(pid);
      return { productId: pid, name: p.name, price: p.salePrice || p.price, originalPrice: p.price, qty,
        services: { engrave: null, giftWrap: false, install: p.heavy } };
    });
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const heavy = lines.some(l => byId(l.productId).heavy);
    const shippingFee = (subtotal >= 500000 ? 0 : 30000) + (heavy ? 150000 : 0);
    const serviceFee = lines.filter(l => l.services.install).length * 200000;
    const couponDiscount = extra.couponDiscount || 0;
    const staff = pick(STAFF);
    const history = [{ status: 'pending', at: created.toISOString(), by: user.id, byName: user.name, note: 'Đặt hàng' }];
    const steps = status === 'cancelled' ? [] : FLOW.slice(1, FLOW.indexOf(status) + 1);
    let t = created.getTime();
    steps.forEach(s => {
      t += (6 + rnd() * 30) * 3600000;
      history.push({ status: s, at: new Date(Math.min(t, Date.now())).toISOString(), by: staff.id, byName: staff.name, note: '' });
    });
    if (status === 'cancelled') {
      history.push({ status: 'cancelled', at: new Date(t + 3600000).toISOString(), by: user.id, byName: user.name, note: 'Khách đổi ý' });
    }
    const addr = user.addresses[0];
    const payment = extra.payment || pick(['cod', 'cod', 'bank', 'card']);
    const d = created;
    const code = 'DH' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + String(n).padStart(3, '0');
    return {
      id: code, userId: user.id, items: lines,
      shipping: { name: addr.name, phone: addr.phone, province: addr.province, ward: addr.ward, street: addr.street },
      shippingMethod: 'standard', paymentMethod: payment,
      // COD: trả khi nhận hàng; chuyển khoản: đơn còn chờ xác nhận coi như chưa nhận tiền; thẻ: trả ngay
      paymentStatus: status === 'cancelled'
        ? (payment === 'card' ? 'refunded' : 'unpaid')
        : status === 'completed' || payment === 'card' || (payment === 'bank' && status !== 'pending') ? 'paid' : 'unpaid',
      subtotal, couponCode: extra.couponCode || null, couponDiscount, shippingFee, serviceFee,
      total: subtotal - couponDiscount + shippingFee + serviceFee,
      gifts: [], note: extra.note || '', status, history, createdAt: created.toISOString()
    };
  }

  const orders = [];
  const [an, binh, cuong] = users;
  // Đơn có chủ đích (khớp với đánh giá "đã mua" và minh họa trạng thái)
  orders.push(make(1, an, [['p001', 1], ['p083', 1]], 45, 'completed'));
  orders.push(make(2, an, [['p048', 1]], 50, 'completed', { couponCode: 'WELCOME50', couponDiscount: 50000 }));
  orders.push(make(3, an, [['p012', 1]], 2, 'shipping', { payment: 'bank' }));
  orders.push(make(4, an, [['p070', 2], ['p050', 1]], 0.2, 'pending', { note: 'Giao giờ hành chính' }));
  orders.push(make(5, binh, [['p010', 1], ['p023', 1]], 52, 'completed', { couponCode: 'DONGHO10', couponDiscount: 500000 }));
  orders.push(make(6, binh, [['p057', 1]], 28, 'completed'));
  orders.push(make(7, binh, [['p026', 1]], 1, 'confirmed'));
  orders.push(make(8, cuong, [['p003', 1], ['p066', 1]], 20, 'completed'));
  orders.push(make(9, cuong, [['p040', 1]], 31, 'completed'));
  orders.push(make(10, cuong, [['p019', 1]], 5, 'cancelled'));

  // Đơn ngẫu nhiên trải 6 tháng để có số liệu báo cáo
  const pool = products.filter(p => p.price < 30000000).map(p => p.id);
  for (let i = 11; i <= 60; i++) {
    const n = 1 + Math.floor(rnd() * 2);
    const items = Array.from({ length: n }, () => [pick(pool), 1 + Math.floor(rnd() * 2)]);
    const days = 3 + Math.floor(rnd() * 180);
    const r = rnd();
    const status = days > 7 ? (r < 0.88 ? 'completed' : 'cancelled') : pick(['pending', 'confirmed', 'shipping', 'completed']);
    orders.push(make(i, pick(users), items, days, status));
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  window.SEED_ORDERS = orders;

  window.SEED_CONTACTS = [
    { id: 'lh1', name: 'Ngô Bảo Châu', email: 'chau@gmail.com', phone: '0933222111', subject: 'Bảo hành đồng hồ',
      message: 'Đồng hồ Citizen mua năm ngoái bị chạy chậm, tôi muốn mang đến bảo hành thì cần mang theo gì?', status: 'new', createdAt: new Date(Date.now() - 86400000).toISOString(), reply: null },
    { id: 'lh2', name: 'Mai Anh', email: 'maianh@gmail.com', phone: '0944555666', subject: 'Hợp tác quà tặng doanh nghiệp',
      message: 'Công ty mình cần đặt 50 đồng hồ treo tường in logo, shop báo giá giúp mình.', status: 'done', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      reply: { byName: 'Nguyễn Thu Trang', content: 'Đã gửi báo giá qua email cho chị.', at: new Date(Date.now() - 4 * 86400000).toISOString() } }
  ];
})();
