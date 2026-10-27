// Chương trình khuyến mãi mẫu. Ngày tính tương đối so với thời điểm khởi tạo dữ liệu.
// type: discount (giảm giá SP) | flashsale | coupon | gift
// scope: { type: 'all' | 'products' | 'categories' | 'brands', ids: [] }  (categories chấp nhận cả id danh mục cha)
(function () {
  const day = 86400000;
  const iso = (offsetDays, h = 0, m = 0) => {
    const d = new Date(Date.now() + offsetDays * day);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  window.SEED_PROMOTIONS = [
    {
      id: 'km-seiko', type: 'discount', name: 'Tuần lễ Seiko – giảm 10%', active: true,
      start: iso(-3), end: iso(10, 23, 59),
      scope: { type: 'brands', ids: ['seiko'] }, discountType: 'percent', value: 10, maxDiscount: null,
      banner: { title: 'Tuần lễ Seiko', subtitle: 'Giảm thêm 10% toàn bộ đồng hồ Seiko', image: '' },
      description: 'Áp dụng cho tất cả sản phẩm thương hiệu Seiko.'
    },
    {
      id: 'km-treo-tuong', type: 'discount', name: 'Làm mới không gian – treo tường giảm 15%', active: true,
      start: iso(-5), end: iso(20, 23, 59),
      scope: { type: 'categories', ids: ['treo-tuong'] }, discountType: 'percent', value: 15, maxDiscount: 1000000,
      banner: { title: 'Làm mới không gian sống', subtitle: 'Đồng hồ treo tường giảm đến 15%', image: '' },
      description: 'Giảm 15% (tối đa 1.000.000₫) cho đồng hồ treo tường.'
    },
    {
      id: 'km-flash', type: 'flashsale', name: 'Flash Sale cuối ngày', active: true,
      start: iso(0, 0, 0), end: iso(0, 23, 59),
      items: [
        { productId: 'p001', salePrice: 1390000, quota: 20, sold: 13 },
        { productId: 'p017', salePrice: 790000, quota: 15, sold: 6 },
        { productId: 'p043', salePrice: 749000, quota: 30, sold: 24 },
        { productId: 'p050', salePrice: 359000, quota: 25, sold: 9 },
        { productId: 'p070', salePrice: 399000, quota: 20, sold: 17 },
        { productId: 'p086', salePrice: 490000, quota: 10, sold: 3 }
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
    },
    {
      id: 'km-qua-day', type: 'gift', name: 'Tặng dây da khi mua đồng hồ đeo tay từ 3 triệu', active: true,
      start: iso(-15), end: iso(45, 23, 59),
      scope: { type: 'categories', ids: ['deo-tay'] }, minOrder: 0, minItemPrice: 3000000,
      gift: 'Dây da bò Ý trị giá 450.000₫',
      description: 'Mỗi đồng hồ đeo tay có giá từ 3.000.000₫ được tặng kèm 1 dây da.'
    },
    {
      id: 'km-qua-khac', type: 'gift', name: 'Khắc tên & gói quà miễn phí đơn từ 2 triệu', active: true,
      start: iso(-7), end: iso(25, 23, 59),
      scope: { type: 'all', ids: [] }, minOrder: 2000000, minItemPrice: 0,
      gift: 'Miễn phí khắc tên và gói quà',
      freeServices: ['engrave', 'giftWrap'],
      description: 'Đơn hàng từ 2.000.000₫ được miễn phí dịch vụ khắc tên và gói quà.'
    },
    {
      id: 'km-casio-pause', type: 'discount', name: 'Casio đồng giá (tạm dừng)', active: false,
      start: iso(-1), end: iso(15, 23, 59),
      scope: { type: 'brands', ids: ['casio'] }, discountType: 'fixed', value: 200000, maxDiscount: null,
      description: 'Chương trình đang tạm dừng.'
    }
  ];
})();
