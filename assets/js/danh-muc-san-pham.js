// Danh mục, sản phẩm, khuyến mãi, giá bán, đánh giá, ảnh minh họa và thẻ sản phẩm.

/* ================= DANH MỤC & SẢN PHẨM ================= */
const Catalog = {
  categories: () => DB.all('categories').sort((a, b) => a.order - b.order),
  category: id => DB.find('categories', id),
  parents: () => Catalog.categories().filter(c => !c.parentId),
  children: parentId => Catalog.categories().filter(c => c.parentId === parentId),
  parentOf(catId) {
    const c = Catalog.category(catId);
    return c && c.parentId ? Catalog.category(c.parentId) : c;
  },
  // Danh sách id danh mục con thuộc 1 id (cha → các con; con → chính nó)
  expandCategory(id) {
    const kids = Catalog.children(id);
    return kids.length ? kids.map(k => k.id) : [id];
  },

  brands: () => DB.all('brands'),
  brand: id => DB.find('brands', id),

  products: (all = false) => DB.all('products').filter(p => all || p.status === 'active'),
  product: id => DB.find('products', id),

  // Bộ lọc khả dụng cho 1 danh mục (cha hoặc con)
  filtersFor(catId) {
    const parent = catId ? Catalog.parentOf(catId) : null;
    const keys = parent ? parent.filters.concat(window.COMMON_FILTERS) : ['origin', 'color'];
    return [...new Set(keys)];
  },

  // Tìm kiếm + lọc + sắp xếp
  query({ cat, brand, q, min, max, specs = {}, rating, sort, onSale, promo } = {}) {
    let list = Catalog.products();
    if (promo) { const pr = DB.find('promotions', promo); list = pr ? list.filter(p => Promo.covers(pr, p)) : []; }
    if (cat) { const ids = Catalog.expandCategory(cat); list = list.filter(p => ids.includes(p.categoryId)); }
    if (brand) { const b = [].concat(brand); list = list.filter(p => b.includes(p.brandId)); }
    if (q) {
      const words = Utils.normalize(q).split(/\s+/).filter(Boolean);
      list = list.filter(p => {
        const hay = Utils.normalize([p.name, p.sku, (Catalog.brand(p.brandId) || {}).name, (Catalog.category(p.categoryId) || {}).name, (Catalog.parentOf(p.categoryId) || {}).name].join(' '));
        return words.every(w => hay.includes(w));
      });
    }
    Object.entries(specs).forEach(([key, values]) => {
      if (!values || !values.length) return;
      list = list.filter(p => {
        const v = p.specs[key];
        return Array.isArray(v) ? v.some(x => values.includes(x)) : values.includes(v);
      });
    });
    const priced = list.map(p => ({ p, price: Pricing.get(p) }));
    let res = priced;
    if (min) res = res.filter(x => x.price.price >= min);
    if (max) res = res.filter(x => x.price.price <= max);
    if (onSale) res = res.filter(x => x.price.percent > 0);
    if (rating) res = res.filter(x => Reviews.stats(x.p.id).avg >= rating);
    const sorters = {
      newest: (a, b) => b.p.createdAt.localeCompare(a.p.createdAt),
      'price-asc': (a, b) => a.price.price - b.price.price,
      'price-desc': (a, b) => b.price.price - a.price.price,
      bestseller: (a, b) => b.p.sold - a.p.sold,
      discount: (a, b) => b.price.percent - a.price.percent,
      rating: (a, b) => Reviews.stats(b.p.id).avg - Reviews.stats(a.p.id).avg,
      name: (a, b) => a.p.name.localeCompare(b.p.name, 'vi')
    };
    if (sort && sorters[sort]) res.sort(sorters[sort]);
    return res.map(x => x.p);
  },

  // Gợi ý tìm kiếm nhanh cho ô search
  suggest(q, limit = 6) {
    if (!q || q.trim().length < 2) return [];
    return Catalog.query({ q, sort: 'bestseller' }).slice(0, limit);
  },

  isNew: p => (Date.now() - new Date(p.createdAt)) / 86400000 <= 30,

  url: p => `${ROOT}chi-tiet-san-pham.html?id=${p.id}`,
  catUrl: id => `${ROOT}san-pham.html?cat=${id}`
};

