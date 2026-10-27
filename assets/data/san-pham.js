// Dữ liệu sản phẩm mẫu (90 sản phẩm).
// Mỗi dòng: a(danhMucCon, thuongHieu, ten, giaGoc, giaBan|null, 'thong|so|theo|thu|tu', tuyChon)
// Thứ tự thông số khai báo trong SPEC_ORDER theo danh mục cha.
(function () {
  const SPEC_ORDER = {
    'deo-tay':     ['movement', 'strap', 'glass', 'size', 'water', 'origin', 'color', 'shape'],
    'thong-minh':  ['os', 'screen', 'battery', 'features', 'strap', 'origin', 'color', 'shape'],
    'treo-tuong':  ['size', 'frame', 'movement', 'power', 'style', 'room', 'origin', 'color', 'shape'],
    'de-ban':      ['size', 'material', 'functions', 'power', 'origin', 'color', 'shape'],
    'dong-ho-cay': ['height', 'wood', 'movement', 'chime', 'origin', 'color', 'shape'],
    'bo-tui':      ['movement', 'material', 'size', 'origin', 'color', 'shape'],
    'phu-kien':    ['type', 'material', 'size', 'origin', 'color', 'shape']
  };
  const ARRAY_KEYS = ['features', 'room', 'functions'];

  // Kiểu hình minh họa + thông số mặc định theo danh mục con
  const SUB = {
    'deo-tay-nam':        { kind: 'wrist', specs: { gender: 'Nam' } },
    'deo-tay-nu':         { kind: 'wrist', specs: { gender: 'Nữ' } },
    'deo-tay-doi':        { kind: 'wrist', specs: { gender: 'Đôi' } },
    'deo-tay-tre-em':     { kind: 'wrist', specs: { gender: 'Trẻ em' } },
    'smartwatch':         { kind: 'smart' },
    'vong-suc-khoe':      { kind: 'band' },
    'treo-tuong-co-dien': { kind: 'wall' },
    'treo-tuong-hien-dai':{ kind: 'wall' },
    'treo-tuong-go':      { kind: 'wall' },
    'treo-tuong-kim-troi':{ kind: 'wall' },
    'treo-tuong-tranh':   { kind: 'painting', heavy: true },
    'treo-tuong-qua-lac': { kind: 'pendulum', heavy: true },
    'de-ban-co-dien':     { kind: 'desk' },
    'bao-thuc':           { kind: 'alarm' },
    'dien-tu-led':        { kind: 'led' },
    'mo-hinh-nghe-thuat': { kind: 'art' },
    'dong-ho-cat':        { kind: 'hourglass' },
    'cay-go':             { kind: 'floor', heavy: true },
    'cay-co':             { kind: 'floor', heavy: true },
    'bo-tui-co':          { kind: 'pocket' },
    'bo-tui-quartz':      { kind: 'pocket' },
    'day-dong-ho':        { kind: 'strap' },
    'hop-dung':           { kind: 'box' },
    'pin':                { kind: 'battery' },
    'may-kim':            { kind: 'movement' }
  };

  const WARRANTY = { 'deo-tay': 60, 'thong-minh': 12, 'treo-tuong': 24, 'de-ban': 12, 'dong-ho-cay': 60, 'bo-tui': 24, 'phu-kien': 6 };

  const DESC = {
    'deo-tay': 'Thiết kế tinh tế, hoàn thiện chắc chắn và bộ máy vận hành chính xác. Phù hợp đeo hằng ngày, đi làm lẫn dự tiệc. Sản phẩm chính hãng, đầy đủ hộp, sổ bảo hành và thẻ của hãng.',
    'thong-minh': 'Theo dõi sức khỏe, luyện tập và nhận thông báo ngay trên cổ tay. Kết nối nhanh với điện thoại, pin bền, thiết kế gọn nhẹ đeo cả ngày lẫn khi ngủ.',
    'treo-tuong': 'Điểm nhấn trang trí cho không gian sống. Mặt số dễ đọc, bộ máy Nhật Bản vận hành ổn định, lắp đặt đơn giản với móc treo đi kèm.',
    'de-ban': 'Nhỏ gọn, tiện dụng cho bàn làm việc, đầu giường hoặc kệ trang trí. Chất liệu bền đẹp, hoàn thiện tỉ mỉ, thích hợp làm quà tặng.',
    'dong-ho-cay': 'Đồng hồ cây cao cấp với tủ gỗ tự nhiên chạm tinh xảo, bộ máy cơ châu Âu và chuông điểm giờ vang trầm. Miễn phí lắp đặt và cân chỉnh tại nhà trong nội thành.',
    'bo-tui': 'Phong cách quả quýt cổ điển, kèm dây xích. Món quà ý nghĩa cho người sưu tầm và yêu nét hoài cổ.',
    'phu-kien': 'Phụ kiện chính hãng, tương thích nhiều mẫu đồng hồ. Đổi trả trong 7 ngày nếu không vừa.'
  };

  const CAT_PARENT = {};
  (window.SEED_CATEGORIES || []).forEach(c => { if (c.parentId) CAT_PARENT[c.id] = c.parentId; });

  let seed = 20251002;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  const list = [];
  function a(cat, brand, name, price, sale, specStr, opt = {}) {
    const n = list.length + 1;
    const parent = CAT_PARENT[cat];
    const keys = SPEC_ORDER[parent];
    const values = specStr.split('|');
    const specs = Object.assign({}, (SUB[cat] && SUB[cat].specs) || {});
    keys.forEach((k, i) => {
      if (values[i] === undefined || values[i] === '') return;
      specs[k] = ARRAY_KEYS.includes(k) ? values[i].split(',').map(s => s.trim()) : values[i].trim();
    });
    const daysAgo = opt.days !== undefined ? opt.days : Math.floor(rnd() * 300);
    const created = new Date(Date.now() - daysAgo * 86400000);
    list.push({
      id: 'p' + String(n).padStart(3, '0'),
      sku: 'TH' + String(1000 + n),
      name,
      categoryId: cat,
      brandId: brand,
      price,
      salePrice: sale || null,
      stock: opt.stock !== undefined ? opt.stock : 3 + Math.floor(rnd() * 40),
      sold: opt.sold !== undefined ? opt.sold : Math.floor(rnd() * 260),
      warranty: opt.warranty || WARRANTY[parent],
      heavy: !!(opt.heavy || (SUB[cat] && SUB[cat].heavy)),
      featured: !!opt.featured,
      images: opt.images || [],          // để trống → dùng ảnh minh họa SVG tự sinh
      look: { kind: opt.kind || SUB[cat].kind },
      specs,
      description: opt.desc || DESC[parent],
      status: 'active',
      createdAt: created.toISOString()
    });
  }

  // ===== ĐỒNG HỒ NAM =====
  a('deo-tay-nam', 'casio', 'Casio MTP-1374L-1AVDF', 1850000, 1665000, 'Quartz|Da|Mineral|43.5 mm|5 ATM|Nhật Bản|Đen|Tròn', { sold: 312 });
  a('deo-tay-nam', 'casio', 'Casio MTP-VD01D-2BVUDF', 1450000, null, 'Quartz|Thép không gỉ|Mineral|45 mm|5 ATM|Nhật Bản|Xanh navy|Tròn');
  a('deo-tay-nam', 'casio', 'Casio G-Shock GA-2100-1A1DR', 3815000, 3434000, 'Quartz|Nhựa / cao su|Mineral|45.4 mm|20 ATM|Nhật Bản|Đen|Bát giác', { sold: 405, featured: true });
  a('deo-tay-nam', 'casio', 'Casio Edifice EFR-526L-1AVUDF', 3568000, null, 'Quartz|Da|Mineral|43.8 mm|10 ATM|Nhật Bản|Đen|Tròn');
  a('deo-tay-nam', 'seiko', 'Seiko 5 Sports SRPD55K1', 7650000, 6885000, 'Automatic|Thép không gỉ|Hardlex|42.5 mm|10 ATM|Nhật Bản|Đen|Tròn', { sold: 228, featured: true });
  a('deo-tay-nam', 'seiko', 'Seiko Presage Cocktail Time SRPB43J1', 12400000, null, 'Automatic|Da|Hardlex|40.5 mm|5 ATM|Nhật Bản|Xanh dương|Tròn', { days: 8 });
  a('deo-tay-nam', 'seiko', 'Seiko Prospex Solar SNE499P1', 11200000, null, 'Solar|Silicone|Hardlex|43.5 mm|20 ATM|Nhật Bản|Đen|Tròn');
  a('deo-tay-nam', 'citizen', 'Citizen Eco-Drive BM7108-81L', 5890000, 5301000, 'Eco-Drive|Thép không gỉ|Sapphire|40 mm|10 ATM|Nhật Bản|Xanh navy|Tròn', { sold: 190 });
  a('deo-tay-nam', 'citizen', 'Citizen Automatic NJ0100-89L', 8550000, null, 'Automatic|Thép không gỉ|Sapphire|40 mm|5 ATM|Nhật Bản|Xanh navy|Tròn', { days: 12 });
  a('deo-tay-nam', 'orient', 'Orient Bambino RA-AC0M03B10B', 5620000, 4990000, 'Automatic|Da|Mineral|40.5 mm|3 ATM|Nhật Bản|Đen|Tròn', { sold: 275, featured: true });
  a('deo-tay-nam', 'orient', 'Orient Star RE-AV0005L00B', 16800000, null, 'Automatic|Da|Sapphire|41 mm|5 ATM|Nhật Bản|Xanh navy|Tròn');
  a('deo-tay-nam', 'tissot', 'Tissot PRX T137.410.11.041.00', 12900000, null, 'Quartz|Thép không gỉ|Sapphire|40 mm|10 ATM|Thụy Sĩ|Xanh dương|Tròn', { sold: 166, featured: true });
  a('deo-tay-nam', 'tissot', 'Tissot Le Locle Powermatic 80 T006.407.16.033.00', 19650000, null, 'Automatic|Da|Sapphire|39.3 mm|3 ATM|Thụy Sĩ|Trắng|Tròn');
  a('deo-tay-nam', 'longines', 'Longines Master Collection L2.793.4.78.3', 72500000, null, 'Automatic|Da|Sapphire|40 mm|3 ATM|Thụy Sĩ|Bạc|Tròn', { stock: 2, sold: 14 });
  a('deo-tay-nam', 'longines', 'Longines HydroConquest L3.781.4.56.6', 46800000, null, 'Automatic|Thép không gỉ|Sapphire|41 mm|30 ATM|Thụy Sĩ|Xanh dương|Tròn', { stock: 3, sold: 22, days: 5 });
  a('deo-tay-nam', 'fossil', 'Fossil Townsman FS5439', 4290000, 3432000, 'Quartz|Da|Mineral|44 mm|5 ATM|Mỹ|Nâu|Tròn');

  // ===== ĐỒNG HỒ NỮ =====
  a('deo-tay-nu', 'casio', 'Casio LTP-V005L-7B2UDF', 950000, null, 'Quartz|Da|Mineral|25 mm|3 ATM|Nhật Bản|Trắng|Tròn', { sold: 240 });
  a('deo-tay-nu', 'casio', 'Casio Sheen SHE-4540CGM-4AUDF', 4200000, 3780000, 'Quartz|Thép không gỉ|Sapphire|28 mm|5 ATM|Nhật Bản|Vàng hồng|Tròn');
  a('deo-tay-nu', 'seiko', 'Seiko Solar SUP250P1', 4950000, null, 'Solar|Thép không gỉ|Hardlex|29 mm|3 ATM|Nhật Bản|Trắng|Tròn');
  a('deo-tay-nu', 'citizen', 'Citizen Eco-Drive EM0500-73A', 7350000, 6615000, 'Eco-Drive|Thép không gỉ|Sapphire|30 mm|5 ATM|Nhật Bản|Bạc|Tròn', { featured: true });
  a('deo-tay-nu', 'citizen', 'Citizen Eco-Drive EM0790-55N', 8900000, null, 'Eco-Drive|Thép không gỉ|Sapphire|30.5 mm|5 ATM|Nhật Bản|Xanh navy|Tròn', { days: 3 });
  a('deo-tay-nu', 'orient', 'Orient Automatic RA-NB0102S10B', 5900000, null, 'Automatic|Da|Mineral|30.5 mm|5 ATM|Nhật Bản|Trắng|Tròn');
  a('deo-tay-nu', 'tissot', 'Tissot Lovely Square T058.109.33.031.00', 9850000, 8865000, 'Quartz|Thép không gỉ|Sapphire|20 mm|3 ATM|Thụy Sĩ|Bạc|Vuông', { featured: true });
  a('deo-tay-nu', 'tissot', 'Tissot Everytime Lady T143.210.11.011.00', 7890000, null, 'Quartz|Thép không gỉ|Sapphire|34 mm|3 ATM|Thụy Sĩ|Trắng|Tròn', { days: 15 });
  a('deo-tay-nu', 'longines', 'Longines DolceVita L5.512.4.71.6', 52900000, null, 'Quartz|Da|Sapphire|23.3 x 37 mm|3 ATM|Thụy Sĩ|Trắng|Chữ nhật', { stock: 2, sold: 9 });
  a('deo-tay-nu', 'dw', 'Daniel Wellington Petite Melrose 32mm', 4190000, 3350000, 'Quartz|Thép lưới|Mineral|32 mm|3 ATM|Thụy Điển|Vàng hồng|Tròn', { sold: 330, featured: true });
  a('deo-tay-nu', 'dw', 'Daniel Wellington Classic Sheffield 28mm', 3690000, null, 'Quartz|Da|Mineral|28 mm|3 ATM|Thụy Điển|Trắng|Tròn');
  a('deo-tay-nu', 'fossil', 'Fossil Jacqueline ES3546', 3450000, 2760000, 'Quartz|Da|Mineral|36 mm|3 ATM|Mỹ|Nâu|Tròn');

  // ===== ĐỒNG HỒ ĐÔI =====
  a('deo-tay-doi', 'casio', 'Cặp đôi Casio MTP-1302D & LTP-1302D', 2790000, null, 'Quartz|Thép không gỉ|Mineral|38 mm & 25 mm|5 ATM|Nhật Bản|Trắng|Tròn');
  a('deo-tay-doi', 'citizen', 'Cặp đôi Citizen Eco-Drive BM7100 & EW1560', 13200000, 11880000, 'Eco-Drive|Thép không gỉ|Sapphire|40 mm & 26 mm|5 ATM|Nhật Bản|Trắng|Tròn');
  a('deo-tay-doi', 'dw', 'Bộ đôi Daniel Wellington Classic Bristol', 7990000, 6790000, 'Quartz|Da|Mineral|36 mm & 32 mm|3 ATM|Thụy Điển|Đen|Tròn', { sold: 152 });
  a('deo-tay-doi', 'orient', 'Cặp đôi Orient Bambino RA-AP0105 & RA-NB0104', 11500000, null, 'Automatic|Da|Mineral|38 mm & 30 mm|3 ATM|Nhật Bản|Trắng|Tròn', { days: 20 });

  // ===== TRẺ EM =====
  a('deo-tay-tre-em', 'casio', 'Casio Kids LRW-200H-2BVDF', 850000, null, 'Quartz|Nhựa|Nhựa|34 mm|10 ATM|Nhật Bản|Xanh dương|Tròn');
  a('deo-tay-tre-em', 'casio', 'Casio Baby-G BGA-280-4ADR', 2950000, 2655000, 'Quartz|Nhựa / cao su|Mineral|43 mm|10 ATM|Nhật Bản|Hồng|Tròn');
  a('deo-tay-tre-em', 'timehouse', 'TIMEHOUSE Kids Dino', 390000, null, 'Quartz|Silicone|Nhựa|32 mm|3 ATM|Việt Nam|Xanh lá|Tròn', { days: 6 });
  a('deo-tay-tre-em', 'casio', 'Casio W-218H-4BVDF', 690000, null, 'Quartz|Nhựa|Nhựa|43 mm|5 ATM|Nhật Bản|Đỏ|Vuông');

  // ===== THÔNG MINH =====
  a('smartwatch', 'apple', 'Apple Watch Series 10 GPS 42mm', 10990000, 10290000, 'iOS|1.65 inch LTPO OLED|18 giờ|GPS,Đo nhịp tim,SpO2,ECG,Thông báo|Silicone|Mỹ|Đen|Chữ nhật', { sold: 210, featured: true });
  a('smartwatch', 'apple', 'Apple Watch SE 2 GPS 40mm', 6290000, null, 'iOS|1.57 inch OLED|18 giờ|GPS,Đo nhịp tim,Thông báo|Silicone|Mỹ|Trắng|Chữ nhật');
  a('smartwatch', 'apple', 'Apple Watch Ultra 2 49mm', 21990000, null, 'iOS|1.92 inch LTPO OLED|36 giờ|GPS,Đo nhịp tim,SpO2,ECG,Nghe gọi,Lặn biển|Vải|Mỹ|Bạc|Chữ nhật', { days: 10 });
  a('smartwatch', 'samsung', 'Samsung Galaxy Watch7 44mm', 7490000, 5990000, 'Android|1.5 inch Super AMOLED|40 giờ|GPS,Đo nhịp tim,SpO2,ECG,Thông báo|Silicone|Hàn Quốc|Xanh lá|Tròn', { sold: 180 });
  a('smartwatch', 'garmin', 'Garmin Forerunner 265', 10490000, null, 'iOS & Android|1.3 inch AMOLED|13 ngày|GPS,Đo nhịp tim,SpO2,Thông báo|Silicone|Mỹ|Đen|Tròn');
  a('smartwatch', 'garmin', 'Garmin Venu 3', 11990000, 10790000, 'iOS & Android|1.4 inch AMOLED|14 ngày|GPS,Đo nhịp tim,SpO2,Nghe gọi|Silicone|Mỹ|Trắng|Tròn');
  a('vong-suc-khoe', 'xiaomi', 'Xiaomi Smart Band 9', 990000, 850000, 'iOS & Android|1.62 inch AMOLED|21 ngày|Đo nhịp tim,SpO2,Thông báo|Silicone|Trung Quốc|Đen|Chữ nhật', { sold: 520 });
  a('vong-suc-khoe', 'samsung', 'Samsung Galaxy Fit3', 1290000, null, 'Android|1.6 inch AMOLED|13 ngày|Đo nhịp tim,SpO2,Thông báo|Silicone|Hàn Quốc|Xám|Chữ nhật');

  // ===== TREO TƯỜNG =====
  a('treo-tuong-co-dien', 'rhythm', 'Đồng hồ treo tường Rhythm CMG494NR06', 2850000, null, '38 cm|Gỗ|Kim trôi|Pin AA|Cổ điển|Phòng khách,Phòng làm việc|Nhật Bản|Nâu|Tròn');
  a('treo-tuong-co-dien', 'vinh-hung', 'Đồng hồ treo tường La Mã viền đồng', 980000, 790000, '40 cm|Kim loại|Kim giật|Pin AA|Cổ điển|Phòng khách|Việt Nam|Vàng đồng|Tròn', { sold: 288 });
  a('treo-tuong-co-dien', 'howard-miller', 'Howard Miller Gallery Dalton 625-279', 6500000, null, '62 cm|Kim loại|Kim trôi|Pin AA|Cổ điển|Phòng khách|Mỹ|Đen|Tròn', { heavy: true });
  a('treo-tuong-hien-dai', 'karlsson', 'Karlsson Station KA5507', 2290000, 1830000, '50 cm|Kim loại|Kim trôi|Pin AA|Hiện đại|Phòng khách,Văn phòng|Hà Lan|Đen|Tròn', { featured: true });
  a('treo-tuong-hien-dai', 'karlsson', 'Karlsson Numbers Cutout', 1690000, null, '40 cm|Nhựa|Kim trôi|Pin AA|Bắc Âu|Phòng khách,Phòng ngủ|Hà Lan|Trắng|Tròn', { days: 4 });
  a('treo-tuong-hien-dai', 'timehouse', 'TIMEHOUSE Minimal Line 30cm', 450000, null, '30 cm|Nhựa|Kim trôi|Pin AA|Tối giản|Phòng ngủ,Văn phòng|Việt Nam|Trắng|Tròn', { sold: 410 });
  a('treo-tuong-go', 'rhythm', 'Rhythm gỗ óc chó CMG545', 3650000, null, '35 cm|Gỗ|Kim trôi|Pin AA|Bắc Âu|Phòng khách|Nhật Bản|Gỗ tự nhiên|Tròn');
  a('treo-tuong-go', 'timehouse', 'Đồng hồ gỗ sồi khắc laser', 690000, 590000, '30 cm|Gỗ|Kim trôi|Pin AA|Á Đông|Phòng khách,Phòng ngủ|Việt Nam|Gỗ tự nhiên|Tròn', { sold: 196 });
  a('treo-tuong-go', 'vinh-hung', 'Đồng hồ gỗ hương mặt vuông', 1250000, null, '35 x 35 cm|Gỗ|Kim giật|Pin AA|Á Đông|Phòng khách|Việt Nam|Nâu|Vuông');
  a('treo-tuong-kim-troi', 'rhythm', 'Rhythm Silent Sweep CMG734', 1450000, null, '28 cm|Nhựa|Kim trôi|Pin AA|Hiện đại|Phòng ngủ|Nhật Bản|Trắng|Tròn');
  a('treo-tuong-kim-troi', 'karlsson', 'Karlsson Silent Mini', 990000, null, '27 cm|Nhựa|Kim trôi|Pin AA|Tối giản|Phòng ngủ,Phòng trẻ em|Hà Lan|Xanh lá|Tròn');
  a('treo-tuong-kim-troi', 'timehouse', 'Kim trôi khung nhôm 40cm', 790000, 650000, '40 cm|Kim loại|Kim trôi|Pin AA|Hiện đại|Văn phòng|Việt Nam|Bạc|Tròn');
  a('treo-tuong-tranh', 'timehouse', 'Đồng hồ tranh Hoa sen 3 tấm', 1850000, 1490000, '120 x 60 cm|Mica|Kim trôi|Pin AA|Á Đông|Phòng khách|Việt Nam|Vàng đồng|Chữ nhật', { sold: 140 });
  a('treo-tuong-tranh', 'timehouse', 'Tranh đồng hồ Phố cổ Hà Nội', 1450000, null, '90 x 60 cm|Canvas|Kim trôi|Pin AA|Á Đông|Phòng khách|Việt Nam|Nâu|Chữ nhật');
  a('treo-tuong-tranh', 'vinh-hung', 'Tranh đồng hồ Mã đáo thành công', 2350000, null, '100 x 50 cm|Gỗ|Kim trôi|Pin AA|Á Đông|Phòng khách,Văn phòng|Việt Nam|Vàng đồng|Chữ nhật', { days: 9 });
  a('treo-tuong-qua-lac', 'hermle', 'Hermle quả lắc treo tường 70509', 28500000, null, '68 cm|Gỗ|Quả lắc|Lên dây cót|Cổ điển|Phòng khách|Đức|Nâu|Chữ nhật', { stock: 2 });
  a('treo-tuong-qua-lac', 'rhythm', 'Rhythm quả lắc Melody CMJ502', 8900000, 7990000, '72 cm|Gỗ|Quả lắc|Pin AA|Cổ điển|Phòng khách|Nhật Bản|Nâu|Chữ nhật', { featured: true });
  a('treo-tuong-qua-lac', 'howard-miller', 'Howard Miller quả lắc 625-361', 12600000, null, '60 cm|Gỗ|Quả lắc|Pin AA|Cổ điển|Phòng khách|Mỹ|Gỗ tự nhiên|Chữ nhật');

  // ===== ĐỂ BÀN / TRANG TRÍ =====
  a('de-ban-co-dien', 'rhythm', 'Đồng hồ để bàn Rhythm CRG127', 2450000, null, '22 x 17 cm|Gỗ|Báo giờ,Âm nhạc|Pin AA|Nhật Bản|Nâu|Chữ nhật');
  a('de-ban-co-dien', 'hermle', 'Hermle Carriage 22864', 15900000, null, '15 cm|Đồng thau|Chuông|Lên dây cót|Đức|Vàng đồng|Chữ nhật', { stock: 4 });
  a('de-ban-co-dien', 'howard-miller', 'Howard Miller Chaplin để bàn', 3200000, null, '25 cm|Gỗ|Kim trôi|Pin AA|Mỹ|Gỗ tự nhiên|Vòm');
  a('bao-thuc', 'seiko', 'Seiko báo thức QHE137W', 650000, null, '12 cm|Nhựa|Báo thức,Đèn nền,Snooze|Pin AA|Nhật Bản|Trắng|Tròn', { sold: 230 });
  a('bao-thuc', 'rhythm', 'Rhythm báo thức chuông kép 4RA456', 890000, 750000, '14 cm|Kim loại|Báo thức,Chuông kép|Pin AA|Nhật Bản|Đỏ|Tròn');
  a('bao-thuc', 'karlsson', 'Karlsson báo thức Retro Bell', 720000, null, '11 cm|Kim loại|Báo thức,Kim trôi|Pin AA|Hà Lan|Xanh lá|Tròn', { days: 2 });
  a('dien-tu-led', 'casio', 'Casio điện tử DQ-982N', 520000, null, '12 x 8 cm|Nhựa|Báo thức,Nhiệt độ,Lịch|Pin AA|Nhật Bản|Đen|Chữ nhật');
  a('dien-tu-led', 'xiaomi', 'Xiaomi Mijia đồng hồ nhiệt ẩm', 590000, 490000, '10 x 10 cm|Nhựa|Nhiệt độ,Độ ẩm,Lịch,Đèn LED|Pin AAA|Trung Quốc|Trắng|Vuông', { sold: 350 });
  a('dien-tu-led', 'timehouse', 'Đồng hồ LED gỗ tráng gương', 450000, null, '15 x 7 cm|Gỗ|Báo thức,Nhiệt độ,Đèn LED,Cảm biến âm thanh|Cắm điện USB|Việt Nam|Gỗ tự nhiên|Chữ nhật', { sold: 260 });
  a('mo-hinh-nghe-thuat', 'timehouse', 'Mô hình thuyền buồm gắn đồng hồ', 1290000, null, '35 cm|Gỗ|Trang trí|Pin AA|Việt Nam|Nâu|Khác');
  a('mo-hinh-nghe-thuat', 'timehouse', 'Tượng phi hành gia ôm đồng hồ', 890000, null, '20 cm|Resin|Trang trí|Pin AA|Việt Nam|Trắng|Khác', { days: 7 });
  a('dong-ho-cat', 'timehouse', 'Đồng hồ cát 30 phút khung gỗ', 350000, 290000, '18 cm|Gỗ, thủy tinh|Đếm giờ 30 phút|Không cần điện|Việt Nam|Gỗ tự nhiên|Khác');

  // ===== ĐỒNG HỒ CÂY =====
  a('cay-go', 'hermle', 'Đồng hồ cây Hermle Shrewsbury 01150', 125000000, null, '198 cm|Gỗ óc chó|Cơ lên dây|Westminster|Đức|Nâu|Chữ nhật', { stock: 1, sold: 3 });
  a('cay-co', 'howard-miller', 'Đồng hồ cây Howard Miller 611-019', 89000000, 79900000, '205 cm|Gỗ anh đào|Cơ lên dây|Westminster, Whittington, St. Michael|Mỹ|Nâu|Chữ nhật', { stock: 2, sold: 5, featured: true });
  a('cay-go', 'rhythm', 'Đồng hồ cây Rhythm CRJ609', 32500000, null, '185 cm|Gỗ sồi|Điện tử (pin)|Westminster, Big Ben|Nhật Bản|Gỗ tự nhiên|Chữ nhật', { stock: 3, sold: 11 });
  a('cay-co', 'vinh-hung', 'Đồng hồ cây gỗ gụ chạm khắc', 45000000, null, '210 cm|Gỗ gụ|Cơ lên dây|Westminster|Việt Nam|Nâu|Chữ nhật', { stock: 2, sold: 6 });

  // ===== BỎ TÚI =====
  a('bo-tui-co', 'timehouse', 'Đồng hồ bỏ túi lộ cơ Skeleton', 1650000, 1390000, 'Cơ lên dây|Thép mạ đồng|45 mm|Việt Nam|Vàng đồng|Tròn', { sold: 120 });
  a('bo-tui-co', 'tissot', 'Tissot Savonnette T862.410.29.293.00', 18900000, null, 'Cơ lên dây|Thép không gỉ|48.5 mm|Thụy Sĩ|Bạc|Tròn', { stock: 2 });
  a('bo-tui-quartz', 'timehouse', 'Đồng hồ bỏ túi khắc rồng', 790000, null, 'Quartz|Hợp kim|47 mm|Việt Nam|Bạc|Tròn');
  a('bo-tui-quartz', 'tissot', 'Tissot Lepine T859.410.29.273.00', 14500000, null, 'Quartz|Thép không gỉ|49 mm|Thụy Sĩ|Vàng|Tròn');

  // ===== PHỤ KIỆN =====
  a('day-dong-ho', 'timehouse', 'Dây da bò Ý 20mm', 450000, null, 'Dây đồng hồ|Da bò|20 mm|Việt Nam|Nâu|Khác', { sold: 380 });
  a('day-dong-ho', 'dw', 'Dây lưới Daniel Wellington Mesh 18mm', 1290000, null, 'Dây đồng hồ|Thép lưới|18 mm|Thụy Điển|Bạc|Khác');
  a('day-dong-ho', 'timehouse', 'Dây cao su FKM 22mm', 390000, null, 'Dây đồng hồ|Cao su|22 mm|Việt Nam|Đen|Khác');
  a('hop-dung', 'timehouse', 'Hộp đựng đồng hồ 6 ngăn da PU', 690000, 590000, 'Hộp đựng|Da PU|6 ngăn|Việt Nam|Đen|Chữ nhật', { sold: 175 });
  a('hop-dung', 'timehouse', 'Hộp lắc đồng hồ cơ 2 vị trí', 2450000, null, 'Hộp lắc (watch winder)|Gỗ|2 đồng hồ|Việt Nam|Gỗ tự nhiên|Vuông');
  a('pin', 'timehouse', 'Pin đồng hồ Renata 371 (SR920SW)', 60000, null, 'Pin|Bạc oxit|SR920SW|Thụy Sĩ|Bạc|Tròn', { stock: 200, sold: 640 });
  a('pin', 'timehouse', 'Pin Panasonic CR2032 vỉ 5 viên', 90000, null, 'Pin|Lithium|CR2032|Nhật Bản|Bạc|Tròn', { stock: 150, sold: 420 });
  a('may-kim', 'rhythm', 'Máy kim trôi treo tường Rhythm', 290000, null, 'Bộ máy thay thế|Nhựa ABS|Trục 16 mm|Nhật Bản|Đen|Vuông');

  window.SEED_PRODUCTS = list;
})();
