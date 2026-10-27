// Dùng chung cho dang-nhap.html và dang-ky.html
(function () {
  // Đã đăng nhập thì không cần ở trang này
  const current = Auth.user();
  if (current) { Auth.redirectAfterLogin(current); return; }

  Layout.init();

  // Giữ tham số redirect khi chuyển qua lại giữa đăng nhập / đăng ký
  const redirect = Utils.param('redirect');
  if (redirect) {
    const q = '?redirect=' + encodeURIComponent(redirect);
    $('#toRegister') && ($('#toRegister').href += q);
    $('#toLogin') && ($('#toLogin').href += q);
  }

  $$('.pw-toggle').forEach(btn => btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.querySelector('i').className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
  }));

  /* ---------- Đăng nhập ---------- */
  const loginForm = $('#loginForm');
  if (loginForm) {
    const demo = [['admin@timehouse.vn', 'Admin'], ['trang.staff@timehouse.vn', 'Nhân viên'], ['an@gmail.com', 'Khách hàng']];
    $('#demoList').innerHTML = demo.map(([e, l]) => `<button type="button" data-email="${e}">${l}: ${e}</button>`).join('');
    $$('#demoList button').forEach(b => b.addEventListener('click', () => {
      $('#account').value = b.dataset.email;
      $('#password').value = '123456';
    }));

    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      Utils.clearInvalid(loginForm);
      const err = $('#loginError');
      err.classList.add('d-none');
      const account = $('#account'), pw = $('#password');
      let ok = true;
      if (!account.value.trim()) { Utils.setInvalid(account, 'Vui lòng nhập email hoặc số điện thoại.'); ok = false; }
      if (!pw.value) { Utils.setInvalid(pw, 'Vui lòng nhập mật khẩu.'); ok = false; }
      if (!ok) return;
      const r = Auth.login(account.value, pw.value);
      if (!r.ok) { err.textContent = r.error; err.classList.remove('d-none'); return; }
      Utils.toast(`Xin chào, ${Utils.escape(r.user.name)}!`);
      setTimeout(() => Auth.redirectAfterLogin(r.user), 500);
    });

    $('#forgotForm').addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#forgotEmail');
      Utils.clearInvalid(e.target);
      if (!Utils.isEmail(input.value)) { Utils.setInvalid(input, 'Email không hợp lệ.'); return; }
      bootstrap.Modal.getInstance('#forgotModal').hide();
      const exists = DB.all('users').some(u => u.email.toLowerCase() === input.value.trim().toLowerCase());
      Utils.toast(exists ? 'Đã gửi liên kết đặt lại mật khẩu tới email của bạn (mô phỏng).' : 'Email chưa được đăng ký.', exists ? 'success' : 'warning');
      input.value = '';
    });
  }

  /* ---------- Đăng ký ---------- */
  const regForm = $('#registerForm');
  if (regForm) {
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      Utils.clearInvalid(regForm);
      const f = id => $('#' + id);
      let ok = true;
      const fail = (id, msg) => { Utils.setInvalid(f(id), msg); ok = false; };
      if (f('name').value.trim().length < 2) fail('name', 'Vui lòng nhập họ tên.');
      if (!Utils.isEmail(f('email').value)) fail('email', 'Email không hợp lệ.');
      if (!Utils.isPhone(f('phone').value)) fail('phone', 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');
      if (f('password').value.length < 6) fail('password', 'Mật khẩu tối thiểu 6 ký tự.');
      if (f('password2').value !== f('password').value) fail('password2', 'Mật khẩu nhập lại không khớp.');
      if (!f('agree').checked) { Utils.toast('Vui lòng đồng ý với chính sách bảo mật.', 'warning'); ok = false; }
      if (!ok) return;
      const r = Auth.register({ name: f('name').value, email: f('email').value, phone: f('phone').value, password: f('password').value });
      if (!r.ok) { fail(r.field, r.error); return; }
      Utils.toast('Đăng ký thành công! Tặng bạn mã <strong>WELCOME50</strong> trong ví mã giảm giá.');
      DB.update('users', r.user.id, { savedCoupons: ['WELCOME50'] });
      setTimeout(() => Auth.redirectAfterLogin(r.user), 700);
    });
  }
})();