/* ================= KHUYẾN MÃI ================= */
const Promo = {
  STATUS_LABEL: { upcoming: 'Sắp diễn ra', running: 'Đang diễn ra', ended: 'Đã kết thúc', paused: 'Tạm dừng' },
  TYPE_LABEL: { discount: 'Giảm giá sản phẩm', flashsale: 'Flash sale', coupon: 'Mã giảm giá', gift: 'Quà tặng kèm' },

  all: () => DB.all('promotions'),

  status(pr, now = Date.now()) {
    if (!pr.active) return 'paused';
    if (now < new Date(pr.start)) return 'upcoming';
    if (now > new Date(pr.end)) return 'ended';
    return 'running';
  },

  running(type) {
    return Promo.all().filter(p => (!type || p.type === type) && Promo.status(p) === 'running');
  },

  inScope(product, scope) {
    if (!scope || scope.type === 'all') return true;
    if (scope.type === 'products') return scope.ids.includes(product.id);
    if (scope.type === 'brands') return scope.ids.includes(product.brandId);
    if (scope.type === 'categories') {
      const parent = Catalog.parentOf(product.categoryId);
      return scope.ids.includes(product.categoryId) || (parent && scope.ids.includes(parent.id));
    }
    return false;
  },

  // Sản phẩm có thuộc chương trình không
  covers(pr, p) {
    if (pr.type === 'flashsale') return pr.items.some(i => i.productId === p.id);
    if (pr.type === 'coupon') return true;
    return Promo.inScope(p, pr.scope);
  },

  applyDiscount(base, pr) {
    let off = pr.discountType === 'percent' ? base * pr.value / 100 : pr.value;
    if (pr.maxDiscount) off = Math.min(off, pr.maxDiscount);
    return Math.max(0, Math.round((base - off) / 1000) * 1000); // làm tròn đến nghìn đồng
  },

  flashItem(productId) {
    for (const fs of Promo.running('flashsale')) {
      const it = fs.items.find(i => i.productId === productId);
      if (it && it.sold < it.quota) return { promo: fs, item: it };
    }
    return null;
  },

  // Quà tặng áp dụng cho 1 sản phẩm (hiển thị trên trang chi tiết)
  giftsFor(product) {
    const price = Pricing.get(product).price;
    return Promo.running('gift').filter(g => Promo.inScope(product, g.scope) && price >= (g.minItemPrice || 0));
  },

  coupon(code) {
    return Promo.all().find(p => p.type === 'coupon' && p.code.toUpperCase() === String(code).trim().toUpperCase()) || null;
  }
};

/* ================= GIÁ BÁN ================= */
// Quy tắc: 1 sản phẩm chỉ áp dụng mức giá thấp nhất trong (giá bán thường, các CT giảm giá, flash sale).
const Pricing = {
  // noFlash: bỏ qua flash sale (khi số lượng mua vượt số suất còn lại)
  get(p, { noFlash = false } = {}) {
    const original = p.price;
    let best = { price: p.salePrice || p.price, source: p.salePrice ? 'sale' : 'base', promo: null };
    Promo.running('discount').forEach(pr => {
      if (!Promo.inScope(p, pr.scope)) return;
      const v = Promo.applyDiscount(original, pr);
      if (v < best.price) best = { price: v, source: 'promo', promo: pr };
    });
    const fs = noFlash ? null : Promo.flashItem(p.id);
    if (fs && fs.item.salePrice < best.price) {
      best = { price: fs.item.salePrice, source: 'flash', promo: fs.promo, flash: fs.item };
    }
    best.original = original;
    best.percent = original > best.price ? Math.round((original - best.price) / original * 100) : 0;
    return best;
  }
};

