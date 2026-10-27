// Định nghĩa các thuộc tính có thể lọc (key nằm trong product.specs)
window.FILTER_DEFS = {
  gender:    { label: 'Giới tính' },
  movement:  { label: 'Loại máy' },
  strap:     { label: 'Chất liệu dây' },
  glass:     { label: 'Mặt kính' },
  size:      { label: 'Kích thước', unit: '' },
  water:     { label: 'Chống nước' },
  os:        { label: 'Tương thích' },
  screen:    { label: 'Màn hình' },
  battery:   { label: 'Thời lượng pin' },
  features:  { label: 'Tính năng' },
  frame:     { label: 'Chất liệu khung' },
  power:     { label: 'Nguồn điện' },
  style:     { label: 'Phong cách' },
  room:      { label: 'Phòng phù hợp' },
  material:  { label: 'Chất liệu' },
  functions: { label: 'Chức năng' },
  height:    { label: 'Chiều cao' },
  wood:      { label: 'Loại gỗ' },
  chime:     { label: 'Chuông điểm giờ' },
  type:      { label: 'Loại phụ kiện' },
  origin:    { label: 'Xuất xứ' },
  color:     { label: 'Màu sắc' },
  shape:     { label: 'Kiểu dáng' }
};

// Thứ tự hiển thị thông số trên trang chi tiết / so sánh
window.SPEC_LABELS = Object.assign({}, Object.fromEntries(
  Object.entries(window.FILTER_DEFS).map(([k, v]) => [k, v.label])
));

// Cây danh mục 2 cấp. Danh mục cha khai báo bộ lọc riêng (filters) – thuộc tính chung được thêm tự động.
window.COMMON_FILTERS = ['origin', 'color', 'shape'];

window.SEED_CATEGORIES = [
  { id: 'deo-tay', name: 'Đồng hồ đeo tay', short: 'Đeo tay', parentId: null, icon: 'bi-watch', order: 1,
    desc: 'Đồng hồ nam, nữ, đôi và trẻ em chính hãng từ Nhật Bản, Thụy Sĩ.',
    filters: ['gender', 'movement', 'strap', 'glass', 'size', 'water'] },
  { id: 'deo-tay-nam', name: 'Đồng hồ nam', parentId: 'deo-tay', order: 1 },
  { id: 'deo-tay-nu', name: 'Đồng hồ nữ', parentId: 'deo-tay', order: 2 },
  { id: 'deo-tay-doi', name: 'Đồng hồ đôi', parentId: 'deo-tay', order: 3 },
  { id: 'deo-tay-tre-em', name: 'Đồng hồ trẻ em', parentId: 'deo-tay', order: 4 },

  { id: 'thong-minh', name: 'Đồng hồ thông minh', short: 'Thông minh', parentId: null, icon: 'bi-smartwatch', order: 2,
    desc: 'Smartwatch và vòng đeo theo dõi sức khỏe.',
    filters: ['os', 'screen', 'battery', 'features', 'strap'] },
  { id: 'smartwatch', name: 'Smartwatch', parentId: 'thong-minh', order: 1 },
  { id: 'vong-suc-khoe', name: 'Vòng đeo sức khỏe', parentId: 'thong-minh', order: 2 },

  { id: 'treo-tuong', name: 'Đồng hồ treo tường', short: 'Treo tường', parentId: null, icon: 'bi-clock', order: 3,
    desc: 'Điểm nhấn cho phòng khách, phòng ngủ và văn phòng.',
    filters: ['size', 'frame', 'movement', 'power', 'style', 'room'] },
  { id: 'treo-tuong-co-dien', name: 'Cổ điển', parentId: 'treo-tuong', order: 1 },
  { id: 'treo-tuong-hien-dai', name: 'Hiện đại / tối giản', parentId: 'treo-tuong', order: 2 },
  { id: 'treo-tuong-go', name: 'Đồng hồ gỗ', parentId: 'treo-tuong', order: 3 },
  { id: 'treo-tuong-kim-troi', name: 'Kim trôi (không tiếng)', parentId: 'treo-tuong', order: 4 },
  { id: 'treo-tuong-tranh', name: 'Đồng hồ tranh', parentId: 'treo-tuong', order: 5 },
  { id: 'treo-tuong-qua-lac', name: 'Quả lắc treo tường', parentId: 'treo-tuong', order: 6 },

  { id: 'de-ban', name: 'Đồng hồ để bàn / trang trí', short: 'Để bàn & trang trí', parentId: null, icon: 'bi-alarm', order: 4,
    desc: 'Đồng hồ để bàn, báo thức, LED và đồ trang trí nghệ thuật.',
    filters: ['size', 'material', 'functions', 'power'] },
  { id: 'de-ban-co-dien', name: 'Để bàn', parentId: 'de-ban', order: 1 },
  { id: 'bao-thuc', name: 'Báo thức', parentId: 'de-ban', order: 2 },
  { id: 'dien-tu-led', name: 'Điện tử LED', parentId: 'de-ban', order: 3 },
  { id: 'mo-hinh-nghe-thuat', name: 'Mô hình / nghệ thuật', parentId: 'de-ban', order: 4 },
  { id: 'dong-ho-cat', name: 'Đồng hồ cát', parentId: 'de-ban', order: 5 },

  { id: 'dong-ho-cay', name: 'Đồng hồ cây', short: 'Đồng hồ cây', parentId: null, icon: 'bi-hourglass-bottom', order: 5,
    desc: 'Đồng hồ cây, quả lắc đứng – bộ máy cơ châu Âu.',
    filters: ['height', 'wood', 'movement', 'chime'] },
  { id: 'cay-go', name: 'Đồng hồ cây gỗ', parentId: 'dong-ho-cay', order: 1 },
  { id: 'cay-co', name: 'Đồng hồ cây cơ', parentId: 'dong-ho-cay', order: 2 },

  { id: 'bo-tui', name: 'Đồng hồ bỏ túi', short: 'Bỏ túi', parentId: null, icon: 'bi-stopwatch', order: 6,
    desc: 'Đồng hồ quả quýt cổ điển, máy cơ và quartz.',
    filters: ['movement', 'material', 'size'] },
  { id: 'bo-tui-co', name: 'Bỏ túi máy cơ', parentId: 'bo-tui', order: 1 },
  { id: 'bo-tui-quartz', name: 'Bỏ túi quartz', parentId: 'bo-tui', order: 2 },

  { id: 'phu-kien', name: 'Phụ kiện', short: 'Phụ kiện', parentId: null, icon: 'bi-tools', order: 7,
    desc: 'Dây đồng hồ, hộp đựng, pin và bộ máy thay thế.',
    filters: ['type', 'material', 'size'] },
  { id: 'day-dong-ho', name: 'Dây đồng hồ', parentId: 'phu-kien', order: 1 },
  { id: 'hop-dung', name: 'Hộp đựng / hộp lắc', parentId: 'phu-kien', order: 2 },
  { id: 'pin', name: 'Pin đồng hồ', parentId: 'phu-kien', order: 3 },
  { id: 'may-kim', name: 'Máy kim treo tường', parentId: 'phu-kien', order: 4 }
];
