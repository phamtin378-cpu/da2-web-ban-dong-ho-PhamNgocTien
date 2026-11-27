// Chương trình khuyến mãi mẫu. Ngày tính tương đối so với thời điểm khởi tạo dữ liệu.
// type: flashsale (giá sốc theo suất, có thời gian) | coupon (mã giảm giá cho đơn hàng)
(function () {
  const day = 86400000;
  const iso = (offsetDays, h = 0, m = 0) => {
    const d = new Date(Date.now() + offsetDays * day);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  window.SEED_PROMOTIONS = [
    {
      id: 'km-flash', type: 'flashsale', name: 'Flash Sale cuối ngày', active: true,
      start: iso(0, 0, 0), end: iso(0, 23, 59),
      items: [
        { productId: 'p001', salePrice: 1390000, quota: 20, sold: 13 },
        { productId: 'p043', salePrice: 749000, quota: 30, sold: 24 },
        { productId: 'p050', salePrice: 359000, quota: 25, sold: 9 },
        { productId: 'p070', salePrice: 399000, quota: 20, sold: 17 }
      ],
      description: 'Giá sốc trong ngày, số lượng có hạn.'
    },
    {
      id: 'km-welcome', type: 'coupon', name: 'Chào bạn mới', code: 'WELCOME50', active: true,
      start: iso(-60), end: iso(120, 23, 59),
      discountType: 'fixed', value: 50000, minOrder: 500000, maxDiscount: null,
      usageLimit: 1000, used: 214, perUser: 1,
      description: 'Giảm 50.000₫ cho đơn từ 500.000₫.'
    },
    {
      id: 'km-dongho10', type: 'coupon', name: 'Giảm 10% đơn từ 3 triệu', code: 'DONGHO10', active: true,
      start: iso(-10), end: iso(30, 23, 59),
      discountType: 'percent', value: 10, minOrder: 3000000, maxDiscount: 500000,
      usageLimit: 300, used: 87, perUser: 2,
      description: 'Giảm 10% tối đa 500.000₫ cho đơn từ 3.000.000₫.'
    },
    {
      id: 'km-vip', type: 'coupon', name: 'Ưu đãi khách VIP', code: 'VIP500', active: true,
      start: iso(-2), end: iso(14, 23, 59),
      discountType: 'fixed', value: 500000, minOrder: 10000000, maxDiscount: null,
      usageLimit: 50, used: 12, perUser: 1,
      description: 'Giảm 500.000₫ cho đơn từ 10.000.000₫.'
    },
    {
      id: 'km-tet', type: 'coupon', name: 'Mừng xuân sớm', code: 'TET2027', active: true,
      start: iso(40), end: iso(70, 23, 59),
      discountType: 'percent', value: 15, minOrder: 2000000, maxDiscount: 800000,
      usageLimit: 500, used: 0, perUser: 1,
      description: 'Sắp diễn ra – giảm 15% tối đa 800.000₫.'
    },
    {
      id: 'km-he', type: 'coupon', name: 'Hè rực rỡ', code: 'SUMMER20', active: true,
      start: iso(-120), end: iso(-30, 23, 59),
      discountType: 'percent', value: 20, minOrder: 1000000, maxDiscount: 400000,
      usageLimit: 400, used: 400, perUser: 1,
      description: 'Đã kết thúc.'
    }
  ];
})();
