// "Cơ sở dữ liệu" mô phỏng bằng localStorage.
// Lần đầu (hoặc khi đổi SEED_VERSION) dữ liệu mẫu trong assets/data/*.js được nạp vào localStorage.
const DB = (() => {
  const PREFIX = 'th_';
  const SEED_VERSION = '1.5.0';

  // Tên collection → biến dữ liệu mẫu
  const SEEDS = {
    settings: () => window.SEED_SETTINGS,
    categories: () => window.SEED_CATEGORIES,
    brands: () => window.SEED_BRANDS,
    products: () => window.SEED_PRODUCTS,
    users: () => window.SEED_USERS,
    promotions: () => window.SEED_PROMOTIONS,
    posts: () => window.SEED_POSTS,
    reviews: () => window.SEED_REVIEWS,
    questions: () => window.SEED_QUESTIONS,
    orders: () => window.SEED_ORDERS,
    contacts: () => window.SEED_CONTACTS,
    carts: () => ({}),
    wishlists: () => ({})
  };

  const memory = {}; // dự phòng khi localStorage bị chặn

  function rawGet(key) {
    try { return localStorage.getItem(PREFIX + key); } catch { return memory[key] ?? null; }
  }
  function rawSet(key, value) {
    try { localStorage.setItem(PREFIX + key, value); } catch { memory[key] = value; }
  }
  function rawRemove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch { delete memory[key]; }
  }

  function get(key, fallback = null) {
    const v = rawGet(key);
    if (v === null) return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  }
  function set(key, value) {
    rawSet(key, JSON.stringify(value));
  }

  // Cửa hàng đã ngừng nhận thanh toán thẻ: xóa hẳn các đơn thanh toán bằng thẻ.
  // CARD_SEED_NO: số thứ tự (3 số cuối mã đơn) của các đơn mẫu từng là đơn thẻ – dùng cho dữ liệu
  // đã bị bản cập nhật trước chuyển sang "chuyển khoản". Đơn mẫu nhận biết qua dòng hàng không có sku.
  const CARD_SEED_NO = ['013', '016', '018', '020', '021', '035', '038', '045', '057', '059'];
  function removeCardOrders() {
    const orders = get('orders', null);
    if (!Array.isArray(orders)) return;
    const isCard = o => o.paymentMethod === 'card' || !!o.card ||
      (o.items.every(it => !it.sku) && CARD_SEED_NO.includes(String(o.id).slice(-3)));
    const kept = orders.filter(o => !isCard(o));
    if (kept.length !== orders.length) set('orders', kept);
  }

  // Thu gọn danh mục sản phẩm (chạy 1 lần): xóa sản phẩm mẫu đã bỏ khỏi dữ liệu mẫu NẾU chưa có ảnh;
  // sản phẩm giữ lại mà chưa có ảnh thì gán ảnh trong project. Dọn đánh giá, hỏi đáp, flash sale, bài viết liên quan.
  function pruneProducts() {
    const FLAG = 'mig_prune_products_v1';
    if (get(FLAG) || !window.SEED_PRODUCTS_ALL || !window.SEED_PRODUCTS) return;
    const products = get('products', null);
    if (!Array.isArray(products)) return;
    const keep = new Set(window.SEED_PRODUCTS.map(p => p.id));
    const dropped = new Set(window.SEED_PRODUCTS_ALL.map(p => p.id).filter(id => !keep.has(id)));
    const hasImg = p => Array.isArray(p.images) && p.images.length > 0;

    const left = products.filter(p => !(dropped.has(p.id) && !hasImg(p)));
    left.forEach(p => { if (keep.has(p.id) && !hasImg(p)) p.images = [window.SEED_PRODUCT_PHOTO(p.id)]; });
    set('products', left);
    const alive = new Set(left.map(p => p.id));

    ['reviews', 'questions'].forEach(k => {
      const list = get(k, null);
      if (Array.isArray(list)) set(k, list.filter(x => alive.has(x.productId)));
    });
    const promos = get('promotions', null);
    if (Array.isArray(promos)) {
      promos.forEach(pr => {
        if (Array.isArray(pr.items)) pr.items = pr.items.filter(i => alive.has(i.productId));
      });
      set('promotions', promos);
    }
    const posts = get('posts', null);
    if (Array.isArray(posts)) {
      const seedPosts = window.SEED_POSTS || [];
      posts.forEach(p => {
        if (p.coverProduct && !alive.has(p.coverProduct)) {
          const s = seedPosts.find(x => x.id === p.id);
          p.coverProduct = s && alive.has(s.coverProduct) ? s.coverProduct : null;
        }
      });
      set('posts', posts);
    }
    set(FLAG, true);
  }

  // Khuyến mãi chỉ còn 2 loại: flash sale và mã giảm giá → xóa các chương trình loại cũ (giảm giá SP, quà tặng)
  function removeOldPromos() {
    const promos = get('promotions', null);
    if (!Array.isArray(promos)) return;
    const kept = promos.filter(p => p.type === 'flashsale' || p.type === 'coupon');
    if (kept.length !== promos.length) set('promotions', kept);
  }

  function init(force = false) {
    if (!force && get('version') === SEED_VERSION) {
      // Bổ sung collection còn thiếu (ví dụ trang chỉ nạp một phần dữ liệu ở lần trước)
      Object.keys(SEEDS).forEach(k => { if (rawGet(k) === null && SEEDS[k]()) set(k, SEEDS[k]()); });
      removeCardOrders();
      pruneProducts();
      removeOldPromos();
      return;
    }
    Object.keys(SEEDS).forEach(k => {
      const data = SEEDS[k]();
      if (data !== undefined) set(k, data);
    });
    set('version', SEED_VERSION);
  }

  return {
    init,
    reset() { rawRemove('session'); init(true); },
    get, set,
    remove: rawRemove,

    // Thao tác trên collection dạng mảng
    all: name => get(name, []),
    save: (name, list) => set(name, list),
    find: (name, id) => get(name, []).find(x => x.id === id) || null,
    insert(name, item) {
      const list = get(name, []);
      list.unshift(item);
      set(name, list);
      return item;
    },
    update(name, id, patch) {
      const list = get(name, []);
      const i = list.findIndex(x => x.id === id);
      if (i < 0) return null;
      list[i] = typeof patch === 'function' ? patch(list[i]) : Object.assign({}, list[i], patch);
      set(name, list);
      return list[i];
    },
    delete(name, id) {
      set(name, get(name, []).filter(x => x.id !== id));
    },
    settings: () => get('settings', window.SEED_SETTINGS || {}),

    // Xuất toàn bộ dữ liệu (kể cả ảnh đã tải lên) ra 1 đối tượng để lưu thành file .json
    exportAll() {
      const data = {};
      Object.keys(SEEDS).forEach(k => { const v = rawGet(k); if (v !== null) data[k] = JSON.parse(v); });
      ['recent', 'drafts', 'listView'].forEach(k => { const v = rawGet(k); if (v !== null) data[k] = JSON.parse(v); });
      return { app: 'TIMEHOUSE', version: SEED_VERSION, exportedAt: new Date().toISOString(), data };
    },
    // Nạp lại dữ liệu từ file đã xuất. Trả về false nếu file không đúng định dạng.
    importAll(file) {
      if (!file || file.app !== 'TIMEHOUSE' || !file.data || !Array.isArray(file.data.products)) return false;
      Object.entries(file.data).forEach(([k, v]) => set(k, v));
      set('version', SEED_VERSION); // giữ dữ liệu vừa nhập, không bị nạp đè dữ liệu mẫu
      return true;
    }
  };
})();

DB.init();
