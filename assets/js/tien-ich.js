// Tiện ích dùng chung
const ROOT = document.documentElement.dataset.root || '';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const Utils = {
  formatPrice(n) {
    return Math.round(Number(n) || 0).toLocaleString('vi-VN') + '₫';
  },

  formatDate(iso, withTime = false) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = v => String(v).padStart(2, '0');
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return withTime ? `${pad(d.getHours())}:${pad(d.getMinutes())} ${date}` : date;
  },

  timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    if (s < 86400 * 30) return Math.floor(s / 86400) + ' ngày trước';
    return Utils.formatDate(iso);
  },

  escape(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  // Bỏ dấu tiếng Việt để tìm kiếm
  normalize(str) {
    return String(str ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  },

  uid(prefix = 'id') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  param(name) {
    return new URLSearchParams(location.search).get(name);
  },

  debounce(fn, ms = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  isPhone: v => /^0\d{9}$/.test(String(v).trim()),
  isEmail: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()),

  toast(message, type = 'success') {
    let box = $('#toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.className = 'toast-container position-fixed top-0 end-0 p-3';
      document.body.appendChild(box);
    }
    const icon = { success: 'bi-check-circle', error: 'bi-x-circle', warning: 'bi-exclamation-circle', info: 'bi-info-circle' }[type] || 'bi-info-circle';
    const el = document.createElement('div');
    el.className = `toast th-toast th-toast-${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="d-flex align-items-center gap-2 p-3"><i class="bi ${icon}"></i><div class="flex-grow-1">${message}</div>
      <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="toast" aria-label="Đóng"></button></div>`;
    box.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 2800 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    t.show();
  },

  // Hộp thoại xác nhận (SweetAlert2 nếu có)
  async confirm(title, text = '', confirmText = 'Đồng ý') {
    if (window.Swal) {
      const r = await Swal.fire({
        title, text, icon: 'question', showCancelButton: true,
        confirmButtonText: confirmText, cancelButtonText: 'Hủy',
        buttonsStyling: false, customClass: { confirmButton: 'btn btn-dark mx-1', cancelButton: 'btn btn-outline-dark mx-1' }
      });
      return r.isConfirmed;
    }
    return window.confirm(title + (text ? '\n' + text : ''));
  },

  // Đặt trạng thái lỗi cho input Bootstrap
  setInvalid(input, message) {
    input.classList.add('is-invalid');
    let fb = input.parentElement.querySelector('.invalid-feedback');
    if (!fb) {
      fb = document.createElement('div');
      fb.className = 'invalid-feedback';
      input.parentElement.appendChild(fb);
    }
    fb.textContent = message;
  },

  // Đọc ảnh người dùng chọn, thu nhỏ để tiết kiệm dung lượng localStorage
  readImage(file, max = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) { reject(new Error('Tệp không phải hình ảnh')); return; }
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          const g = c.getContext('2d');
          // JPEG không có nền trong suốt → phủ nền trắng để ảnh PNG tách nền không bị nền đen
          g.fillStyle = '#fff';
          g.fillRect(0, 0, c.width, c.height);
          g.imageSmoothingQuality = 'high';
          g.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },

  // Đếm ngược tới thời điểm end, cập nhật vào el mỗi giây
  countdown(el, end, onDone) {
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(end) - Date.now()) / 1000));
      const pad = v => String(v).padStart(2, '0');
      const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      el.innerHTML = (d ? `<span>${d}</span><i>ngày</i>` : '') + `<span>${pad(h)}</span>:<span>${pad(m)}</span>:<span>${pad(sec)}</span>`;
      if (!s) { clearInterval(timer); onDone && onDone(); }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return timer;
  },

  // Phân trang: trả về HTML các nút
  pagination(page, totalPages) {
    if (totalPages <= 1) return '';
    const btn = (p, label, disabled, active) =>
      `<li class="page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}"><button class="page-link" data-page="${p}" ${disabled ? 'tabindex="-1"' : ''}>${label}</button></li>`;
    let html = btn(page - 1, '<i class="bi bi-chevron-left"></i>', page === 1);
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) html += btn(i, i, false, i === page);
      else if (Math.abs(i - page) === 2) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
    }
    html += btn(page + 1, '<i class="bi bi-chevron-right"></i>', page === totalPages);
    return `<nav aria-label="Phân trang"><ul class="pagination th-pagination justify-content-center">${html}</ul></nav>`;
  },

  clearInvalid(form) {
    $$('.is-invalid', form).forEach(i => i.classList.remove('is-invalid'));
  }
};
