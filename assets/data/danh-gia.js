// Đánh giá & hỏi đáp mẫu
(function () {
  const ago = d => new Date(Date.now() - d * 86400000).toISOString();
  const NAMES = {
    'u-c1': 'Trần Văn An', 'u-c2': 'Phạm Thị Bình', 'u-c3': 'Hoàng Gia Cường',
    'u-x1': 'Nguyễn Hải Nam', 'u-x2': 'Vũ Thị Hoa', 'u-x3': 'Bùi Quốc Khánh', 'u-x4': 'Lý Thanh Tâm',
    'u-x5': 'Đặng Minh Quân', 'u-x6': 'Trịnh Ngọc Ánh'
  };
  const STAFF_REPLY = (content, d) => ({ by: 'u-staff1', byName: 'TIMEHOUSE', content, at: ago(d) });

  // [productId, userId, sao, tiêu đề, nội dung, tags, đã mua, số ngày trước, trạng thái, phản hồi, lượt hữu ích]
  const rows = [
    ['p001', 'u-c1', 5, 'Đẹp, lịch lãm', 'Đồng hồ đeo lên tay rất sang, dây da mềm, mặt kính trong. Giao hàng nhanh trong 1 ngày.', ['Đúng mô tả', 'Giao nhanh'], true, 40, 'approved', STAFF_REPLY('Cảm ơn anh An đã tin tưởng TIMEHOUSE ạ!', 39), 12],
    ['p001', 'u-x1', 4, 'Ổn trong tầm giá', 'Máy chạy chuẩn, chỉ có dây da hơi cứng mấy ngày đầu.', ['Chạy chuẩn giờ'], true, 25, 'approved', null, 5],
    ['p001', 'u-x2', 5, 'Mua tặng chồng', 'Chồng mình rất thích, có khắc tên miễn phí nữa.', ['Đóng gói đẹp'], true, 10, 'approved', null, 3],
    ['p003', 'u-x3', 5, 'G-Shock quốc dân', 'Mỏng nhẹ, đeo cả ngày không mỏi, chống nước tốt đi bơi thoải mái.', ['Đúng mô tả', 'Chạy chuẩn giờ'], true, 60, 'approved', null, 20],
    ['p003', 'u-c3', 4, 'Hàng chuẩn', 'Check mã trên web Casio đúng hàng chính hãng. Trừ 1 sao vì hộp hơi móp.', ['Chính hãng'], true, 18, 'approved', STAFF_REPLY('Shop xin lỗi anh về hộp sản phẩm, lần sau shop sẽ đóng gói kỹ hơn ạ.', 17), 4],
    ['p005', 'u-x4', 5, 'Automatic đáng tiền', 'Kim trôi mượt, lộ đáy xem máy rất thích. Sai số khoảng +8s/ngày.', ['Chạy chuẩn giờ'], true, 33, 'approved', null, 9],
    ['p005', 'u-x5', 4, 'Đẹp nhưng hơi nặng', 'Dây thép khá nặng với tay nhỏ, còn lại rất ưng.', [], false, 12, 'approved', null, 1],
    ['p010', 'u-c2', 5, 'Bambino quá đẹp', 'Mặt kính cong cổ điển, đeo đi làm hay đi tiệc đều hợp.', ['Đúng mô tả', 'Đóng gói đẹp'], true, 50, 'approved', null, 15],
    ['p010', 'u-x6', 5, 'Ưng ý', 'Nhân viên tư vấn nhiệt tình, cắt dây vừa tay luôn.', ['Giao nhanh'], true, 7, 'approved', null, 2],
    ['p012', 'u-x1', 5, 'PRX đẹp xuất sắc', 'Dây liền vỏ ôm tay, mặt xanh lấp lánh dưới nắng.', ['Đúng mô tả'], true, 20, 'approved', null, 8],
    ['p012', 'u-x3', 3, 'Giao hơi chậm', 'Sản phẩm tốt nhưng giao mất 4 ngày.', [], true, 15, 'approved', STAFF_REPLY('Shop xin lỗi vì đơn bị chậm do hãng vận chuyển quá tải dịp lễ ạ.', 14), 0],
    ['p020', 'u-x2', 5, 'Không cần thay pin', 'Eco-Drive tiện thật, mặt số nhỏ xinh hợp tay nữ.', ['Chạy chuẩn giờ'], true, 28, 'approved', null, 6],
    ['p023', 'u-c2', 5, 'Sang chảnh', 'Mặt vuông nhỏ rất nữ tính, mình đeo đi làm hằng ngày.', ['Đúng mô tả', 'Đóng gói đẹp'], true, 35, 'approved', null, 7],
    ['p026', 'u-x6', 4, 'Xinh', 'Dây lưới dễ chỉnh, màu vàng hồng hơi nhạt hơn ảnh một chút.', [], true, 22, 'approved', null, 3],
    ['p026', 'u-x4', 5, 'Quà sinh nhật', 'Gói quà đẹp, có thiệp viết tay. Bạn gái rất thích.', ['Đóng gói đẹp'], true, 9, 'approved', null, 1],
    ['p037', 'u-x5', 5, 'Apple Watch chính hãng VN/A', 'Kích hoạt bảo hành điện tử ngay, pin dùng hơn 1 ngày.', ['Chính hãng', 'Giao nhanh'], true, 14, 'approved', null, 4],
    ['p040', 'u-c3', 4, 'Đáng tiền khi giảm giá', 'Màn hình đẹp, đo giấc ngủ khá chính xác. Pin khoảng 1.5 ngày.', [], true, 30, 'approved', null, 2],
    ['p043', 'u-x1', 5, 'Rẻ mà nhiều tính năng', 'Pin 2 tuần, đo nhịp tim ổn. Mua flash sale giá quá hời.', ['Giao nhanh'], true, 5, 'approved', null, 10],
    ['p043', 'u-x2', 4, 'Tốt', 'Dây hơi bám bụi, còn lại ok.', [], false, 3, 'approved', null, 0],
    ['p048', 'u-c1', 5, 'Đẹp như tranh', 'Treo phòng khách ai đến cũng khen, kim trôi không có tiếng.', ['Đúng mô tả'], true, 45, 'approved', null, 6],
    ['p050', 'u-x6', 5, 'Tối giản, im lặng', 'Treo phòng ngủ không nghe tiếng tích tắc, giá rẻ.', ['Giao nhanh'], true, 16, 'approved', null, 5],
    ['p050', 'u-x3', 4, 'Ổn', 'Nhựa hơi mỏng nhưng giá này thì chấp nhận được.', [], true, 11, 'approved', null, 1],
    ['p052', 'u-x4', 5, 'Gỗ thơm, khắc đẹp', 'Đường khắc laser sắc nét, mùi gỗ dễ chịu.', ['Đúng mô tả'], true, 19, 'approved', null, 2],
    ['p057', 'u-c2', 5, 'Phòng khách sáng hẳn', 'Tranh 3 tấm khổ lớn, shop hỗ trợ lắp đặt tận nơi.', ['Đóng gói đẹp'], true, 26, 'approved', STAFF_REPLY('Cảm ơn chị Bình! Chúc gia đình mình luôn vui vẻ ạ.', 25), 3],
    ['p061', 'u-x5', 5, 'Chuông nhạc hay', 'Mỗi giờ phát nhạc rất êm, quả lắc chạy đều.', ['Đúng mô tả'], true, 38, 'approved', null, 4],
    ['p066', 'u-c3', 4, 'Báo thức to vừa', 'Đèn nền hơi yếu nhưng đủ dùng.', [], true, 8, 'approved', null, 0],
    ['p070', 'u-x1', 5, 'Tiện', 'Xem nhiệt độ độ ẩm trong phòng, pin dùng rất lâu.', ['Giao nhanh'], true, 12, 'approved', null, 2],
    ['p071', 'u-x2', 4, 'Đẹp', 'Đèn LED sáng, có cảm biến vỗ tay khá vui.', [], true, 6, 'approved', null, 1],
    ['p076', 'u-x4', 5, 'Kiệt tác', 'Tủ gỗ anh đào bóng đẹp, chuông Westminster vang trầm. Kỹ thuật viên lắp đặt rất chuyên nghiệp.', ['Đúng mô tả', 'Đóng gói đẹp'], true, 70, 'approved', STAFF_REPLY('Cảm ơn anh đã lựa chọn TIMEHOUSE cho món đồ đặc biệt này!', 69), 11],
    ['p079', 'u-x6', 5, 'Quà cho bố', 'Bố mình rất thích, lộ máy chạy rất vui mắt.', ['Đóng gói đẹp'], true, 21, 'approved', null, 2],
    ['p083', 'u-c1', 5, 'Dây da mềm', 'Thay cho đồng hồ cũ, may chỉ đẹp.', [], true, 17, 'approved', null, 1],
    ['p086', 'u-x3', 4, 'Hộp ổn', 'Đựng vừa 6 chiếc, lót nhung mềm.', [], true, 4, 'approved', null, 0],
    // Đánh giá chờ duyệt / bị ẩn để minh họa quy trình
    ['p012', 'u-c2', 5, 'Rất đẹp', 'Mình mới nhận hàng, đeo thử rất vừa tay.', [], false, 1, 'pending', null, 0],
    ['p003', 'u-x5', 1, 'Spam', 'Vào link xxx để mua rẻ hơn!!!', [], false, 2, 'hidden', null, 0]
  ];

  window.SEED_REVIEWS = rows.map((r, i) => ({
    id: 'rv' + (i + 1),
    productId: r[0], userId: r[1], userName: NAMES[r[1]],
    rating: r[2], title: r[3], content: r[4], tags: r[5], images: [],
    verified: r[6], createdAt: ago(r[7]), updatedAt: ago(r[7]),
    status: r[8], reply: r[9],
    helpful: Array.from({ length: r[10] }, (_, k) => 'seed-' + k),
    reports: i === rows.length - 1 ? ['u-x1', 'u-x2', 'u-x3'] : []
  }));

  window.SEED_QUESTIONS = [
    { id: 'q1', productId: 'p005', userId: 'u-x1', userName: NAMES['u-x1'], content: 'Đồng hồ này có lên cót tay được không shop?',
      createdAt: ago(20), answer: { byName: 'TIMEHOUSE', content: 'Dạ máy 4R36 hỗ trợ lên cót tay và dừng kim (hacking) ạ.', at: ago(20) } },
    { id: 'q2', productId: 'p012', userId: 'u-x2', userName: NAMES['u-x2'], content: 'Cổ tay 15cm đeo bản 40mm có to quá không ạ?',
      createdAt: ago(14), answer: { byName: 'TIMEHOUSE', content: 'Dạ PRX 40mm có vấu ngắn nên tay 15cm đeo vẫn gọn. Chị có thể cân nhắc bản 35mm nếu thích nhỏ hơn ạ.', at: ago(13) } },
    { id: 'q3', productId: 'p048', userId: 'u-c3', userName: NAMES['u-c3'], content: 'Đồng hồ dùng pin gì, bao lâu phải thay?',
      createdAt: ago(9), answer: { byName: 'TIMEHOUSE', content: 'Dạ dùng 1 pin AA, thời gian sử dụng khoảng 12–18 tháng ạ.', at: ago(9) } },
    { id: 'q4', productId: 'p076', userId: 'u-x4', userName: NAMES['u-x4'], content: 'Shop có lắp đặt tại Hải Phòng không?',
      createdAt: ago(30), answer: { byName: 'TIMEHOUSE', content: 'Dạ có, shop hỗ trợ lắp đặt toàn miền Bắc, phụ phí ngoại thành sẽ được báo khi xác nhận đơn ạ.', at: ago(29) } },
    { id: 'q5', productId: 'p037', userId: 'u-x5', userName: NAMES['u-x5'], content: 'Có dùng được với điện thoại Android không?',
      createdAt: ago(6), answer: { byName: 'TIMEHOUSE', content: 'Dạ Apple Watch chỉ kết nối với iPhone ạ. Nếu dùng Android anh tham khảo Samsung Galaxy Watch7 nhé.', at: ago(6) } },
    { id: 'q6', productId: 'p050', userId: 'u-c1', userName: NAMES['u-c1'], content: 'Có bản màu đen không shop?',
      createdAt: ago(2), answer: null }
  ];
})();
