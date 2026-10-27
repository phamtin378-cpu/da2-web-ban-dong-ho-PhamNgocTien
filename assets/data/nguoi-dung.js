// Tài khoản mẫu. Đây là dự án frontend mô phỏng nên mật khẩu lưu dạng thô trong localStorage.
window.SEED_USERS = [
  { id: 'u-admin', role: 'admin', name: 'Quản trị viên', email: 'admin@timehouse.vn', phone: '0901000001',
    password: '123456', status: 'active', createdAt: '2025-01-05T08:00:00' },
  { id: 'u-staff1', role: 'staff', name: 'Nguyễn Thu Trang', email: 'trang.staff@timehouse.vn', phone: '0901000002',
    password: '123456', status: 'active', createdAt: '2025-02-10T08:00:00' },
  { id: 'u-staff2', role: 'staff', name: 'Lê Minh Đức', email: 'duc.staff@timehouse.vn', phone: '0901000003',
    password: '123456', status: 'active', createdAt: '2025-03-15T08:00:00' },
  { id: 'u-c1', role: 'customer', name: 'Trần Văn An', email: 'an@gmail.com', phone: '0912345678',
    password: '123456', status: 'active', createdAt: '2025-04-01T10:00:00',
    addresses: [
      { id: 'a1', name: 'Trần Văn An', phone: '0912345678', province: 'Hà Nội', ward: 'Phường Cầu Giấy', street: '12 Trần Thái Tông', isDefault: true },
      { id: 'a2', name: 'Trần Văn An (công ty)', phone: '0912345678', province: 'Hà Nội', ward: 'Phường Thanh Xuân', street: 'Tầng 8, 125 Nguyễn Trãi', isDefault: false }
    ], savedCoupons: ['WELCOME50', 'DONGHO10'] },
  { id: 'u-c2', role: 'customer', name: 'Phạm Thị Bình', email: 'binh@gmail.com', phone: '0987654321',
    password: '123456', status: 'active', createdAt: '2025-05-20T10:00:00',
    addresses: [
      { id: 'a1', name: 'Phạm Thị Bình', phone: '0987654321', province: 'TP. Hồ Chí Minh', ward: 'Phường Xuân Hòa', street: '45 Võ Văn Tần', isDefault: true }
    ], savedCoupons: [] },
  { id: 'u-c3', role: 'customer', name: 'Hoàng Gia Cường', email: 'cuong@gmail.com', phone: '0977111222',
    password: '123456', status: 'active', createdAt: '2025-07-11T10:00:00',
    addresses: [
      { id: 'a1', name: 'Hoàng Gia Cường', phone: '0977111222', province: 'Đà Nẵng', ward: 'Phường Hải Châu', street: '9 Lê Duẩn', isDefault: true }
    ], savedCoupons: [] },
  { id: 'u-c4', role: 'customer', name: 'Đỗ Mai Linh', email: 'linh@gmail.com', phone: '0966333444',
    password: '123456', status: 'locked', createdAt: '2025-08-02T10:00:00', addresses: [], savedCoupons: [] }
];
