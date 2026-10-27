// Tổng quan: việc cần xử lý (mọi nhân viên) + báo cáo doanh thu (chỉ admin).
(function () {
  if (!Admin.init('dashboard', 'Tổng quan')) return;
  const root = $('#adminContent');
  const fp = Utils.formatPrice;
  const orders = DB.all('orders');
  const products = Catalog.products(true);
  const u = Admin.user();
  const LOW = 5;

  const pending = orders.filter(o => o.status === 'pending');
  const processing = orders.filter(o => ['confirmed', 'shipping'].includes(o.status));
  const lowStock = products.filter(p => p.status === 'active' && p.stock <= LOW).sort((a, b) => a.stock - b.stock);
  const rvPending = DB.all('reviews').filter(r => r.status === 'pending').length;
  const qaPending = DB.all('questions').filter(q => !q.answer).length;
  const ctNew = DB.all('contacts').filter(c => c.status === 'new').length;
  const unpaidBank = orders.filter(o => o.paymentMethod === 'bank' && o.paymentStatus === 'unpaid' && o.status !== 'cancelled').length;

  const tile = (icon, value, label, href, tone = '') =>
    `<div class="col-6 col-xl-3"><a href="${href}" class="kpi ${tone}"><i class="bi ${icon}"></i><div><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></div></a></div>`;

  root.innerHTML = `
    <p class="text-muted mb-4">Xin chào <strong>${Utils.escape(u.name)}</strong>, hôm nay là ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}.</p>
    <h2 class="admin-h2">Việc cần xử lý</h2>
    <div class="row g-3 mb-4">
      ${tile('bi-hourglass-split', pending.length, 'Đơn chờ xác nhận', 'don-hang.html?status=pending', pending.length ? 'warn' : '')}
      ${tile('bi-truck', processing.length, 'Đơn đang xử lý / giao', 'don-hang.html?status=processing')}
      ${tile('bi-exclamation-triangle', lowStock.length, `Sản phẩm sắp hết (≤ ${LOW})`, 'san-pham.html?stock=low&status=active', lowStock.length ? 'danger' : '')}
      ${tile('bi-qr-code', unpaidBank, 'Đơn chuyển khoản chưa thanh toán', 'don-hang.html?pay=bank-unpaid')}
      ${tile('bi-star-half', rvPending, 'Đánh giá chờ duyệt', 'danh-gia.html', rvPending ? 'warn' : '')}
      ${tile('bi-question-circle', qaPending, 'Câu hỏi chờ trả lời', 'danh-gia.html#qa', qaPending ? 'warn' : '')}
      ${tile('bi-envelope', ctNew, 'Liên hệ mới', 'lien-he.html', ctNew ? 'warn' : '')}
      ${tile('bi-box-seam', products.filter(p => p.status === 'active').length, 'Sản phẩm đang bán', 'san-pham.html')}
    </div>
    <div id="reportArea"></div>
    <div class="row g-4">
      <div class="col-xl-7"><div class="panel">
        <div class="panel-head"><h2 class="admin-h2 mb-0">Đơn hàng mới nhất</h2><a href="don-hang.html" class="small">Xem tất cả</a></div>
        <div class="table-responsive"><table class="table admin-table align-middle mb-0">
          <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng</th><th>Trạng thái</th></tr></thead>
          <tbody>${orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(o => `
            <tr><td><a href="don-hang.html?id=${o.id}" class="fw-semibold">${o.id}</a><div class="small text-muted">${Utils.timeAgo(o.createdAt)}</div></td>
            <td>${Utils.escape(o.shipping.name)}</td><td>${fp(o.total)}</td><td>${Orders.badge(o.status)}</td></tr>`).join('')}</tbody>
        </table></div></div></div>
      <div class="col-xl-5"><div class="panel">
        <div class="panel-head"><h2 class="admin-h2 mb-0">Sắp hết hàng</h2><a href="san-pham.html?stock=low&status=active" class="small">Quản lý kho</a></div>
        ${lowStock.length ? `<ul class="list-unstyled mb-0">${lowStock.slice(0, 7).map(p => `
          <li class="d-flex align-items-center gap-3 py-2 border-bottom"><img src="${Img.product(p)}" alt="" width="40" height="40" class="rounded-2">
            <div class="flex-grow-1 min-w-0"><div class="small fw-medium text-truncate">${Utils.escape(p.name)}</div><div class="small text-muted">${p.sku}</div></div>
            <span class="badge ${p.stock === 0 ? 'text-bg-danger' : 'text-bg-warning'}">${p.stock === 0 ? 'Hết hàng' : 'Còn ' + p.stock}</span></li>`).join('')}</ul>`
          : '<div class="text-muted small">Tồn kho ổn định.</div>'}
      </div></div>
    </div>`;

  if (!Admin.can('report.view')) return;

  /* ================= Báo cáo doanh thu (admin) ================= */
  const done = orders.filter(o => o.status === 'completed');
  const now = new Date();
  const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const thisM = monthKey(now);
  const lastM = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const sumIn = (list, key) => list.filter(o => monthKey(new Date(o.createdAt)) === key).reduce((s, o) => s + o.total, 0);
  const revThis = sumIn(done, thisM), revLast = sumIn(done, lastM);
  const change = revLast ? Math.round((revThis - revLast) / revLast * 100) : 0;
  const totalRev = done.reduce((s, o) => s + o.total, 0);
  const aov = done.length ? totalRev / done.length : 0;
  const cancelRate = orders.length ? Math.round(orders.filter(o => o.status === 'cancelled').length / orders.length * 100) : 0;

  $('#reportArea').innerHTML = `
    <h2 class="admin-h2">Báo cáo kinh doanh <span class="badge text-bg-dark align-middle ms-1">Admin</span></h2>
    <div class="row g-3 mb-4">
      <div class="col-6 col-xl-3"><div class="kpi static"><i class="bi bi-cash-stack"></i><div><div class="kpi-value">${fp(revThis)}</div>
        <div class="kpi-label">Doanh thu tháng này ${revLast ? `<span class="${change >= 0 ? 'text-success' : 'text-danger'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}%</span>` : ''}</div></div></div></div>
      <div class="col-6 col-xl-3"><div class="kpi static"><i class="bi bi-graph-up"></i><div><div class="kpi-value">${fp(totalRev)}</div><div class="kpi-label">Tổng doanh thu (đơn hoàn thành)</div></div></div></div>
      <div class="col-6 col-xl-3"><div class="kpi static"><i class="bi bi-basket"></i><div><div class="kpi-value">${fp(aov)}</div><div class="kpi-label">Giá trị đơn trung bình</div></div></div></div>
      <div class="col-6 col-xl-3"><div class="kpi static"><i class="bi bi-x-octagon"></i><div><div class="kpi-value">${cancelRate}%</div><div class="kpi-label">Tỷ lệ hủy đơn</div></div></div></div>
    </div>
    <div class="row g-4 mb-4">
      <div class="col-xl-8"><div class="panel">
        <div class="panel-head"><h3 class="admin-h3 mb-0">Doanh thu</h3>
          <div class="btn-group btn-group-sm" role="group" aria-label="Khoảng thời gian">
            <button class="btn btn-outline-dark active" data-range="30">30 ngày</button><button class="btn btn-outline-dark" data-range="6m">6 tháng</button></div></div>
        <div class="chart-box"><canvas id="revChart" aria-label="Biểu đồ doanh thu" role="img"></canvas></div></div></div>
      <div class="col-xl-4"><div class="panel">
        <div class="panel-head"><h3 class="admin-h3 mb-0">Doanh thu theo nhóm</h3></div>
        <div class="chart-box sm"><canvas id="catChart" aria-label="Doanh thu theo nhóm sản phẩm" role="img"></canvas></div></div></div>
    </div>
    <div class="row g-4 mb-4">
      <div class="col-xl-7"><div class="panel">
        <div class="panel-head"><h3 class="admin-h3 mb-0">Top sản phẩm bán chạy</h3><button class="btn btn-sm btn-outline-dark" id="exportTop"><i class="bi bi-download me-1"></i>CSV</button></div>
        <div class="table-responsive"><table class="table admin-table align-middle mb-0"><thead><tr><th>#</th><th>Sản phẩm</th><th class="text-end">SL bán</th><th class="text-end">Doanh thu</th></tr></thead><tbody id="topBody"></tbody></table></div></div></div>
      <div class="col-xl-5"><div class="panel">
        <div class="panel-head"><h3 class="admin-h3 mb-0">Trạng thái đơn hàng</h3></div>
        <div class="chart-box sm"><canvas id="statusChart" aria-label="Tỷ lệ trạng thái đơn" role="img"></canvas></div></div></div>
    </div>`;

  if (!window.Chart) { $('#reportArea').insertAdjacentHTML('beforeend', '<div class="alert alert-warning">Không tải được thư viện biểu đồ.</div>'); return; }
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = '#707070';
  const money = v => v >= 1e6 ? (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr' : v.toLocaleString('vi-VN');

  // Doanh thu theo ngày / tháng
  function series(range) {
    const labels = [], data = [], counts = [];
    if (range === '30') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        const key = d.toDateString();
        const list = done.filter(o => new Date(o.createdAt).toDateString() === key);
        labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
        data.push(list.reduce((s, o) => s + o.total, 0)); counts.push(list.length);
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = monthKey(d);
        const list = done.filter(o => monthKey(new Date(o.createdAt)) === key);
        labels.push(`T${d.getMonth() + 1}/${d.getFullYear()}`);
        data.push(list.reduce((s, o) => s + o.total, 0)); counts.push(list.length);
      }
    }
    return { labels, data, counts };
  }
  let s = series('30');
  const revChart = new Chart($('#revChart'), {
    data: {
      labels: s.labels,
      datasets: [
        { type: 'bar', label: 'Doanh thu', data: s.data, backgroundColor: '#111', borderRadius: 6, yAxisID: 'y' },
        { type: 'line', label: 'Số đơn', data: s.counts, borderColor: '#e65100', backgroundColor: '#e65100', tension: .3, yAxisID: 'y1', pointRadius: 2 }
      ]
    },
    options: {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y' ? ` Doanh thu: ${fp(c.raw)}` : ` Số đơn: ${c.raw}` } } },
      scales: { y: { ticks: { callback: money }, grid: { color: '#eee' } }, y1: { position: 'right', grid: { display: false }, ticks: { precision: 0 } }, x: { grid: { display: false } } }
    }
  });
  $$('[data-range]').forEach(b => b.addEventListener('click', () => {
    $$('[data-range]').forEach(x => x.classList.toggle('active', x === b));
    s = series(b.dataset.range);
    revChart.data.labels = s.labels;
    revChart.data.datasets[0].data = s.data;
    revChart.data.datasets[1].data = s.counts;
    revChart.update();
  }));

  // Theo nhóm sản phẩm & top sản phẩm (tính theo dòng hàng của đơn hoàn thành)
  const byCat = {}, byProduct = {};
  done.forEach(o => o.items.forEach(it => {
    const p = Catalog.product(it.productId);
    const parent = p ? Catalog.parentOf(p.categoryId).short || Catalog.parentOf(p.categoryId).name : 'Khác';
    byCat[parent] = (byCat[parent] || 0) + it.price * it.qty;
    const bp = byProduct[it.productId] || (byProduct[it.productId] = { name: it.name, qty: 0, revenue: 0 });
    bp.qty += it.qty; bp.revenue += it.price * it.qty;
  }));
  const palette = ['#111111', '#4b4b4b', '#8a8a8a', '#c9a46a', '#e65100', '#2f5d9e', '#c9ccd1'];
  new Chart($('#catChart'), {
    type: 'doughnut',
    data: { labels: Object.keys(byCat), datasets: [{ data: Object.values(byCat), backgroundColor: palette, borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: c => ` ${c.label}: ${fp(c.raw)}` } } } }
  });
  const top = Object.entries(byProduct).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8);
  $('#topBody').innerHTML = top.map(([id, x], i) => `<tr><td>${i + 1}</td><td><a href="../chi-tiet-san-pham.html?id=${id}" target="_blank" rel="noopener">${Utils.escape(x.name)}</a></td>
    <td class="text-end">${x.qty}</td><td class="text-end fw-semibold">${fp(x.revenue)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-muted">Chưa có dữ liệu.</td></tr>';
  $('#exportTop').addEventListener('click', () => Admin.exportCsv('top-san-pham.csv', ['Mã SP', 'Tên', 'Số lượng', 'Doanh thu'], top.map(([id, x]) => [id, x.name, x.qty, x.revenue])));

  const stCount = Object.keys(Orders.STATUS).map(k => orders.filter(o => o.status === k).length);
  new Chart($('#statusChart'), {
    type: 'pie',
    data: { labels: Object.values(Orders.STATUS).map(s => s.label), datasets: [{ data: stCount, backgroundColor: ['#f5a623', '#2f5d9e', '#7b4dff', '#2e7d32', '#bdbdbd'], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }
  });
})();
