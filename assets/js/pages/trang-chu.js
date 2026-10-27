Layout.init({ active: 'home' });

// Banner đầu trang: ảnh thiết kế sẵn trong assets/img.
// Muốn thêm/đổi banner: chép ảnh vào assets/img rồi thêm 1 dòng vào danh sách dưới đây
// (image: đường dẫn ảnh, alt: mô tả ảnh, link: trang mở ra khi bấm vào banner).
const HOME_BANNERS = [
  { image: 'assets/img/banner anh 1.avif', alt: 'Đồng hồ nam giá 3 – 4 triệu',
    link: 'san-pham.html?cat=deo-tay-nam&min=3000000&max=4000000' },
  { image: 'assets/img/banner anh 2.avif', alt: 'Đồng hồ nam dây da mặt tròn',
    link: 'san-pham.html?cat=deo-tay-nam&f_strap=Da&f_shape=Tr%C3%B2n' },
  { image: 'assets/img/banner anh 3.jpg', alt: 'Đồng hồ Casio nữ dây da chính hãng',
    link: 'san-pham.html?cat=deo-tay-nu&brand=casio&f_strap=Da' }
];

(function hero() {
  $('#heroSlides').innerHTML = HOME_BANNERS.map((b, i) => `
    <div class="swiper-slide"><a href="${b.link}" class="hero-banner">
      <img src="${encodeURI(b.image)}" alt="${Utils.escape(b.alt)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
    </a></div>`).join('');
  new Swiper('.hero-swiper', {
    loop: HOME_BANNERS.length > 1, autoplay: { delay: 5000, disableOnInteraction: false },
    pagination: { el: '.hero-swiper .swiper-pagination', clickable: true },
    navigation: { nextEl: '.hero-swiper .hero-next', prevEl: '.hero-swiper .hero-prev' }
  });
})();

// Danh mục
(function categories() {
  const products = Catalog.products();
  $('#catTiles').innerHTML = Catalog.parents().map(c => {
    const ids = Catalog.expandCategory(c.id);
    const list = products.filter(p => ids.includes(p.categoryId));
    const sample = list.slice().sort((a, b) => b.sold - a.sold)[0];
    // Ảnh danh mục khai báo trong images.js; chưa có thì lấy ảnh sản phẩm bán chạy nhất của danh mục
    const photo = Img.category(c.id);
    const src = photo || (sample && Img.product(sample));
    return `<div class="col-6 col-md-4 col-lg"><a class="cat-tile" href="${Catalog.catUrl(c.id)}">
      ${src ? `<img src="${src}" alt="${Utils.escape(c.name)}" loading="lazy"${photo ? ' class="is-photo"' : ''}>` : ''}
      <div class="name">${c.short || c.name}</div><div class="count">${list.length} sản phẩm</div></a></div>`;
  }).join('');
})();

// Flash sale: đếm ngược + thanh "đã bán x/y"
(function flash() {
  const fs = Promo.running('flashsale')[0];
  if (!fs) return;
  const items = fs.items.map(i => ({ i, p: Catalog.product(i.productId) })).filter(x => x.p && x.p.status === 'active');
  if (!items.length) return;
  $('#flashSection').hidden = false;
  $('#flashMore').href = `san-pham.html?promo=${fs.id}`;
  Utils.countdown($('#flashCountdown'), fs.end, () => location.reload());
  $('#flashSlides').innerHTML = items.map(({ i, p }) => {
    const pct = Math.round(i.sold / i.quota * 100);
    const left = i.quota - i.sold;
    return `<div class="swiper-slide h-auto">${productCard(p)}
      <div class="flash-bar mt-2" title="Đã bán ${i.sold}/${i.quota}"><span style="width:${pct}%"></span>
        <em>${left > 0 ? (pct >= 70 ? `Sắp hết – còn ${left}` : `Đã bán ${i.sold}`) : 'Đã bán hết'}</em></div></div>`;
  }).join('');
  new Swiper('.flash-swiper', { slidesPerView: 2, spaceBetween: 16, breakpoints: { 768: { slidesPerView: 3, spaceBetween: 24 }, 1200: { slidesPerView: 4, spaceBetween: 24 } } });
})();

$('#newGrid').innerHTML = Catalog.query({ sort: 'newest' }).slice(0, 8).map(productCard).join('');
$('#hotGrid').innerHTML = Catalog.query({ sort: 'bestseller' })
  .filter(p => Catalog.parentOf(p.categoryId).id !== 'phu-kien').slice(0, 8).map(productCard).join('');

// Banner đôi
(function promoTiles() {
  const tiles = [
    { cat: 'treo-tuong', eyebrow: 'Giảm đến 15%', title: 'Đồng hồ treo tường', text: 'Kim trôi êm ái, thiết kế Bắc Âu, gỗ tự nhiên.', dark: false },
    { cat: 'dong-ho-cay', eyebrow: 'Miễn phí lắp đặt', title: 'Đồng hồ cây cao cấp', text: 'Bộ máy cơ Đức, chuông Westminster vang trầm.', dark: true }
  ];
  $('#promoTiles').innerHTML = tiles.map(t => {
    const p = Catalog.query({ cat: t.cat, sort: 'bestseller' })[0];
    return `<div class="col-md-6"><a href="${Catalog.catUrl(t.cat)}" class="promo-tile${t.dark ? ' dark' : ''}">
      <div class="promo-tile-text"><div class="hero-eyebrow">${t.eyebrow}</div><h3>${t.title}</h3><p>${t.text}</p><span class="link-more">Mua ngay</span></div>
      ${p ? `<img src="${Img.product(p)}" alt="">` : ''}</a></div>`;
  }).join('');
})();

// Trang trí: tab theo danh mục
(function decor() {
  const tabs = [['treo-tuong', 'Treo tường'], ['de-ban', 'Để bàn & trang trí'], ['dong-ho-cay', 'Đồng hồ cây']];
  const render = cat => {
    $('#decorGrid').innerHTML = Catalog.query({ cat, sort: 'bestseller' }).slice(0, 4).map(productCard).join('');
    $$('#decorTabs button').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  };
  $('#decorTabs').innerHTML = tabs.map(([c, l]) => `<button type="button" data-cat="${c}">${l}</button>`).join('');
  $('#decorTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) render(b.dataset.cat); });
  render(tabs[0][0]);
})();

// Thương hiệu
(function brands() {
  const products = Catalog.products();
  $('#brandSlides').innerHTML = Catalog.brands().filter(b => b.featured).map(b =>
    `<div class="swiper-slide"><a href="san-pham.html?brand=${b.id}" class="brand-tile">
      <span class="brand-name">${Utils.escape(b.name)}</span>
      <span class="small text-muted-2">${b.country} · ${products.filter(p => p.brandId === b.id).length} sản phẩm</span></a></div>`).join('');
  new Swiper('.brand-swiper', { slidesPerView: 2, spaceBetween: 12, autoplay: { delay: 2500 }, loop: true, breakpoints: { 768: { slidesPerView: 4 }, 1200: { slidesPerView: 6, spaceBetween: 16 } } });
})();

// Tin tức
$('#newsGrid').innerHTML = DB.all('posts').filter(p => p.status === 'published')
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3).map(postCard).join('');
