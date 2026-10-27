// Giỏ hàng, yêu thích (gắn theo tài khoản khách) & đã xem gần đây (theo trình duyệt).
const emit = name => document.dispatchEvent(new CustomEvent(name));

const Cart = {
  _key() { const u = Auth.user(); return u ? u.id : null; },
  // Bỏ qua dòng hàng của sản phẩm đã bị xóa khỏi hệ thống
  items() {
    const k = Cart._key();
    return k ? (DB.get('carts', {})[k] || []).filter(i => Catalog.product(i.productId)) : [];
  },
  _save(items) {
    const all = DB.get('carts', {});
    all[Cart._key()] = items;
    DB.set('carts', all);
    emit('th:cart');
  },
  count() { return Cart.items().reduce((s, i) => s + i.qty, 0); },

  // Thêm vào giỏ (đã kiểm tra đăng nhập & tồn kho). Trả về true nếu thành công.
  add(productId, qty = 1, { silent = false } = {}) {
    if (!Auth.guard('thêm sản phẩm vào giỏ')) return false;
    const p = Catalog.product(productId);
    if (!p || p.stock <= 0) { Utils.toast('Sản phẩm đã hết hàng.', 'warning'); return false; }
    const items = Cart.items();
    const line = items.find(i => i.productId === productId);
    const current = line ? line.qty : 0;
    if (current + qty > p.stock) {
      Utils.toast(`Chỉ còn ${p.stock} sản phẩm trong kho${current ? ` (giỏ đã có ${current})` : ''}.`, 'warning');
      return false;
    }
    if (line) line.qty += qty;
    else items.push({ productId, qty, services: { engrave: '', giftWrap: false, install: !!p.heavy } });
    Cart._save(items);
    if (!silent) Utils.toast(`Đã thêm <strong>${Utils.escape(p.name)}</strong> vào giỏ hàng. <a href="${ROOT}gio-hang.html" class="link-dark fw-semibold">Xem giỏ</a>`);
    return true;
  },
  setQty(productId, qty) {
    const p = Catalog.product(productId);
    const items = Cart.items();
    const line = items.find(i => i.productId === productId);
    if (!line) return;
    line.qty = Math.max(1, Math.min(qty, p ? p.stock : qty));
    Cart._save(items);
  },
  setServices(productId, services) {
    const items = Cart.items();
    const line = items.find(i => i.productId === productId);
    if (!line) return;
    line.services = Object.assign({}, line.services, services);
    Cart._save(items);
  },
  remove(productId) { Cart._save(Cart.items().filter(i => i.productId !== productId)); },
  clear() { Cart._save([]); }
};

const Wishlist = {
  ids() {
    const u = Auth.user();
    return u ? (DB.get('wishlists', {})[u.id] || []).filter(id => Catalog.product(id)) : [];
  },
  has(id) { return Wishlist.ids().includes(id); },
  toggle(id) {
    if (!Auth.guard('lưu sản phẩm yêu thích')) return null;
    const u = Auth.user();
    const all = DB.get('wishlists', {});
    const list = all[u.id] || [];
    const added = !list.includes(id);
    all[u.id] = added ? [id, ...list] : list.filter(x => x !== id);
    DB.set('wishlists', all);
    emit('th:wishlist');
    Utils.toast(added ? 'Đã thêm vào danh sách yêu thích.' : 'Đã bỏ khỏi danh sách yêu thích.', added ? 'success' : 'info');
    return added;
  }
};

const Recent = {
  ids: () => DB.get('recent', []),
  push(id) { DB.set('recent', [id, ...Recent.ids().filter(x => x !== id)].slice(0, 12)); }
};

// Bắt sự kiện chung cho các nút trên thẻ sản phẩm ở mọi trang
document.addEventListener('click', e => {
  const add = e.target.closest('.js-add-cart');
  if (add) { e.preventDefault(); Cart.add(add.dataset.id); return; }
  const wish = e.target.closest('.js-wish');
  if (wish) {
    e.preventDefault();
    const r = Wishlist.toggle(wish.dataset.id);
    if (r !== null) {
      $$(`.js-wish[data-id="${wish.dataset.id}"]`).forEach(b => {
        b.classList.toggle('active', r);
        b.querySelector('i').className = 'bi ' + (r ? 'bi-heart-fill' : 'bi-heart');
      });
    }
  }
});