/* ================= ĐÁNH GIÁ ================= */
const Reviews = {
  _cache: null,
  visible(productId) {
    return DB.all('reviews').filter(r => r.productId === productId && r.status === 'approved');
  },
  stats(productId) {
    if (!Reviews._cache) {
      Reviews._cache = {};
      DB.all('reviews').filter(r => r.status === 'approved').forEach(r => {
        const s = Reviews._cache[r.productId] || (Reviews._cache[r.productId] = { sum: 0, count: 0, dist: [0, 0, 0, 0, 0] });
        s.sum += r.rating; s.count++; s.dist[r.rating - 1]++;
      });
    }
    const s = Reviews._cache[productId];
    return s ? { avg: Math.round(s.sum / s.count * 10) / 10, count: s.count, dist: s.dist } : { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] };
  },
  invalidate() { Reviews._cache = null; },
  stars(avg, cls = '') {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<i class="bi ${avg >= i ? 'bi-star-fill' : avg >= i - 0.5 ? 'bi-star-half' : 'bi-star'}"></i>`;
    }
    return `<span class="stars ${cls}" aria-label="${avg} trên 5 sao">${html}</span>`;
  }
};

/* ================= ẢNH MINH HỌA (SVG tự sinh) ================= */
// Khi product.images trống, sinh ảnh SVG theo loại đồng hồ và màu sắc để giao diện luôn đồng bộ.
const Img = (() => {
  const COLORS = {
    'Đen': '#1c1c1c', 'Trắng': '#f7f7f5', 'Xanh navy': '#1f2d4d', 'Xanh dương': '#2f5d9e', 'Xanh lá': '#2f5a43',
    'Bạc': '#c9ccd1', 'Vàng': '#cfae5e', 'Vàng hồng': '#d7a596', 'Vàng đồng': '#b08d57', 'Nâu': '#6b4a2f',
    'Gỗ tự nhiên': '#b07f4f', 'Hồng': '#e7b7c2', 'Xám': '#6f747b', 'Đỏ': '#b3261e'
  };
  const hex = name => COLORS[name] || '#2b2b2b';
  const isDark = c => {
    const n = parseInt(c.slice(1), 16);
    return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) < 140;
  };

  function hands(cx, cy, r, color) {
    const at = (deg, len) => {
      const a = (deg - 90) * Math.PI / 180;
      return [cx + Math.cos(a) * len, cy + Math.sin(a) * len];
    };
    const [hx, hy] = at(-55, r * 0.5), [mx, my] = at(60, r * 0.78), [sx, sy] = at(200, r * 0.85);
    return `<line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" stroke="${color}" stroke-width="${r * 0.07}" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="${color}" stroke-width="${r * 0.045}" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="#c0392b" stroke-width="${Math.max(1, r * 0.015)}"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.05}" fill="${color}"/>`;
  }
  function ticks(cx, cy, r, color, n = 12) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = i * (360 / n) * Math.PI / 180, major = i % 3 === 0;
      const r1 = r * (major ? 0.8 : 0.86);
      s += `<line x1="${cx + Math.sin(a) * r1}" y1="${cy - Math.cos(a) * r1}" x2="${cx + Math.sin(a) * r * 0.93}" y2="${cy - Math.cos(a) * r * 0.93}" stroke="${color}" stroke-width="${r * (major ? 0.045 : 0.022)}" stroke-linecap="round"/>`;
    }
    return s;
  }
  function face(cx, cy, r, dial) {
    const ink = isDark(dial) ? '#f2f2f2' : '#1c1c1c';
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dial}"/>${ticks(cx, cy, r, ink)}${hands(cx, cy, r, ink)}`;
  }

  function draw(p) {
    const s = p.specs || {};
    const dial = hex(s.color);
    const metal = /Vàng hồng/.test(s.color) ? '#d7a596' : /Vàng/.test(s.color) ? '#cfae5e' : '#cfd2d6';
    const strap = /Da/.test(s.strap || '') ? (s.color === 'Đen' ? '#222' : '#6b4429')
      : /Thép|lưới/.test(s.strap || '') ? metal : (s.color === 'Trắng' ? '#e3e3e0' : dial);
    const wood = /Gỗ|gỗ/.test((s.frame || '') + (s.material || '') + (s.wood || '')) ? (s.color === 'Gỗ tự nhiên' ? '#b07f4f' : '#5e3b22') : '#3a3a3a';
    const square = /Vuông|Chữ nhật|Bát giác/.test(s.shape || '');

    switch (p.look.kind) {
      case 'wrist': return `
        <rect x="165" y="20" width="70" height="140" rx="14" fill="${strap}"/><rect x="165" y="240" width="70" height="140" rx="14" fill="${strap}"/>
        <rect x="282" y="190" width="14" height="22" rx="3" fill="${metal}"/>
        ${square ? `<rect x="112" y="112" width="176" height="176" rx="34" fill="${metal}"/><rect x="126" y="126" width="148" height="148" rx="24" fill="${dial}"/>${ticks(200, 200, 74, isDark(dial) ? '#eee' : '#222')}${hands(200, 200, 74, isDark(dial) ? '#eee' : '#222')}`
          : `<circle cx="200" cy="200" r="90" fill="${metal}"/>${face(200, 200, 76, dial)}`}`;
      case 'smart': return `
        <rect x="160" y="20" width="80" height="360" rx="20" fill="${dial === '#f7f7f5' ? '#e4e4e1' : dial}"/>
        ${square ? `<rect x="118" y="100" width="164" height="200" rx="46" fill="#2a2a2a"/><rect x="132" y="114" width="136" height="172" rx="34" fill="#0d0d0d"/>`
          : `<circle cx="200" cy="200" r="96" fill="#2a2a2a"/><circle cx="200" cy="200" r="82" fill="#0d0d0d"/>`}
        <text x="200" y="212" text-anchor="middle" font-family="Arial" font-size="40" font-weight="700" fill="#fff">10:10</text>
        <circle cx="200" cy="200" r="62" fill="none" stroke="#4ade80" stroke-width="5" stroke-dasharray="250 400" transform="rotate(-90 200 200)"/>
        <rect x="282" y="160" width="8" height="34" rx="3" fill="#555"/>`;
      case 'band': return `
        <rect x="172" y="20" width="56" height="360" rx="26" fill="${dial === '#f7f7f5' ? '#e4e4e1' : dial}"/>
        <rect x="160" y="120" width="80" height="160" rx="40" fill="#1a1a1a"/><rect x="168" y="132" width="64" height="136" rx="32" fill="#050505"/>
        <text x="200" y="196" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#fff">10</text>
        <text x="200" y="226" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#fff">10</text>
        <text x="200" y="252" text-anchor="middle" font-family="Arial" font-size="12" fill="#4ade80">♥ 72</text>`;
      case 'wall': return `
        <circle cx="200" cy="200" r="160" fill="${/Kim loại/.test(s.frame) ? metal : wood}"/>
        ${face(200, 200, 142, s.color === 'Gỗ tự nhiên' || s.color === 'Nâu' ? '#f4efe6' : dial)}`;
      case 'painting': return `
        <rect x="30" y="90" width="340" height="220" rx="6" fill="#efe7da"/>
        <rect x="30" y="90" width="110" height="220" fill="${dial}" opacity=".85"/><rect x="145" y="90" width="110" height="220" fill="${dial}" opacity=".6"/><rect x="260" y="90" width="110" height="220" fill="${dial}" opacity=".85"/>
        <path d="M60 280 C120 180 180 260 240 170 S330 220 350 150" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/>
        <circle cx="200" cy="200" r="58" fill="#fff" opacity=".95"/>${ticks(200, 200, 54, '#222')}${hands(200, 200, 54, '#222')}`;
      case 'pendulum': return `
        <rect x="120" y="30" width="160" height="340" rx="24" fill="${wood}"/>
        <rect x="140" y="190" width="120" height="160" rx="10" fill="#efe7da" opacity=".25"/>
        <line x1="200" y1="190" x2="200" y2="310" stroke="${metal}" stroke-width="4"/><circle cx="200" cy="315" r="22" fill="#cfae5e"/>
        ${face(200, 110, 62, '#f4efe6')}`;
      case 'desk': return `
        <path d="M110 330 L110 170 Q110 70 200 70 Q290 70 290 170 L290 330 Z" fill="${wood === '#3a3a3a' ? metal : wood}"/>
        <rect x="95" y="325" width="210" height="26" rx="6" fill="${wood === '#3a3a3a' ? '#a88b53' : '#3e2716'}"/>
        ${face(200, 185, 66, '#f6f2ea')}`;
      case 'alarm': return `
        <circle cx="128" cy="98" r="34" fill="${metal}"/><circle cx="272" cy="98" r="34" fill="${metal}"/>
        <rect x="190" y="70" width="20" height="30" fill="${metal}"/>
        <line x1="140" y1="320" x2="118" y2="356" stroke="#333" stroke-width="10" stroke-linecap="round"/><line x1="260" y1="320" x2="282" y2="356" stroke="#333" stroke-width="10" stroke-linecap="round"/>
        <circle cx="200" cy="215" r="120" fill="${dial === '#f7f7f5' ? '#dadad6' : dial}"/>${face(200, 215, 100, '#fbfbf9')}`;
      case 'led': return `
        <rect x="60" y="130" width="280" height="140" rx="20" fill="${s.color === 'Gỗ tự nhiên' ? '#b07f4f' : dial === '#f7f7f5' ? '#ececea' : '#1a1a1a'}"/>
        <rect x="80" y="150" width="240" height="100" rx="12" fill="#0e0e0e"/>
        <text x="200" y="222" text-anchor="middle" font-family="Courier New, monospace" font-size="62" font-weight="700" fill="#ff8a3d">10:10</text>`;
      case 'art': return `
        <rect x="120" y="320" width="160" height="40" rx="8" fill="${wood}"/>
        <path d="M80 300 Q200 350 320 300 L300 320 L100 320 Z" fill="${dial}"/>
        <path d="M200 60 L200 300 M200 70 L300 260 L200 260 Z M200 100 L120 260 L200 260" fill="#f2ede4" stroke="#999" stroke-width="2"/>
        ${face(200, 200, 44, '#ffffff')}`;
      case 'hourglass': return `
        <rect x="120" y="40" width="160" height="22" rx="6" fill="${wood}"/><rect x="120" y="338" width="160" height="22" rx="6" fill="${wood}"/>
        <rect x="128" y="62" width="10" height="276" fill="${wood}"/><rect x="262" y="62" width="10" height="276" fill="${wood}"/>
        <path d="M150 62 L250 62 Q250 150 205 200 Q250 250 250 338 L150 338 Q150 250 195 200 Q150 150 150 62 Z" fill="#e9f1f5" stroke="#b9c7cf" stroke-width="3"/>
        <path d="M170 110 L230 110 Q220 160 200 190 Q180 160 170 110 Z" fill="#d9b36c"/><path d="M160 335 Q200 280 240 335 Z" fill="#d9b36c"/>`;
      case 'floor': return `
        <rect x="140" y="20" width="120" height="360" rx="10" fill="${wood}"/>
        <path d="M130 30 Q200 -6 270 30 L270 46 L130 46 Z" fill="${wood}"/>
        <rect x="160" y="160" width="80" height="190" rx="6" fill="#efe7da" opacity=".25"/>
        <line x1="200" y1="160" x2="200" y2="300" stroke="#cfae5e" stroke-width="3"/><circle cx="200" cy="305" r="18" fill="#cfae5e"/>
        ${face(200, 95, 46, '#f4efe6')}`;
      case 'pocket': return `
        <path d="M200 120 C120 40 60 80 70 30" stroke="${metal}" stroke-width="6" fill="none" stroke-dasharray="10 5"/>
        <circle cx="200" cy="112" r="18" fill="none" stroke="${metal}" stroke-width="8"/><rect x="190" y="124" width="20" height="18" fill="${metal}"/>
        <circle cx="200" cy="245" r="108" fill="${metal}"/>${face(200, 245, 94, s.color === 'Vàng đồng' ? '#f3ead8' : '#fbfbf9')}`;
      case 'strap': return `
        <rect x="110" y="40" width="64" height="320" rx="14" fill="${s.color === 'Bạc' ? metal : dial}"/>
        <rect x="226" y="40" width="64" height="320" rx="14" fill="${s.color === 'Bạc' ? metal : dial}"/>
        ${[120, 160, 200, 240].map(y => `<circle cx="258" cy="${y}" r="5" fill="#f4f4f2"/>`).join('')}
        <rect x="104" y="300" width="76" height="46" rx="8" fill="none" stroke="#bfc3c7" stroke-width="7"/>`;
      case 'box': return `
        <path d="M60 170 L340 170 L320 70 L80 70 Z" fill="${dial === '#1c1c1c' ? '#2c2c2c' : wood}"/>
        <rect x="60" y="170" width="280" height="160" rx="10" fill="${dial === '#1c1c1c' ? '#222' : wood}"/>
        <rect x="76" y="186" width="248" height="128" rx="6" fill="#efe7da"/>
        ${[0, 1, 2].map(i => `<rect x="${92 + i * 80}" y="214" width="56" height="70" rx="20" fill="#d8ccb8"/>`).join('')}`;
      case 'battery': return `
        <circle cx="150" cy="200" r="80" fill="#cfd2d6"/><circle cx="150" cy="200" r="66" fill="#e3e5e8"/>
        <text x="150" y="214" text-anchor="middle" font-family="Arial" font-size="38" font-weight="700" fill="#555">+</text>
        <circle cx="270" cy="230" r="58" fill="#bfc3c7"/><circle cx="270" cy="230" r="46" fill="#dcdee1"/>`;
      case 'movement': return `
        <rect x="120" y="120" width="160" height="160" rx="16" fill="#1f1f1f"/>
        <circle cx="200" cy="200" r="20" fill="#cfae5e"/><circle cx="200" cy="200" r="8" fill="#1f1f1f"/>
        <line x1="200" y1="200" x2="200" y2="60" stroke="#1c1c1c" stroke-width="6" stroke-linecap="round"/><line x1="200" y1="200" x2="300" y2="150" stroke="#1c1c1c" stroke-width="9" stroke-linecap="round"/>`;
      default: return face(200, 200, 140, dial);
    }
  }

  // Ảnh thật do quản trị viên tải lên (Sản phẩm → Sửa → Tải ảnh); chưa có thì dùng ảnh minh họa tự vẽ
  const photos = p => p.images || [];

  const cache = {};
  return {
    hex,
    // Số ảnh của sản phẩm (ảnh thật hoặc 3 ảnh minh họa)
    count: p => photos(p).length || 3,
    // Ảnh danh mục (Danh mục & thương hiệu → Danh mục → Sửa → Ảnh đại diện)
    category: id => (Catalog.category(id) || {}).image || null,
    // variant 0: ảnh chính, 1: ảnh phụ dùng khi rê chuột, 2: cận cảnh
    product(p, variant = 0) {
      const ph = photos(p);
      if (ph.length) return ph[variant] || ph[0];
      const key = p.id + ':' + variant;
      if (cache[key]) return cache[key];
      const bg = ['#f4f4f2', '#ecebe7', '#f0efeb'][variant] || '#f4f4f2';
      const body = variant === 1 ? `<g transform="rotate(-14 200 200) scale(.92) translate(17 17)">${draw(p)}</g>`
        : variant === 2 ? `<g transform="translate(-200 -200) scale(2)">${draw(p)}</g>` : draw(p);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/>${body}</svg>`;
      return (cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    }
  };
})();

/* ================= THẺ SẢN PHẨM ================= */
function productCard(p) {
  const pr = Pricing.get(p);
  const rv = Reviews.stats(p.id);
  const brand = Catalog.brand(p.brandId);
  const badges = [];
  if (pr.source === 'flash') badges.push('<span class="badge-tag tag-flash"><i class="bi bi-lightning-charge-fill"></i> Flash sale</span>');
  if (pr.percent > 0) badges.push(`<span class="badge-tag tag-sale">-${pr.percent}%</span>`);
  if (Catalog.isNew(p)) badges.push('<span class="badge-tag tag-new">Mới</span>');
  if (p.sold >= 200) badges.push('<span class="badge-tag tag-hot">Bán chạy</span>');
  const out = p.stock <= 0;
  const liked = typeof Wishlist !== 'undefined' && Wishlist.has(p.id);
  return `
  <article class="product-card${out ? ' is-out' : ''}" data-id="${p.id}">
    <a href="${Catalog.url(p)}" class="pc-media" aria-label="${Utils.escape(p.name)}">
      <img src="${Img.product(p)}" alt="${Utils.escape(p.name)}" loading="lazy" class="pc-img">
      <img src="${Img.product(p, 1)}" alt="" loading="lazy" class="pc-img pc-img-alt" aria-hidden="true">
      <div class="pc-badges">${badges.join('')}</div>
      ${out ? '<span class="pc-out">Hết hàng</span>' : ''}
    </a>
    <div class="pc-actions">
      <button class="pc-btn js-wish${liked ? ' active' : ''}" data-id="${p.id}" title="Yêu thích" aria-label="Yêu thích"><i class="bi ${liked ? 'bi-heart-fill' : 'bi-heart'}"></i></button>    </div>
    <div class="pc-body">
      <div class="pc-brand">${brand ? Utils.escape(brand.name) : ''}</div>
      <h3 class="pc-name"><a href="${Catalog.url(p)}">${Utils.escape(p.name)}</a></h3>
      <div class="pc-rating">${rv.count ? `${Reviews.stars(rv.avg)} <span>(${rv.count})</span>` : '<span class="text-muted-2">Chưa có đánh giá</span>'}</div>
      <div class="pc-price">
        <span class="price-now">${Utils.formatPrice(pr.price)}</span>
        ${pr.percent > 0 ? `<span class="price-old">${Utils.formatPrice(pr.original)}</span>` : ''}
      </div>
      ${out
        ? `<a class="btn btn-outline-secondary btn-sm w-100 mt-2" href="${ROOT}lien-he.html?product=${p.id}"><i class="bi bi-telephone me-1"></i>Liên hệ</a>`
        : `<button class="btn btn-outline-dark btn-sm w-100 mt-2 js-add-cart" data-id="${p.id}"><i class="bi bi-bag-plus me-1"></i>Thêm vào giỏ</button>`}
    </div>
  </article>`;
}

/* ================= THẺ BÀI VIẾT ================= */
// Ảnh bìa: ảnh thật nếu có, nếu không lấy ảnh minh họa của sản phẩm liên quan (coverProduct) hoặc sản phẩm nổi bật
function postCover(post) {
  if (post.image) return post.image;
  const pool = Catalog.products().filter(p => p.featured);
  const p = (post.coverProduct && Catalog.product(post.coverProduct)) ||
    pool[[...post.id].reduce((s, c) => s + c.charCodeAt(0), 0) % pool.length];
  return Img.product(p, 1);
}

function postCard(post) {
  return `<div class="col-md-4"><article class="post-card">
    <a href="${ROOT}chi-tiet-tin-tuc.html?id=${post.id}" class="post-media"><img src="${postCover(post)}" alt="" loading="lazy"></a>
    <div class="post-meta">${Utils.escape(post.category)} · ${Utils.formatDate(post.createdAt)}</div>
    <h3 class="post-title"><a href="${ROOT}chi-tiet-tin-tuc.html?id=${post.id}">${Utils.escape(post.title)}</a></h3>
    <p class="post-excerpt">${Utils.escape(post.excerpt)}</p>
  </article></div>`;
}