// Đăng nhập / phân quyền. 3 vai trò: customer, staff, admin.
const Auth = {
  ROLES: { customer: 'Khách hàng', staff: 'Nhân viên', admin: 'Quản trị viên' },

  user() {
    const s = DB.get('session');
    if (!s) return null;
    const u = DB.find('users', s.userId);
    if (!u || u.status === 'locked') { DB.remove('session'); return null; }
    return u;
  },

  is(...roles) {
    const u = Auth.user();
    return !!u && roles.includes(u.role);
  },

  isStaff() { return Auth.is('staff', 'admin'); },

  login(account, password) {
    const key = String(account).trim().toLowerCase();
    const u = DB.all('users').find(x => x.email.toLowerCase() === key || x.phone === key);
    if (!u || u.password !== password) return { ok: false, error: 'Email/số điện thoại hoặc mật khẩu không đúng.' };
    if (u.status === 'locked') return { ok: false, error: 'Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng.' };
    DB.set('session', { userId: u.id, at: new Date().toISOString() });
    return { ok: true, user: u };
  },

  register({ name, email, phone, password }) {
    const users = DB.all('users');
    if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) return { ok: false, field: 'email', error: 'Email đã được sử dụng.' };
    if (users.some(u => u.phone === phone.trim())) return { ok: false, field: 'phone', error: 'Số điện thoại đã được sử dụng.' };
    const u = {
      id: Utils.uid('u-'), role: 'customer', name: name.trim(), email: email.trim(), phone: phone.trim(),
      password, status: 'active', createdAt: new Date().toISOString(), addresses: [], savedCoupons: []
    };
    DB.insert('users', u);
    DB.set('session', { userId: u.id, at: new Date().toISOString() });
    return { ok: true, user: u };
  },

  logout() {
    DB.remove('session');
    location.href = ROOT + 'index.html';
  },

  // URL trang đăng nhập kèm đường dẫn quay lại
  loginUrl(back = location.pathname.split('/').pop() + location.search + location.hash) {
    return ROOT + 'dang-nhap.html?redirect=' + encodeURIComponent(back || 'index.html');
  },

  // Trang chỉ dành cho người đã đăng nhập (vd: tài khoản, thanh toán)
  requireLogin() {
    if (Auth.user()) return true;
    location.replace(Auth.loginUrl());
    return false;
  },

  // Trang nội bộ: kiểm tra vai trò, sai quyền → 403
  requireRole(...roles) {
    const u = Auth.user();
    if (!u) { location.replace(ROOT + 'dang-nhap.html?redirect=' + encodeURIComponent(location.pathname.split('/').slice(-2).join('/'))); return false; }
    if (!roles.includes(u.role)) { location.replace(ROOT + '403.html'); return false; }
    return true;
  },

  // Dùng trước các hành động của khách: thêm giỏ, mua ngay, yêu thích, đánh giá, đặt câu hỏi.
  // Chưa đăng nhập → chuyển sang đăng nhập rồi quay lại trang hiện tại.
  guard(actionLabel = 'thực hiện thao tác này', { customerOnly = true } = {}) {
    const u = Auth.user();
    if (!u) {
      Utils.toast(`Vui lòng đăng nhập để ${actionLabel}.`, 'info');
      setTimeout(() => location.href = Auth.loginUrl(), 700);
      return false;
    }
    if (customerOnly && u.role !== 'customer') {
      Utils.toast('Tài khoản nội bộ không thể ' + actionLabel + '. Hãy dùng tài khoản khách hàng.', 'warning');
      return false;
    }
    return true;
  },

  // Sau khi đăng nhập: quay lại trang trước, hoặc vào trang quản trị nếu là nhân viên/admin
  redirectAfterLogin(user) {
    const back = Utils.param('redirect');
    if (back && !/^https?:|^\/\//i.test(back)) {
      const isAdminPath = back.startsWith('admin/');
      if (!isAdminPath || user.role !== 'customer') { location.href = ROOT + back; return; }
    }
    location.href = ROOT + (user.role === 'customer' ? 'index.html' : 'admin/tong-quan.html');
  }
};
