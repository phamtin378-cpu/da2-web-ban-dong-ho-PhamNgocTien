// Nghiệp vụ đánh giá & hỏi đáp (dùng ở trang chi tiết, tài khoản và trang quản trị)
Object.assign(Reviews, {
  TAGS: ['Đúng mô tả', 'Chính hãng', 'Đóng gói đẹp', 'Giao nhanh', 'Chạy chuẩn giờ', 'Đáng tiền'],
  STATUS_LABEL: { pending: 'Chờ duyệt', approved: 'Hiển thị', hidden: 'Đã ẩn' },

  // Khách đã có đơn Hoàn thành chứa sản phẩm?
  hasPurchased(userId, productId) {
    return DB.all('orders').some(o => o.userId === userId && o.status === 'completed' && o.items.some(i => i.productId === productId));
  },

  mine(userId, productId) {
    return DB.all('reviews').find(r => r.userId === userId && r.productId === productId) || null;
  },

  // Còn được sửa không (trong N ngày kể từ lúc tạo)
  editable(review) {
    const days = DB.settings().reviewEditDays || 30;
    return (Date.now() - new Date(review.createdAt)) / 86400000 <= days;
  },

  // Danh sách hiển thị cho người xem: đã duyệt + đánh giá của chính họ (kể cả đang chờ duyệt)
  forViewer(productId, userId) {
    return DB.all('reviews').filter(r => r.productId === productId && (r.status === 'approved' || (userId && r.userId === userId && r.status === 'pending')));
  },

  submit(productId, { rating, title, content, tags, images }) {
    const u = Auth.user();
    const existing = Reviews.mine(u.id, productId);
    const now = new Date().toISOString();
    const data = { rating, title: title.trim(), content: content.trim(), tags, images, status: 'pending', updatedAt: now };
    let r;
    if (existing) {
      if (!Reviews.editable(existing)) return { ok: false, error: 'Đã quá thời hạn sửa đánh giá.' };
      r = DB.update('reviews', existing.id, data);
    } else {
      r = DB.insert('reviews', Object.assign({
        id: Utils.uid('rv'), productId, userId: u.id, userName: u.name,
        verified: Reviews.hasPurchased(u.id, productId), createdAt: now, reply: null, helpful: [], reports: []
      }, data));
    }
    Reviews.invalidate();
    return { ok: true, review: r, edited: !!existing };
  },

  remove(id) {
    DB.delete('reviews', id);
    Reviews.invalidate();
  },

  toggleHelpful(id) {
    const u = Auth.user();
    let on;
    const r = DB.update('reviews', id, rv => {
      const set = new Set(rv.helpful);
      on = !set.has(u.id);
      on ? set.add(u.id) : set.delete(u.id);
      return Object.assign({}, rv, { helpful: [...set] });
    });
    return { on, count: r.helpful.length };
  },

  // Báo cáo vi phạm: đủ ngưỡng → tự chuyển về Chờ duyệt
  report(id) {
    const u = Auth.user();
    const limit = DB.settings().reportThreshold || 3;
    let already = false;
    const r = DB.update('reviews', id, rv => {
      if (rv.reports.includes(u.id)) { already = true; return rv; }
      const reports = rv.reports.concat(u.id);
      return Object.assign({}, rv, { reports, status: reports.length >= limit && rv.status === 'approved' ? 'pending' : rv.status });
    });
    Reviews.invalidate();
    return { already, hidden: r.status !== 'approved' };
  },

  reply(id, content) {
    const u = Auth.user();
    DB.update('reviews', id, { reply: content ? { by: u.id, byName: 'TIMEHOUSE', content, at: new Date().toISOString() } : null });
  },

  setStatus(id, status) {
    DB.update('reviews', id, { status });
    Reviews.invalidate();
  }
});

const Questions = {
  // Câu hỏi đã được trả lời + câu hỏi của chính người xem
  forViewer(productId, userId) {
    return DB.all('questions').filter(q => q.productId === productId && (q.answer || (userId && q.userId === userId)));
  },
  ask(productId, content) {
    const u = Auth.user();
    return DB.insert('questions', {
      id: Utils.uid('q'), productId, userId: u.id, userName: u.name, content: content.trim(),
      createdAt: new Date().toISOString(), answer: null
    });
  },
  answer(id, content) {
    const u = Auth.user();
    DB.update('questions', id, { answer: content ? { by: u.id, byName: 'TIMEHOUSE', content, at: new Date().toISOString() } : null });
  }
};
