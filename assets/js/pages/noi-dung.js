// Các trang nội dung: khuyến mãi, tin tức, bài viết, giới thiệu, liên hệ, chính sách, FAQ.
(function () {
  const page = document.body.dataset.view;
  const S = DB.settings();
  Layout.init({ active: { promotions: 'promotions', news: 'news', 'news-detail': 'news' }[page] || '' });
  const fp = Utils.formatPrice;

  const pages = {
    /* ================= KHUYẾN MÃI ================= */
    promotions() {
      const root = $('#promoRoot');
      const all = Promo.all();
      const running = all.filter(p => Promo.status(p) === 'running');
      const upcoming = all.filter(p => Promo.status(p) === 'upcoming');
      const u = Auth.user();
      const saved = new Set((u && u.savedCoupons) || []);
      // Ảnh đại diện chương trình: ưu tiên sản phẩm nổi bật, tránh phụ kiện
      const sample = pr => {
        const list = Catalog.query({ promo: pr.id, sort: 'bestseller' });
        const notAcc = p => Catalog.parentOf(p.categoryId).id !== 'phu-kien';
        return list.find(p => p.featured && notAcc(p)) || list.find(notAcc) || list[0];
      };

      const dealCard = pr => {
        const p = pr.type !== 'coupon' && sample(pr);
        const detail = pr.type === 'discount'
          ? `Giảm ${pr.discountType === 'percent' ? pr.value + '%' : fp(pr.value)}${pr.maxDiscount ? ` (tối đa ${fp(pr.maxDiscount)})` : ''}`
          : pr.type === 'gift' ? `Quà: ${Utils.escape(pr.gift)}` : `${pr.items.length} sản phẩm giá sốc`;
        const st = Promo.status(pr);
        return `<div class="col-md-6 col-lg-4"><article class="deal-card">
          <a href="san-pham.html?promo=${pr.id}" class="deal-media">${p ? `<img src="${Img.product(p, 1)}" alt="">` : ''}
            <span class="badge-tag ${pr.type === 'flashsale' ? 'tag-flash' : pr.type === 'gift' ? 'tag-new' : 'tag-sale'}">${Promo.TYPE_LABEL[pr.type]}</span></a>
          <div class="p-3">
            <h3 class="h6 fw-bold mb-1">${Utils.escape(pr.name)}</h3>
            <div class="small">${detail}</div>
            <div class="small text-muted-2 mt-1">${Utils.escape(pr.description || '')}</div>
            <div class="small mt-2 ${st === 'running' ? '' : 'text-muted-2'}"><i class="bi bi-clock me-1"></i>${st === 'running' ? 'Kết thúc ' + Utils.formatDate(pr.end, true) : 'Bắt đầu ' + Utils.formatDate(pr.start, true)}</div>
            ${st === 'running' ? `<a href="san-pham.html?promo=${pr.id}" class="btn btn-dark btn-sm mt-3">Xem sản phẩm</a>` : ''}
          </div></article></div>`;
      };
      const couponCard = c => {
        const st = Promo.status(c);
        const out = c.usageLimit && c.used >= c.usageLimit;
        const pct = c.usageLimit ? Math.min(100, Math.round(c.used / c.usageLimit * 100)) : 0;
        return `<div class="col-md-6"><div class="ticket ticket-lg${out ? ' disabled' : ''}">
          <div class="ticket-left">${c.discountType === 'percent' ? c.value + '%' : Math.round(c.value / 1000) + 'K'}</div>
          <div class="ticket-body">
            <div class="fw-bold">${c.code}</div>
            <div class="small">${Utils.escape(c.description)}</div>
            <div class="small text-muted-2">${st === 'upcoming' ? 'Bắt đầu ' + Utils.formatDate(c.start) : 'HSD ' + Utils.formatDate(c.end)} · Đơn từ ${fp(c.minOrder || 0)}</div>
            ${c.usageLimit ? `<div class="usage-bar" title="Đã dùng ${pct}%"><div style="width:${pct}%"></div></div><div class="small text-muted-2">${out ? 'Đã hết lượt' : `Đã dùng ${pct}%`}</div>` : ''}
          </div>
          <button class="btn btn-sm ${saved.has(c.code) ? 'btn-outline-dark' : 'btn-dark'} js-save-coupon" data-code="${c.code}" ${saved.has(c.code) || out ? 'disabled' : ''}>${saved.has(c.code) ? 'Đã lưu' : 'Lưu mã'}</button>
        </div></div>`;
      };

      const flash = running.filter(p => p.type === 'flashsale');
      const deals = running.filter(p => ['discount', 'gift'].includes(p.type));
      const coupons = all.filter(p => p.type === 'coupon' && ['running', 'upcoming'].includes(Promo.status(p)));
      root.innerHTML = `
        ${flash.map(fs => `
        <div class="flash-box mb-5">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div><h2 class="section-title"><i class="bi bi-lightning-charge-fill text-flash"></i> ${Utils.escape(fs.name)}</h2>
              <div class="small text-muted-2 mt-1">${fs.items.length} sản phẩm giá sốc · số lượng có hạn</div></div>
            <div class="d-flex align-items-center gap-2 small">Kết thúc sau <div class="countdown" data-end="${fs.end}"></div></div>
            <a href="san-pham.html?promo=${fs.id}" class="btn btn-dark">Săn deal ngay</a>
          </div></div>`).join('')}
        <h2 class="section-title mb-3">Chương trình đang diễn ra</h2>
        <div class="row g-4 mb-5">${deals.map(dealCard).join('') || '<div class="col-12 text-muted-2">Hiện chưa có chương trình nào.</div>'}</div>
        <div class="d-flex justify-content-between align-items-end mb-3"><h2 class="section-title">Mã giảm giá</h2>
          ${u ? '<a href="tai-khoan.html#coupons" class="link-more">Ví mã của tôi</a>' : ''}</div>
        <div class="row g-3 mb-5">${coupons.map(couponCard).join('')}</div>
        ${upcoming.filter(p => p.type !== 'coupon').length ? `<h2 class="section-title mb-3">Sắp diễn ra</h2>
        <div class="row g-4">${upcoming.filter(p => p.type !== 'coupon').map(dealCard).join('')}</div>` : ''}`;

      $$('.countdown[data-end]', root).forEach(el => Utils.countdown(el, el.dataset.end, () => location.reload()));
      root.addEventListener('click', e => {
        const b = e.target.closest('.js-save-coupon');
        if (!b || !Auth.guard('lưu mã giảm giá')) return;
        const user = Auth.user();
        DB.update('users', user.id, { savedCoupons: [...new Set((user.savedCoupons || []).concat(b.dataset.code))] });
        b.textContent = 'Đã lưu'; b.disabled = true; b.className = 'btn btn-sm btn-outline-dark';
        Utils.toast(`Đã lưu mã <strong>${b.dataset.code}</strong> vào ví. Áp dụng ở bước giỏ hàng.`);
      });
    },

    /* ================= TIN TỨC ================= */
    news() {
      const PER = 6;
      const posts = DB.all('posts').filter(p => p.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const cats = [...new Set(posts.map(p => p.category))];
      const state = { cat: Utils.param('cat') || '', q: '', page: 1 };
      function render() {
        $('#newsCats').innerHTML = [['', 'Tất cả']].concat(cats.map(c => [c, c]))
          .map(([v, l]) => `<button type="button" data-cat="${v}" class="${state.cat === v ? 'active' : ''}">${l}</button>`).join('');
        const q = Utils.normalize(state.q);
        const list = posts.filter(p => (!state.cat || p.category === state.cat) && (!q || Utils.normalize(p.title + ' ' + p.excerpt).includes(q)));
        const pages = Math.max(1, Math.ceil(list.length / PER));
        state.page = Math.min(state.page, pages);
        $('#newsGrid').innerHTML = list.slice((state.page - 1) * PER, state.page * PER).map(postCard).join('') ||
          '<div class="col-12"><div class="empty-state"><i class="bi bi-newspaper"></i>Không tìm thấy bài viết phù hợp.</div></div>';
        $('#newsPager').innerHTML = Utils.pagination(state.page, pages);
      }
      $('#newsCats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { state.cat = b.dataset.cat; state.page = 1; render(); } });
      $('#newsSearch').addEventListener('input', Utils.debounce(e => { state.q = e.target.value.trim(); state.page = 1; render(); }, 250));
      $('#newsPager').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.closest('.disabled')) { state.page = +b.dataset.page; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
      render();
    },

    'news-detail'() {
      const post = DB.find('posts', Utils.param('id'));
      if (!post || post.status !== 'published') { location.replace('404.html'); return; }
      document.title = post.title + ' | TIMEHOUSE';
      document.querySelector('meta[name="description"]').content = post.excerpt;
      $('#breadcrumb').innerHTML = `<li class="breadcrumb-item"><a href="index.html">Trang chủ</a></li>
        <li class="breadcrumb-item"><a href="tin-tuc.html">Tin tức</a></li><li class="breadcrumb-item"><a href="tin-tuc.html?cat=${encodeURIComponent(post.category)}">${Utils.escape(post.category)}</a></li>`;
      $('#pageTitle').textContent = post.title;
      $('#pageSub').innerHTML = `${Utils.escape(post.author)} · ${Utils.formatDate(post.createdAt)} · ${Math.max(1, Math.round(post.content.replace(/<[^>]+>/g, '').split(/\s+/).length / 200))} phút đọc`;
      const cover = post.coverProduct && Catalog.product(post.coverProduct);
      const related = cover ? Catalog.query({ cat: Catalog.parentOf(cover.categoryId).id, sort: 'bestseller' }).slice(0, 3) : [];
      const others = DB.all('posts').filter(p => p.status === 'published' && p.id !== post.id)
        .sort((a, b) => (b.category === post.category) - (a.category === post.category) || b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
      $('#postRoot').innerHTML = `
        <div class="row g-5">
          <article class="col-lg-8">
            <img src="${postCover(post)}" alt="" class="post-cover">
            <p class="lead mt-4">${Utils.escape(post.excerpt)}</p>
            <div class="post-content">${post.content}</div>
            <div class="d-flex gap-2 align-items-center mt-4 pt-3 border-top">
              <span class="small text-muted-2">Chia sẻ:</span>
              <a class="btn btn-outline-dark btn-sm" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}"><i class="bi bi-facebook"></i></a>
              <button class="btn btn-outline-dark btn-sm" id="copyLink"><i class="bi bi-link-45deg"></i> Sao chép liên kết</button>
            </div>
          </article>
          <aside class="col-lg-4">
            ${related.length ? `<div class="summary-title">Sản phẩm liên quan</div>
              <div class="d-grid gap-3 mb-4">${related.map(p => {
                const pr = Pricing.get(p);
                return `<a href="${Catalog.url(p)}" class="mini-product"><img src="${Img.product(p)}" alt=""><div class="min-w-0">
                  <div class="small fw-medium text-truncate">${Utils.escape(p.name)}</div><div class="small fw-bold">${fp(pr.price)}</div></div></a>`;
              }).join('')}</div>` : ''}
            <div class="summary-title">Bài viết khác</div>
            <div class="d-grid gap-3">${others.map(p => `<a href="chi-tiet-tin-tuc.html?id=${p.id}" class="mini-product"><img src="${postCover(p)}" alt="">
              <div class="min-w-0"><div class="small fw-medium">${Utils.escape(p.title)}</div><div class="small text-muted-2">${Utils.formatDate(p.createdAt)}</div></div></a>`).join('')}</div>
          </aside>
        </div>`;
      $('#copyLink').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(location.href); } catch { /* bỏ qua */ }
        Utils.toast('Đã sao chép liên kết bài viết.');
      });
    },

    /* ================= GIỚI THIỆU ================= */
    about() {
      const products = Catalog.products();
      const featured = products.filter(p => p.featured);
      const pick = cat => featured.find(p => Catalog.parentOf(p.categoryId).id === cat) || products.find(p => Catalog.parentOf(p.categoryId).id === cat);
      $('#aboutCollage').innerHTML = ['deo-tay', 'treo-tuong', 'dong-ho-cay', 'de-ban'].map(c => pick(c)).filter(Boolean)
        .map(p => `<img src="${Img.product(p)}" alt="${Utils.escape(p.name)}">`).join('');
      $('#aboutStats').innerHTML = [[`${S.stores.length}`, 'Showroom'], [`${Catalog.brands().length}+`, 'Thương hiệu'], [`${products.length}+`, 'Mẫu sản phẩm'], ['50.000+', 'Khách hàng'], ['5 năm', 'Bảo hành tối đa']].map(([v, l]) =>
          `<div class="col"><div class="stat-value fs-2">${v}</div><div class="small text-muted-2">${l}</div></div>`).join('');
    },

    /* ================= LIÊN HỆ ================= */
    contact() {
      $('#contactInfo').innerHTML = `
        <div class="summary-title">Thông tin liên hệ</div>
        <ul class="list-unstyled contact-list">
          <li><i class="bi bi-geo-alt"></i><div><div class="small text-muted-2">Trụ sở</div>${S.address}</div></li>
          <li><i class="bi bi-telephone"></i><div><div class="small text-muted-2">Hotline (miễn phí)</div><a href="tel:${S.hotline.replace(/\s/g, '')}" class="fw-semibold">${S.hotline}</a></div></li>
          <li><i class="bi bi-envelope"></i><div><div class="small text-muted-2">Email</div><a href="mailto:${S.email}">${S.email}</a></div></li>
          <li><i class="bi bi-clock"></i><div><div class="small text-muted-2">Giờ làm việc</div>${S.workingHours}</div></li>
        </ul>
        <div class="d-flex gap-2 mt-3">
          <a href="${S.zalo}" target="_blank" rel="noopener" class="btn btn-outline-dark btn-sm">Chat Zalo</a>
          <a href="${S.messenger}" target="_blank" rel="noopener" class="btn btn-outline-dark btn-sm">Messenger</a>
        </div>
        <div class="summary-title mt-4">Showroom</div>
        <ul class="list-unstyled contact-list mb-0">${S.stores.map(s => `
          <li><i class="bi bi-shop"></i><div><div class="fw-semibold small">${Utils.escape(s.name)}</div>
            <div class="small">${Utils.escape(s.address)}</div><div class="small text-muted-2">${s.phone}</div></div></li>`).join('')}</ul>`;

      const u = Auth.user();
      if (u) { $('#ctName').value = u.name; $('#ctPhone').value = u.phone; $('#ctEmail').value = u.email; }
      const product = Catalog.product(Utils.param('product'));
      if (product) {
        $('#contactProduct').innerHTML = `<div class="mini-product mb-3 bg-soft p-2 rounded-3"><img src="${Img.product(product)}" alt="">
          <div class="min-w-0"><div class="small text-muted-2">Sản phẩm cần tư vấn</div><div class="small fw-semibold text-truncate">${Utils.escape(product.name)} (${product.sku})</div></div></div>`;
        $('#ctSubject').value = product.stock > 0 ? 'Tư vấn sản phẩm' : 'Đặt hàng sản phẩm hết hàng';
        $('#ctMessage').value = product.stock > 0 ? `Tôi cần tư vấn về sản phẩm ${product.name}.` : `Tôi muốn đặt trước sản phẩm ${product.name} khi có hàng.`;
      }
      $('#contactForm').addEventListener('submit', e => {
        e.preventDefault();
        Utils.clearInvalid(e.target);
        let ok = true;
        const fail = (id, m) => { Utils.setInvalid($('#' + id), m); ok = false; };
        if ($('#ctName').value.trim().length < 2) fail('ctName', 'Vui lòng nhập họ tên.');
        if (!Utils.isPhone($('#ctPhone').value)) fail('ctPhone', 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');
        if ($('#ctEmail').value.trim() && !Utils.isEmail($('#ctEmail').value)) fail('ctEmail', 'Email không hợp lệ.');
        if ($('#ctMessage').value.trim().length < 10) fail('ctMessage', 'Nội dung tối thiểu 10 ký tự.');
        if (!ok) return;
        DB.insert('contacts', {
          id: Utils.uid('lh'), userId: u ? u.id : null, name: $('#ctName').value.trim(), phone: $('#ctPhone').value.trim(),
          email: $('#ctEmail').value.trim(), subject: $('#ctSubject').value, productId: product ? product.id : null,
          message: $('#ctMessage').value.trim(), status: 'new', createdAt: new Date().toISOString(), reply: null
        });
        e.target.reset();
        $('#contactProduct').innerHTML = '';
        if (window.Swal) Swal.fire({ icon: 'success', title: 'Đã gửi yêu cầu!', text: 'TIMEHOUSE sẽ liên hệ với bạn trong vòng 24 giờ làm việc.', confirmButtonText: 'Đóng', buttonsStyling: false, customClass: { confirmButton: 'btn btn-dark' } });
        else Utils.toast('Đã gửi yêu cầu! Chúng tôi sẽ liên hệ trong 24 giờ làm việc.');
      });
    },

    /* ================= CHÍNH SÁCH ================= */
    policy() {
      const sections = [
        ['bao-hanh', 'Chính sách bảo hành', `
          <p>Mọi sản phẩm mua tại TIMEHOUSE được bảo hành tại toàn bộ hệ thống showroom. Thời gian bảo hành theo nhóm sản phẩm:</p>
          <table class="table spec-table"><tbody>
            <tr><th>Đồng hồ đeo tay, đồng hồ cây</th><td>5 năm (bộ máy)</td></tr>
            <tr><th>Đồng hồ treo tường, bỏ túi</th><td>2 năm</td></tr>
            <tr><th>Đồng hồ thông minh, để bàn</th><td>1 năm (theo chính sách hãng)</td></tr>
            <tr><th>Phụ kiện</th><td>6 tháng</td></tr></tbody></table>
          <ul><li>Miễn phí thay pin trọn đời với đồng hồ đeo tay quartz mua tại TIMEHOUSE.</li>
          <li>Không bảo hành: vỡ kính, móp vỏ do va đập; hư hỏng do tự ý tháo mở; dây, khóa bị mòn theo thời gian sử dụng.</li>
          <li>Tra cứu bảo hành điện tử bằng số điện thoại mua hàng.</li></ul>`],
        ['doi-tra', 'Chính sách đổi trả', `
          <ul><li><strong>Đổi mới trong 7 ngày</strong> nếu sản phẩm lỗi do nhà sản xuất (còn đầy đủ hộp, phụ kiện, tem, chưa qua sử dụng).</li>
          <li>Đổi sang sản phẩm khác (không lỗi) trong 3 ngày: thu phí 10% giá trị đơn hàng.</li>
          <li>Không áp dụng đổi trả với sản phẩm đã khắc tên, sản phẩm flash sale (trừ lỗi nhà sản xuất).</li>
          <li>Hoàn tiền trong 3–7 ngày làm việc qua tài khoản ngân hàng hoặc thẻ đã thanh toán.</li></ul>`],
        ['van-chuyen', 'Vận chuyển & lắp đặt', `
          <ul><li>Giao tiêu chuẩn 3–5 ngày làm việc: <strong>miễn phí</strong> cho đơn từ ${fp(S.freeShipThreshold)}, dưới mức này phí ${fp(S.shipFee)}.</li>
          <li>Giao hỏa tốc 1–2 ngày (nội thành Hà Nội, TP. HCM, Đà Nẵng): phụ phí ${fp(S.expressFee)}.</li>
          <li>Hàng cồng kềnh (đồng hồ cây, quả lắc, tranh đồng hồ khổ lớn): phụ phí vận chuyển ${fp(S.heavyShipFee)}, giao bằng xe tải nhỏ.</li>
          <li>Lắp đặt & cân chỉnh tại nhà bởi kỹ thuật viên: ${fp(S.installFee)}/sản phẩm.</li>
          <li>Dịch vụ khắc tên: ${fp(S.engraveFee)}/sản phẩm; gói quà kèm thiệp: ${fp(S.giftWrapFee)}/sản phẩm (có thể miễn phí theo chương trình khuyến mãi).</li>
          <li>Khách được kiểm tra hàng trước khi thanh toán (với đơn COD).</li></ul>`],
        ['thanh-toan', 'Chính sách thanh toán', `
          <ul><li><strong>COD:</strong> thanh toán tiền mặt khi nhận hàng.</li>
          <li><strong>Chuyển khoản / QR:</strong> ${S.bank.name} – STK ${S.bank.account} – ${S.bank.owner}. Nội dung: TIMEHOUSE + mã đơn hàng.</li>
          <li><strong>Thẻ ATM / Visa / Mastercard:</strong> thanh toán qua cổng bảo mật, không lưu thông tin thẻ.</li>
          <li>Mã giảm giá: mỗi đơn áp dụng 1 mã; mức giảm theo sản phẩm chỉ áp dụng chương trình có lợi nhất cho khách.</li></ul>`],
        ['bao-mat', 'Chính sách bảo mật', `
          <p>TIMEHOUSE thu thập họ tên, số điện thoại, email và địa chỉ chỉ để xử lý đơn hàng, bảo hành và chăm sóc khách hàng.</p>
          <ul><li>Không chia sẻ thông tin cho bên thứ ba ngoài đơn vị vận chuyển phục vụ giao hàng.</li>
          <li>Khách hàng có quyền xem, sửa thông tin trong mục Tài khoản hoặc yêu cầu xóa dữ liệu qua ${S.email}.</li>
          <li>Thông tin thanh toán thẻ được xử lý bởi cổng thanh toán đạt chuẩn PCI DSS.</li></ul>`]
      ];
      $('#policyNav').innerHTML = sections.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('');
      $('#policyBody').innerHTML = sections.map(([id, t, body]) => `<section id="${id}" class="policy-section"><h2>${t}</h2>${body}</section>`).join('');
      const links = $$('#policyNav a');
      const spy = () => {
        let cur = sections[0][0];
        sections.forEach(([id]) => { if (document.getElementById(id).getBoundingClientRect().top < 200) cur = id; });
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
      };
      window.addEventListener('scroll', spy, { passive: true });
      spy();
      if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 50);
    },

    /* ================= FAQ ================= */
    faq() {
      const groups = [
        ['Mua hàng', [
          ['Sản phẩm tại TIMEHOUSE có chính hãng không?', 'Toàn bộ sản phẩm được nhập khẩu chính ngạch, có đầy đủ hộp, sổ/thẻ bảo hành của hãng. TIMEHOUSE cam kết đền gấp 10 lần nếu phát hiện hàng giả.'],
          ['Tôi có cần tài khoản để mua hàng không?', 'Có. Bạn cần đăng ký tài khoản (miễn phí) để thêm vào giỏ, đặt hàng, theo dõi đơn và đánh giá sản phẩm. Bạn vẫn có thể xem sản phẩm mà không cần đăng nhập.'],
          ['Sản phẩm hết hàng thì đặt thế nào?', 'Bấm nút "Liên hệ" trên sản phẩm hoặc gửi form liên hệ với chủ đề "Đặt hàng sản phẩm hết hàng", nhân viên sẽ báo khi có hàng.'],
          ['Làm sao để hủy đơn hàng?', 'Vào Tài khoản → Đơn hàng → chọn đơn → Hủy đơn. Bạn chỉ hủy được khi đơn đang ở trạng thái "Chờ xác nhận"; sau đó vui lòng liên hệ hotline.']]],
        ['Thanh toán & khuyến mãi', [
          ['Có những hình thức thanh toán nào?', 'COD (tiền mặt khi nhận hàng), chuyển khoản/QR ngân hàng và thẻ ATM/Visa/Mastercard.'],
          ['Tôi có thể dùng nhiều mã giảm giá cho một đơn không?', 'Mỗi đơn chỉ áp dụng 1 mã giảm giá. Mã được trừ thêm trên giá đã giảm của sản phẩm.'],
          ['Một sản phẩm thuộc nhiều chương trình thì tính giá thế nào?', 'Hệ thống tự áp dụng mức giá thấp nhất trong các chương trình (giảm giá, flash sale) – bạn luôn nhận được ưu đãi tốt nhất.'],
          ['Flash sale có giới hạn số lượng không?', 'Có. Mỗi sản phẩm flash sale có số suất giới hạn; khi hết suất hoặc mua vượt số suất còn lại, sản phẩm được tính giá thường.']]],
        ['Vận chuyển & lắp đặt', [
          ['Phí vận chuyển là bao nhiêu?', `Miễn phí giao tiêu chuẩn cho đơn từ ${fp(S.freeShipThreshold)}, dưới mức này phí ${fp(S.shipFee)}. Giao hỏa tốc thêm ${fp(S.expressFee)}.`],
          ['Đồng hồ cây, đồng hồ treo tường lớn được giao thế nào?', `Hàng cồng kềnh được giao bằng xe tải nhỏ (phụ phí ${fp(S.heavyShipFee)}). Bạn có thể chọn dịch vụ lắp đặt & cân chỉnh tại nhà (${fp(S.installFee)}/sản phẩm) trong giỏ hàng.`],
          ['Tôi có được kiểm tra hàng trước khi nhận không?', 'Có, với đơn COD bạn được mở hộp kiểm tra trước khi thanh toán.']]],
        ['Bảo hành & dịch vụ', [
          ['Thời gian bảo hành bao lâu?', 'Đồng hồ đeo tay và đồng hồ cây bảo hành 5 năm, treo tường 2 năm, thông minh và để bàn 1 năm, phụ kiện 6 tháng.'],
          ['Khắc tên lên đồng hồ như thế nào?', `Chọn "Khắc tên" và nhập nội dung (tối đa 20 ký tự) cho từng sản phẩm đeo tay/bỏ túi trong giỏ hàng. Phí ${fp(S.engraveFee)}/sản phẩm, miễn phí khi có chương trình khuyến mãi. Sản phẩm đã khắc không áp dụng đổi trả (trừ lỗi nhà sản xuất).`],
          ['Đồng hồ cơ chạy nhanh/chậm có phải lỗi không?', 'Đồng hồ cơ có sai số tự nhiên khoảng ±10–30 giây/ngày tùy bộ máy. Nếu sai số lớn hơn, hãy mang đến showroom để kiểm tra miễn phí.']]],
        ['Tài khoản & đánh giá', [
          ['Khi nào đánh giá của tôi được hiển thị?', 'Đánh giá được kiểm duyệt trước khi hiển thị, thường trong vòng 24 giờ. Bạn có thể sửa đánh giá trong 30 ngày.'],
          ['Huy hiệu "Đã mua hàng" là gì?', 'Huy hiệu xuất hiện khi bạn đã có đơn hàng hoàn thành chứa sản phẩm đó, giúp người mua khác tin tưởng hơn.'],
          ['Tôi quên mật khẩu thì làm sao?', 'Tại trang Đăng nhập, bấm "Quên mật khẩu?" và nhập email đã đăng ký để nhận liên kết đặt lại.']]]
      ];
      function render(q = '') {
        const nq = Utils.normalize(q);
        let n = 0;
        $('#faqRoot').innerHTML = groups.map(([g, items], gi) => {
          const list = items.filter(([qs, a]) => !nq || Utils.normalize(qs + ' ' + a).includes(nq));
          if (!list.length) return '';
          return `<h2 class="h5 fw-bold mt-4 mb-3">${g}</h2><div class="accordion faq-acc" id="faq-${gi}">${list.map(([qs, a], i) => {
            const id = `faq-${gi}-${i}`; const open = nq && n++ < 3;
            return `<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button${open ? '' : ' collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${id}">${Utils.escape(qs)}</button></h3>
              <div id="${id}" class="accordion-collapse collapse${open ? ' show' : ''}" data-bs-parent="#faq-${gi}"><div class="accordion-body">${Utils.escape(a)}</div></div></div>`;
          }).join('')}</div>`;
        }).join('') || '<div class="empty-state"><i class="bi bi-question-circle"></i>Không tìm thấy câu hỏi phù hợp.</div>';
      }
      $('#faqSearch').addEventListener('input', Utils.debounce(e => render(e.target.value.trim()), 200));
      render();
    }
  };

  pages[page] && pages[page]();
})();
