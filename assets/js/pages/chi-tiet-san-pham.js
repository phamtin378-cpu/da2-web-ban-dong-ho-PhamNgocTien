// Trang chi tiết sản phẩm: ảnh, giá & khuyến mãi, mua hàng, thông số, đánh giá, hỏi đáp, sản phẩm liên quan.
(function () {
  const p = Catalog.product(Utils.param('id'));
  if (!p || p.status !== 'active') { location.replace('404.html'); return; }
  const cat = Catalog.category(p.categoryId);
  const parent = Catalog.parentOf(p.categoryId);
  const brand = Catalog.brand(p.brandId);
  const S = DB.settings();
  Layout.init({ active: parent.id, title: p.name });
  document.querySelector('meta[name="description"]').content = `${p.name} chính hãng – ${p.description.slice(0, 120)}`;

  /* ================= Breadcrumb ================= */
  $('#breadcrumb').innerHTML = `
    <li class="breadcrumb-item"><a href="index.html">Trang chủ</a></li>
    <li class="breadcrumb-item"><a href="${Catalog.catUrl(parent.id)}">${parent.name}</a></li>
    <li class="breadcrumb-item"><a href="${Catalog.catUrl(cat.id)}">${cat.name}</a></li>
    <li class="breadcrumb-item active" aria-current="page">${Utils.escape(p.name)}</li>`;

  /* ================= Ảnh ================= */
  (function gallery() {
    const n = Img.count(p);
    const main = $('#mainImg');
    const set = i => {
      main.src = Img.product(p, i);
      main.alt = `${p.name} – ảnh ${i + 1}`;
      $$('#pdThumbs button').forEach((b, k) => b.classList.toggle('active', k === i));
    };
    $('#pdThumbs').innerHTML = Array.from({ length: n }, (_, i) =>
      `<button type="button" data-i="${i}" aria-label="Ảnh ${i + 1}"><img src="${Img.product(p, i)}" alt=""></button>`).join('');
    $('#pdThumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) set(+b.dataset.i); });
    set(0);
    // Phóng to theo vị trí chuột
    const box = $('#pdMainImg');
    box.addEventListener('mousemove', e => {
      const r = box.getBoundingClientRect();
      main.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`;
      box.classList.add('zoom');
    });
    box.addEventListener('mouseleave', () => box.classList.remove('zoom'));
    box.addEventListener('click', () => openLightbox(main.src));
  })();

  function openLightbox(src) {
    $('#lightboxImg').src = src;
    bootstrap.Modal.getOrCreateInstance('#lightbox').show();
  }

  /* ================= Thông tin & mua hàng ================= */
  function renderInfo() {
    const pr = Pricing.get(p);
    const rv = Reviews.stats(p.id);
    const out = p.stock <= 0;
    const gifts = Promo.giftsFor(p);
    const wrist = ['deo-tay', 'bo-tui'].includes(parent.id);
    const keys = Catalog.filtersFor(p.categoryId).filter(k => p.specs[k] !== undefined).slice(0, 4);
    const liked = Wishlist.has(p.id);

    const badges = [];
    if (pr.percent) badges.push(`<span class="badge-tag tag-sale">-${pr.percent}%</span>`);
    if (Catalog.isNew(p)) badges.push('<span class="badge-tag tag-new">Mới</span>');
    if (p.sold >= 200) badges.push('<span class="badge-tag tag-hot">Bán chạy</span>');
    $('#pdBadges').innerHTML = badges.join('');

    $('#pdInfo').innerHTML = `
      <a href="san-pham.html?brand=${brand.id}" class="pc-brand">${Utils.escape(brand.name)} · ${brand.country}</a>
      <h1 class="pd-title">${Utils.escape(p.name)}</h1>
      <div class="pd-meta">
        <span>Mã: <strong>${p.sku}</strong></span>
        <a href="#tab-reviews" class="js-goto-reviews">${rv.count ? `${Reviews.stars(rv.avg)} <span>${rv.avg} (${rv.count} đánh giá)</span>` : 'Chưa có đánh giá'}</a>
        <span>Đã bán ${p.sold}</span>
      </div>

      ${pr.source === 'flash' ? `
      <div class="pd-flash">
        <div class="d-flex align-items-center gap-2"><i class="bi bi-lightning-charge-fill"></i><strong>FLASH SALE</strong></div>
        <div class="d-flex align-items-center gap-2 small">Kết thúc sau <div class="countdown countdown-light" id="pdCountdown"></div></div>
      </div>` : ''}
      <div class="pd-price${pr.source === 'flash' ? ' is-flash' : ''}">
        <span class="price-now">${Utils.formatPrice(pr.price)}</span>
        ${pr.percent ? `<span class="price-old">${Utils.formatPrice(pr.original)}</span><span class="badge-tag tag-sale">-${pr.percent}%</span>` : ''}
        ${pr.source === 'flash' ? `<div class="flash-bar mt-2 w-100"><span style="width:${Math.round(pr.flash.sold / pr.flash.quota * 100)}%"></span><em>Còn ${pr.flash.quota - pr.flash.sold}/${pr.flash.quota} suất</em></div>` : ''}
        ${pr.source === 'promo' ? `<div class="small w-100 mt-1"><i class="bi bi-tag me-1"></i>Áp dụng: <a href="san-pham.html?promo=${pr.promo.id}" class="text-decoration-underline">${Utils.escape(pr.promo.name)}</a> · đến ${Utils.formatDate(pr.promo.end)}</div>` : ''}
      </div>

      <div class="pd-stock ${out ? 'out' : p.stock <= 5 ? 'low' : ''}">
        <i class="bi ${out ? 'bi-x-circle' : 'bi-check-circle'}"></i>
        ${out ? 'Tạm hết hàng' : p.stock <= 5 ? `Chỉ còn ${p.stock} sản phẩm` : 'Còn hàng'}
      </div>

      ${keys.length ? `<ul class="pd-highlights">${keys.map(k => `<li><span>${FILTER_DEFS[k].label}</span><strong>${[].concat(p.specs[k]).join(', ')}</strong></li>`).join('')}</ul>` : ''}

      ${gifts.length ? `<div class="pd-box"><div class="pd-box-title"><i class="bi bi-gift"></i> Quà tặng & ưu đãi</div>
        <ul class="mb-0">${gifts.map(g => `<li>${Utils.escape(g.gift)} <span class="text-muted-2">– ${Utils.escape(g.name)}</span></li>`).join('')}</ul></div>` : ''}

      <div class="pd-box"><div class="pd-box-title"><i class="bi bi-stars"></i> Dịch vụ kèm theo <span class="fw-normal text-muted-2">(chọn trong giỏ hàng)</span></div>
        <ul class="mb-0">
          ${wrist ? `<li>Khắc tên lên nắp lưng: ${Utils.formatPrice(S.engraveFee)}</li>` : ''}
          <li>Gói quà cao cấp kèm thiệp: ${Utils.formatPrice(S.giftWrapFee)}</li>
          ${p.heavy ? `<li>Lắp đặt & cân chỉnh tại nhà: ${Utils.formatPrice(S.installFee)} · phụ phí vận chuyển hàng cồng kềnh ${Utils.formatPrice(S.heavyShipFee)}</li>` : ''}
        </ul></div>

      ${out ? `
        <div class="d-flex gap-2 mt-4">
          <a class="btn btn-dark btn-lg flex-fill" href="lien-he.html?product=${p.id}"><i class="bi bi-chat-dots me-2"></i>Liên hệ đặt hàng</a>
          <a class="btn btn-outline-dark btn-lg" href="tel:${S.hotline.replace(/\s/g, '')}"><i class="bi bi-telephone"></i></a>
        </div>` : `
        <div class="pd-buy">
          <div class="qty-input" role="group" aria-label="Số lượng">
            <button type="button" class="js-qty" data-d="-1" aria-label="Giảm"><i class="bi bi-dash"></i></button>
            <input type="number" id="qty" value="1" min="1" max="${p.stock}" aria-label="Số lượng">
            <button type="button" class="js-qty" data-d="1" aria-label="Tăng"><i class="bi bi-plus"></i></button>
          </div>
          <button class="btn btn-outline-dark btn-lg flex-fill" id="addCartBtn"><i class="bi bi-bag-plus me-2"></i>Thêm vào giỏ</button>
          <button class="btn btn-dark btn-lg flex-fill" id="buyNowBtn">Mua ngay</button>
        </div>`}
      <div class="d-flex gap-4 mt-3 small pd-links">
        <button class="btn btn-link p-0 text-dark js-wish${liked ? ' active' : ''}" data-id="${p.id}"><i class="bi ${liked ? 'bi-heart-fill' : 'bi-heart'}"></i> Yêu thích</button>        <button class="btn btn-link p-0 text-dark" id="shareBtn"><i class="bi bi-share"></i> Chia sẻ</button>
      </div>

      <ul class="pd-commit">
        <li><i class="bi bi-patch-check"></i>Chính hãng 100%, đầy đủ hộp & sổ bảo hành</li>
        <li><i class="bi bi-shield-check"></i>Bảo hành ${p.warranty >= 12 ? p.warranty / 12 + ' năm' : p.warranty + ' tháng'} tại TIMEHOUSE</li>
        <li><i class="bi bi-arrow-repeat"></i>Đổi trả trong 7 ngày nếu lỗi nhà sản xuất</li>
        <li><i class="bi bi-truck"></i>${p.heavy ? 'Giao hàng & lắp đặt bởi kỹ thuật viên' : `Miễn phí giao hàng đơn từ ${Utils.formatPrice(S.freeShipThreshold)}`}</li>
      </ul>`;

    if (pr.source === 'flash') Utils.countdown($('#pdCountdown'), pr.promo.end, () => location.reload());
    bindInfo();
  }

  function bindInfo() {
    const qty = $('#qty');
    $$('.js-qty').forEach(b => b.addEventListener('click', () => {
      qty.value = Math.min(p.stock, Math.max(1, (+qty.value || 1) + +b.dataset.d));
    }));
    qty?.addEventListener('change', () => { qty.value = Math.min(p.stock, Math.max(1, Math.floor(+qty.value) || 1)); });
    $('#addCartBtn')?.addEventListener('click', () => Cart.add(p.id, +qty.value));
    $('#buyNowBtn')?.addEventListener('click', () => {
      const inCart = Cart.items().some(i => i.productId === p.id);
      if (inCart || Cart.add(p.id, +qty.value, { silent: true })) location.href = 'gio-hang.html';
    });    $('#shareBtn').addEventListener('click', async () => {
      try {
        if (navigator.share) await navigator.share({ title: p.name, url: location.href });
        else { await navigator.clipboard.writeText(location.href); Utils.toast('Đã sao chép liên kết sản phẩm.'); }
      } catch { /* người dùng hủy chia sẻ */ }
    });
    $('.js-goto-reviews').addEventListener('click', e => { e.preventDefault(); gotoTab('#reviewTabBtn'); });
  }

  function gotoTab(btnSel) {
    bootstrap.Tab.getOrCreateInstance($(btnSel)).show();
    $('.pd-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ================= Mô tả, thông số, bảo hành ================= */
  (function details() {
    const specsText = Catalog.filtersFor(p.categoryId).filter(k => p.specs[k] !== undefined).slice(0, 3)
      .map(k => `${FILTER_DEFS[k].label.toLowerCase()} ${[].concat(p.specs[k]).join(', ')}`).join(', ');
    $('#descBody').innerHTML = `
      <p><strong>${Utils.escape(p.name)}</strong> thuộc dòng <a href="${Catalog.catUrl(cat.id)}">${cat.name.toLowerCase()}</a> của thương hiệu ${Utils.escape(brand.name)} (${brand.country}).</p>
      <p>${Utils.escape(p.description)}</p>
      ${specsText ? `<p>Điểm nổi bật: ${Utils.escape(specsText)}.</p>` : ''}
      <p class="text-muted-2 small">Hình ảnh mang tính minh họa. Màu sắc thực tế có thể chênh lệch nhẹ do ánh sáng và màn hình hiển thị.</p>`;

    const order = [...new Set(Catalog.filtersFor(p.categoryId).concat(Object.keys(p.specs)))];
    const rows = [['Thương hiệu', brand.name], ['Mã sản phẩm', p.sku], ['Danh mục', `${parent.name} › ${cat.name}`]]
      .concat(order.filter(k => p.specs[k] !== undefined).map(k => [SPEC_LABELS[k] || k, [].concat(p.specs[k]).join(', ')]))
      .concat([['Bảo hành', p.warranty >= 12 ? `${p.warranty / 12} năm` : `${p.warranty} tháng`]]);
    $('#specTable').innerHTML = '<tbody>' + rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${Utils.escape(v)}</td></tr>`).join('') + '</tbody>';

    const years = p.warranty >= 12 ? `${p.warranty / 12} năm` : `${p.warranty} tháng`;
    const extra = {
      'deo-tay': '<li>Miễn phí thay pin trọn đời với đồng hồ quartz, lau dầu bảo dưỡng 1 lần/năm với đồng hồ cơ.</li><li>Không bảo hành dây, mặt kính bị vỡ do va đập và hư hỏng do vào nước khi đã mở nắp lưng ở nơi khác.</li>',
      'thong-minh': '<li>Bảo hành theo chính sách của hãng tại trung tâm bảo hành ủy quyền.</li><li>1 đổi 1 trong 30 ngày nếu lỗi phần cứng.</li>',
      'treo-tuong': '<li>Bảo hành bộ máy, miễn phí thay máy nếu chạy sai giờ do lỗi kỹ thuật.</li>',
      'de-ban': '<li>Bảo hành bộ máy và chức năng điện tử.</li>',
      'dong-ho-cay': '<li>Kỹ thuật viên kiểm tra, cân chỉnh tại nhà định kỳ 12 tháng/lần trong thời gian bảo hành.</li><li>Hỗ trợ tháo dỡ, lắp đặt lại khi chuyển nhà (tính phí vận chuyển).</li>',
      'bo-tui': '<li>Lau dầu bảo dưỡng miễn phí 1 lần/năm với máy cơ.</li>',
      'phu-kien': '<li>Đổi mới nếu lỗi do nhà sản xuất.</li>'
    }[parent.id] || '';
    $('#warrantyBody').innerHTML = `
      <p>Sản phẩm được bảo hành <strong>${years}</strong> tại toàn bộ hệ thống cửa hàng TIMEHOUSE.</p>
      <ul>${extra}<li>Đổi sản phẩm mới trong 7 ngày nếu có lỗi từ nhà sản xuất (còn đầy đủ hộp, phụ kiện, chưa qua sử dụng).</li>
      <li>Mang theo phiếu bảo hành điện tử (tra cứu bằng số điện thoại mua hàng) khi đến bảo hành.</li></ul>
      <p><a href="chinh-sach.html#bao-hanh" class="text-decoration-underline">Xem chính sách bảo hành chi tiết</a></p>`;
  })();

  /* ================= Đánh giá ================= */
  const RV_PER_PAGE = 5;
  const STAR_LABELS = ['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];
  const rvState = { filter: 'all', sort: 'newest', page: 1 };

  function renderReviewSummary() {
    const st = Reviews.stats(p.id);
    $('#reviewTabCount').textContent = st.count ? `(${st.count})` : '';
    $('#rvAvg').textContent = st.count ? st.avg.toFixed(1) : '–';
    $('#rvStars').innerHTML = Reviews.stars(st.avg, 'fs-5');
    $('#rvCount').textContent = st.count ? `${st.count} đánh giá` : 'Chưa có đánh giá';
    $('#rvDist').innerHTML = [5, 4, 3, 2, 1].map(s => {
      const n = st.dist[s - 1], pct = st.count ? Math.round(n / st.count * 100) : 0;
      return `<button type="button" class="rv-bar${rvState.filter === s ? ' active' : ''}" data-star="${s}">
        <span>${s} <i class="bi bi-star-fill"></i></span><div class="bar"><div style="width:${pct}%"></div></div><em>${n}</em></button>`;
    }).join('');

    const u = Auth.user();
    const mine = u && Reviews.mine(u.id, p.id);
    const btn = $('#writeReviewBtn');
    btn.disabled = false;
    if (mine && !Reviews.editable(mine)) {
      btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Bạn đã đánh giá';
      btn.disabled = true;
      $('#rvCta').textContent = 'Đã quá 30 ngày nên không thể sửa đánh giá.';
    } else if (mine) {
      btn.innerHTML = '<i class="bi bi-pencil me-1"></i>Sửa đánh giá';
      $('#rvCta').textContent = mine.status === 'pending' ? 'Đánh giá của bạn đang chờ duyệt.' : 'Cảm ơn bạn đã đánh giá!';
    } else {
      btn.innerHTML = '<i class="bi bi-pencil-square me-1"></i>Viết đánh giá';
      $('#rvCta').textContent = 'Chia sẻ trải nghiệm của bạn về sản phẩm';
    }
  }

  function renderReviewList() {
    const u = Auth.user();
    let list = Reviews.forViewer(p.id, u && u.id);
    const counts = {
      all: list.length, img: list.filter(r => r.images.length).length, verified: list.filter(r => r.verified).length
    };
    $('#rvFilters').innerHTML = [['all', `Tất cả (${counts.all})`], ['img', `Có hình ảnh (${counts.img})`], ['verified', `Đã mua hàng (${counts.verified})`]]
      .concat([5, 4, 3, 2, 1].map(s => [s, `${s} sao`]))
      .map(([v, l]) => `<button type="button" data-f="${v}" class="${String(rvState.filter) === String(v) ? 'active' : ''}">${l}</button>`).join('');

    if (rvState.filter === 'img') list = list.filter(r => r.images.length);
    else if (rvState.filter === 'verified') list = list.filter(r => r.verified);
    else if (typeof rvState.filter === 'number') list = list.filter(r => r.rating === rvState.filter);
    list.sort(rvState.sort === 'helpful'
      ? (a, b) => b.helpful.length - a.helpful.length || b.createdAt.localeCompare(a.createdAt)
      : (a, b) => b.createdAt.localeCompare(a.createdAt));
    // Đánh giá của chính mình luôn ở đầu
    if (u) list.sort((a, b) => (b.userId === u.id) - (a.userId === u.id));

    const pages = Math.max(1, Math.ceil(list.length / RV_PER_PAGE));
    rvState.page = Math.min(rvState.page, pages);
    const slice = list.slice((rvState.page - 1) * RV_PER_PAGE, rvState.page * RV_PER_PAGE);

    $('#rvList').innerHTML = slice.length ? slice.map(r => {
      const own = u && r.userId === u.id;
      const helped = u && r.helpful.includes(u.id);
      return `<article class="rv-item" data-id="${r.id}">
        <div class="rv-avatar">${Utils.escape(r.userName.trim().split(' ').pop()[0])}</div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <strong>${Utils.escape(r.userName)}</strong>
            ${r.verified ? '<span class="rv-verified"><i class="bi bi-patch-check-fill"></i> Đã mua hàng</span>' : ''}
            ${own ? '<span class="badge text-bg-light border">Của bạn</span>' : ''}
            ${r.status === 'pending' ? '<span class="badge text-bg-warning">Chờ duyệt</span>' : ''}
          </div>
          <div class="d-flex align-items-center gap-2 small mt-1">${Reviews.stars(r.rating)}<span class="text-muted-2">${Utils.formatDate(r.createdAt)}${r.updatedAt !== r.createdAt ? ' · đã chỉnh sửa' : ''}</span></div>
          ${r.title ? `<div class="fw-semibold mt-2">${Utils.escape(r.title)}</div>` : ''}
          <p class="mb-2 mt-1">${Utils.escape(r.content)}</p>
          ${r.tags.length ? `<div class="rv-tags">${r.tags.map(t => `<span>${Utils.escape(t)}</span>`).join('')}</div>` : ''}
          ${r.images.length ? `<div class="rv-images">${r.images.map(src => `<button type="button" class="js-rv-img"><img src="${src}" alt="Ảnh đánh giá"></button>`).join('')}</div>` : ''}
          <div class="rv-actions">
            ${own ? '<button type="button" class="js-rv-edit"><i class="bi bi-pencil"></i> Sửa</button>' : `
            <button type="button" class="js-rv-helpful${helped ? ' active' : ''}"><i class="bi ${helped ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}"></i> Hữu ích (${r.helpful.length})</button>
            <button type="button" class="js-rv-report"><i class="bi bi-flag"></i> Báo cáo</button>`}
          </div>
          ${r.reply ? `<div class="rv-reply"><div class="fw-semibold small"><i class="bi bi-shop me-1"></i>Phản hồi từ cửa hàng <span class="text-muted-2 fw-normal">· ${Utils.formatDate(r.reply.at)}</span></div><div class="mt-1">${Utils.escape(r.reply.content)}</div></div>` : ''}
        </div>
      </article>`;
    }).join('') : '<div class="empty-state py-5"><i class="bi bi-chat-square-text"></i>Chưa có đánh giá phù hợp.</div>';
    $('#rvPager').innerHTML = Utils.pagination(rvState.page, pages);
  }

  function renderReviews() { renderReviewSummary(); renderReviewList(); }

  $('#rvDist').addEventListener('click', e => {
    const b = e.target.closest('[data-star]');
    if (!b) return;
    const s = +b.dataset.star;
    rvState.filter = rvState.filter === s ? 'all' : s;
    rvState.page = 1;
    renderReviews();
  });
  $('#rvFilters').addEventListener('click', e => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    rvState.filter = isNaN(+b.dataset.f) ? b.dataset.f : +b.dataset.f;
    rvState.page = 1;
    renderReviews();
  });
  $('#rvSort').addEventListener('change', e => { rvState.sort = e.target.value; rvState.page = 1; renderReviewList(); });
  $('#rvPager').addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (b && !b.closest('.disabled')) { rvState.page = +b.dataset.page; renderReviewList(); $('#rvList').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('#rvList').addEventListener('click', async e => {
    const item = e.target.closest('.rv-item');
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest('.js-rv-img')) { openLightbox(e.target.closest('.js-rv-img').querySelector('img').src); return; }
    if (e.target.closest('.js-rv-edit')) { openReviewModal(); return; }
    if (e.target.closest('.js-rv-helpful')) {
      if (!Auth.guard('đánh dấu đánh giá hữu ích')) return;
      Reviews.toggleHelpful(id);
      renderReviewList();
      return;
    }
    if (e.target.closest('.js-rv-report')) {
      if (!Auth.guard('báo cáo đánh giá')) return;
      if (!await Utils.confirm('Báo cáo đánh giá này?', 'Đánh giá có nội dung spam, xúc phạm hoặc không liên quan đến sản phẩm.', 'Báo cáo')) return;
      const r = Reviews.report(id);
      Utils.toast(r.already ? 'Bạn đã báo cáo đánh giá này trước đó.' : 'Cảm ơn bạn! Chúng tôi sẽ xem xét đánh giá này.', r.already ? 'info' : 'success');
      renderReviews();
    }
  });

  /* ---------- Modal viết / sửa đánh giá ---------- */
  const form = { rating: 0, tags: [], images: [], editing: null };
  const modal = () => bootstrap.Modal.getOrCreateInstance('#reviewModal');

  function paintStars(n) {
    $$('#starInput button').forEach((b, i) => b.querySelector('i').className = 'bi ' + (i < n ? 'bi-star-fill' : 'bi-star'));
    $('#starLabel').textContent = n ? STAR_LABELS[n - 1] : 'Chọn số sao';
  }
  function paintImages() {
    $$('#rvImages .rv-thumb').forEach(x => x.remove());
    $('#rvImages').insertAdjacentHTML('afterbegin', form.images.map((src, i) =>
      `<div class="rv-thumb"><img src="${src}" alt=""><button type="button" data-i="${i}" aria-label="Xóa ảnh"><i class="bi bi-x"></i></button></div>`).join(''));
    $('.rv-upload-btn').hidden = form.images.length >= 5;
  }
  function paintTags() {
    $('#rvTags').innerHTML = Reviews.TAGS.map(t => `<button type="button" class="${form.tags.includes(t) ? 'active' : ''}" data-tag="${t}">${t}</button>`).join('');
  }

  function openReviewModal() {
    if (!Auth.guard('viết đánh giá')) return;
    const mine = Reviews.mine(Auth.user().id, p.id);
    if (mine && !Reviews.editable(mine)) { Utils.toast('Đã quá thời hạn sửa đánh giá.', 'warning'); return; }
    form.editing = mine;
    form.rating = mine ? mine.rating : 0;
    form.tags = mine ? mine.tags.slice() : [];
    form.images = mine ? mine.images.slice() : [];
    $('#reviewModalTitle').textContent = mine ? 'Sửa đánh giá' : 'Viết đánh giá';
    $('#rvTitle').value = mine ? mine.title : '';
    $('#rvContent').value = mine ? mine.content : '';
    $('#rvContentCount').textContent = $('#rvContent').value.length;
    $('#rvDelete').hidden = !mine;
    $('#starError').hidden = true;
    Utils.clearInvalid($('#reviewForm'));
    paintStars(form.rating); paintTags(); paintImages();
    modal().show();
  }

  $('#rvProductImg').src = Img.product(p);
  $('#rvProductName').textContent = p.name;
  $('#starInput').innerHTML = [1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} sao – ${STAR_LABELS[n - 1]}"><i class="bi bi-star"></i></button>`).join('');
  $('#starInput').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { form.rating = +b.dataset.n; paintStars(form.rating); $('#starError').hidden = true; } });
  $('#starInput').addEventListener('mouseover', e => { const b = e.target.closest('button'); if (b) paintStars(+b.dataset.n); });
  $('#starInput').addEventListener('mouseleave', () => paintStars(form.rating));
  $('#rvTags').addEventListener('click', e => {
    const b = e.target.closest('[data-tag]');
    if (!b) return;
    const t = b.dataset.tag;
    form.tags = form.tags.includes(t) ? form.tags.filter(x => x !== t) : form.tags.concat(t);
    paintTags();
  });
  $('#rvContent').addEventListener('input', e => $('#rvContentCount').textContent = e.target.value.length);
  $('#rvFile').addEventListener('change', async e => {
    const files = Array.from(e.target.files).slice(0, 5 - form.images.length);
    if (e.target.files.length > files.length) Utils.toast('Chỉ được tải tối đa 5 ảnh.', 'warning');
    for (const f of files) {
      try { form.images.push(await Utils.readImage(f, 800, 0.75)); }
      catch { Utils.toast(`Không đọc được tệp ${Utils.escape(f.name)}.`, 'error'); }
    }
    e.target.value = '';
    paintImages();
  });
  $('#rvImages').addEventListener('click', e => {
    const b = e.target.closest('.rv-thumb button');
    if (b) { form.images.splice(+b.dataset.i, 1); paintImages(); }
  });
  $('#writeReviewBtn').addEventListener('click', openReviewModal);

  $('#reviewForm').addEventListener('submit', e => {
    e.preventDefault();
    Utils.clearInvalid(e.target);
    let ok = true;
    if (!form.rating) { $('#starError').hidden = false; ok = false; }
    const content = $('#rvContent');
    if (content.value.trim().length < 10) { Utils.setInvalid(content, 'Nội dung tối thiểu 10 ký tự.'); ok = false; }
    if (!ok) return;
    try {
      const r = Reviews.submit(p.id, { rating: form.rating, title: $('#rvTitle').value, content: content.value, tags: form.tags, images: form.images });
      if (!r.ok) { Utils.toast(r.error, 'error'); return; }
      modal().hide();
      Utils.toast(r.edited ? 'Đã cập nhật đánh giá. Đánh giá sẽ hiển thị lại sau khi được duyệt.' : 'Cảm ơn bạn! Đánh giá đã được gửi và đang chờ duyệt.');
      rvState.filter = 'all'; rvState.page = 1;
      renderReviews(); renderInfo();
    } catch {
      Utils.toast('Không lưu được đánh giá – dung lượng ảnh quá lớn. Hãy bớt ảnh và thử lại.', 'error');
    }
  });
  $('#rvDelete').addEventListener('click', async () => {
    if (!form.editing || !await Utils.confirm('Xóa đánh giá của bạn?', 'Thao tác này không thể hoàn tác.', 'Xóa')) return;
    Reviews.remove(form.editing.id);
    modal().hide();
    Utils.toast('Đã xóa đánh giá.', 'info');
    renderReviews(); renderInfo();
  });

  /* ================= Hỏi đáp ================= */
  function renderQA() {
    const u = Auth.user();
    const list = Questions.forViewer(p.id, u && u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const answered = list.filter(q => q.answer).length;
    $('#qaTabCount').textContent = answered ? `(${answered})` : '';
    $('#qaList').innerHTML = list.length ? list.map(q => `
      <div class="qa-item">
        <div class="qa-q"><span class="qa-mark">H</span><div><div>${Utils.escape(q.content)}</div>
          <div class="small text-muted-2 mt-1">${Utils.escape(q.userName)} · ${Utils.timeAgo(q.createdAt)}</div></div></div>
        ${q.answer ? `<div class="qa-a"><span class="qa-mark dark">Đ</span><div><div>${Utils.escape(q.answer.content)}</div>
          <div class="small text-muted-2 mt-1">${Utils.escape(q.answer.byName)} · ${Utils.timeAgo(q.answer.at)}</div></div></div>`
          : '<div class="qa-a text-muted-2 small"><i class="bi bi-hourglass-split me-1"></i>Câu hỏi của bạn đang chờ cửa hàng trả lời.</div>'}
      </div>`).join('') : '<div class="empty-state py-4"><i class="bi bi-chat-left-dots"></i>Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!</div>';
  }
  $('#qaForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#qaInput');
    Utils.clearInvalid(e.target);
    if (!Auth.guard('đặt câu hỏi')) return;
    if (input.value.trim().length < 10) { Utils.setInvalid(input, 'Câu hỏi tối thiểu 10 ký tự.'); return; }
    Questions.ask(p.id, input.value);
    input.value = '';
    Utils.toast('Đã gửi câu hỏi. Cửa hàng sẽ trả lời sớm nhất!');
    renderQA();
  });

  /* ================= Liên quan & đã xem ================= */
  const swiperOpts = { slidesPerView: 2, spaceBetween: 16, breakpoints: { 768: { slidesPerView: 3, spaceBetween: 24 }, 1200: { slidesPerView: 4, spaceBetween: 24 } } };
  const ids = Catalog.expandCategory(parent.id);
  const related = Catalog.products().filter(x => x.id !== p.id && ids.includes(x.categoryId))
    .sort((a, b) => (b.categoryId === p.categoryId) - (a.categoryId === p.categoryId) || b.sold - a.sold).slice(0, 10);
  $('#relatedSlides').innerHTML = related.map(x => `<div class="swiper-slide h-auto">${productCard(x)}</div>`).join('');
  new Swiper('.related-swiper', swiperOpts);

  const recent = Recent.ids().filter(x => x !== p.id).map(Catalog.product).filter(x => x && x.status === 'active').slice(0, 10);
  if (recent.length) {
    $('#recentSection').hidden = false;
    $('#recentSlides').innerHTML = recent.map(x => `<div class="swiper-slide h-auto">${productCard(x)}</div>`).join('');
    new Swiper('.recent-swiper', swiperOpts);
  }
  Recent.push(p.id);

  renderInfo();
  renderReviews();
  renderQA();
  if (location.hash === '#reviews') gotoTab('#reviewTabBtn');
  if (location.hash === '#qa') gotoTab('#qaTabBtn');
  // Từ trang tài khoản: mở thẳng form viết/sửa đánh giá
  if (location.hash === '#write-review') {
    gotoTab('#reviewTabBtn');
    history.replaceState(null, '', location.pathname + location.search + '#reviews');
    openReviewModal();
  }})();
