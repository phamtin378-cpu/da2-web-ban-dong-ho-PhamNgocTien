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

  function init(force = false) {
    if (!force && get('version') === SEED_VERSION) {
      // Bổ sung collection còn thiếu (ví dụ trang chỉ nạp một phần dữ liệu ở lần trước)
      Object.keys(SEEDS).forEach(k => { if (rawGet(k) === null && SEEDS[k]()) set(k, SEEDS[k]()); });
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
