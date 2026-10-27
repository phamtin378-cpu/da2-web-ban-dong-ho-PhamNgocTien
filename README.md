# TIMEHOUSE – Website bán đồng hồ (Frontend)

Đồ án 2: website thương mại điện tử bán **mọi loại đồng hồ** (đeo tay, thông minh, treo tường, để bàn/trang trí, đồng hồ cây, bỏ túi, phụ kiện), chỉ gồm phần frontend. Toàn bộ dữ liệu được mô phỏng bằng `localStorage` của trình duyệt.

## Công nghệ

- HTML5, CSS3, JavaScript ES6 (thuần, không cần build)
- Bootstrap 5.3, Bootstrap Icons
- Swiper (slider), Chart.js (biểu đồ), SweetAlert2 (hộp thoại), qrcodejs (mã QR chuyển khoản)
- Thư viện tải qua CDN – cần kết nối Internet khi chạy

## Cách chạy

1. Mở thư mục dự án bằng **VS Code**, cài extension **Live Server**.
2. Chuột phải `index.html` → **Open with Live Server**.
3. Lần đầu mở, dữ liệu mẫu trong `assets/data/*.js` được nạp vào `localStorage`.

> Có thể mở trực tiếp file `index.html`, nhưng nên dùng Live Server để mọi tính năng (clipboard…) hoạt động ổn định.

**Khôi phục dữ liệu mẫu:** đăng nhập Admin → *Hồ sơ cá nhân* → *Khôi phục dữ liệu mẫu*, hoặc gõ `DB.reset()` trong Console.

## Tài khoản dùng thử (mật khẩu `123456`)

| Vai trò | Email | Ghi chú |
|---|---|---|
| Quản trị viên | admin@timehouse.vn | Toàn quyền |
| Nhân viên | trang.staff@timehouse.vn, duc.staff@timehouse.vn | Xử lý đơn, sản phẩm, đánh giá… |
| Khách hàng | an@gmail.com, binh@gmail.com, cuong@gmail.com | Có sẵn đơn hàng, địa chỉ, mã giảm giá |
| Khách bị khóa | linh@gmail.com | Dùng để thử chức năng khóa tài khoản |

- Mã giảm giá: `WELCOME50`, `DONGHO10`, `VIP500` (đang chạy), `TET2027` (sắp diễn ra), `SUMMER20` (hết hạn)
- Thẻ thanh toán thử: `4111 1111 1111 1111`, hạn bất kỳ trong tương lai, CVV 3 số

## Chức năng chính

### Khách hàng
- Trang chủ: banner khuyến mãi, danh mục, flash sale đếm ngược, hàng mới, bán chạy, thương hiệu, tin tức
- Danh sách sản phẩm: bộ lọc **thay đổi theo loại đồng hồ** (đeo tay: loại máy, mặt kính, chống nước…; treo tường: khung, phong cách, phòng…), lọc giá/thương hiệu/đánh giá, sắp xếp, phân trang, lọc lưu trên URL
- Chi tiết sản phẩm: ảnh phóng to, giá khuyến mãi tốt nhất, quà tặng, dịch vụ kèm theo, thông số, bảo hành
- **Đánh giá & nhận xét**: sao, ảnh thực tế, thẻ nhanh, "Đã mua hàng", hữu ích, báo cáo vi phạm, phản hồi của cửa hàng, hỏi đáp
- Giỏ hàng: khắc tên, gói quà, lắp đặt tại nhà; mã giảm giá; quà tặng tự áp dụng
- Thanh toán: sổ địa chỉ (34 tỉnh/thành, 2 cấp), giao tiêu chuẩn/hỏa tốc, COD / chuyển khoản QR / thẻ
- Tài khoản: hồ sơ, đơn hàng (dòng thời gian, hủy đơn, mua lại), đánh giá của tôi, ví mã giảm giá, sổ địa chỉ, đổi mật khẩu
- Danh sách yêu thích
- Trang nội dung: khuyến mãi, tin tức, giới thiệu, liên hệ (kèm danh sách showroom), chính sách, FAQ

### Nhân viên & Admin (`/admin`)
| Chức năng | Nhân viên | Admin |
|---|:-:|:-:|
| Tổng quan – việc cần xử lý | ✔ | ✔ |
| Báo cáo doanh thu, biểu đồ | – | ✔ |
| Đơn hàng (xử lý trạng thái, in hóa đơn, xuất CSV) | ✔ | ✔ |
| Sản phẩm (thêm/sửa, tồn kho) / xóa | ✔ / – | ✔ |
| Danh mục & thương hiệu | – | ✔ |
| Khuyến mãi (4 loại chương trình) | xem | ✔ |
| Đánh giá & hỏi đáp, liên hệ, bài viết | ✔ | ✔ |
| Khách hàng / khóa tài khoản | xem | ✔ |
| Nhân viên | – | ✔ |

## Quy tắc nghiệp vụ nổi bật

- Chỉ 3 tác nhân: khách hàng, nhân viên, admin. Chưa đăng nhập chỉ được xem; thêm giỏ/mua/yêu thích/đánh giá phải đăng nhập.
- Giá bán = mức thấp nhất giữa giá thường, chương trình giảm giá và flash sale; mã giảm giá trừ thêm trên tổng đơn, mỗi đơn 1 mã.
- Flash sale giới hạn số suất; mua vượt số suất còn lại thì tính giá thường.
- Phí ship: miễn phí từ 500.000₫; hàng cồng kềnh +150.000₫; hỏa tốc +40.000₫.
- Trạng thái đơn: Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn thành / Đã hủy. Khách chỉ hủy khi "Chờ xác nhận"; hủy đơn hoàn kho và lượt dùng mã.
- Đánh giá mới chờ duyệt; bị báo cáo ≥ 3 lần tự ẩn chờ duyệt lại; sửa trong 30 ngày.

## Cấu trúc thư mục

```
├── index.html, san-pham.html, chi-tiet-san-pham.html, gio-hang.html, thanh-toan.html, dat-hang-thanh-cong.html
├── tai-khoan.html, yeu-thich.html, dang-nhap.html, dang-ky.html
├── khuyen-mai.html, tin-tuc.html, chi-tiet-tin-tuc.html, gioi-thieu.html, lien-he.html, chinh-sach.html, cau-hoi-thuong-gap.html
├── 403.html, 404.html
├── admin/                    # 11 trang quản trị
└── assets/
    ├── css/style.css, admin.css
    ├── data/                 # dữ liệu mẫu (sản phẩm, danh mục, khuyến mãi, đơn hàng, đánh giá…)
    ├── img/favicon.svg
    └── js/
        ├── tien-ich.js, luu-tru.js, xac-thuc.js        # tiện ích, "database" localStorage, đăng nhập/phân quyền
        ├── danh-muc-san-pham.js, danh-gia.js, gio-hang.js, dat-hang.js   # nghiệp vụ dùng chung
        ├── thanh-phan.js                        # header, footer, menu
        ├── pages/                               # script từng trang khách hàng
        └── admin/                               # script trang quản trị
```

## Ghi chú

- Ảnh sản phẩm, danh mục, bài viết mặc định là **ảnh minh họa SVG tự sinh**. Thêm ảnh thật trong trang quản trị: *Sản phẩm → Sửa → Tải ảnh*, *Danh mục & thương hiệu → Danh mục → Sửa → Ảnh đại diện*, *Bài viết → Sửa → Ảnh bìa*. Ảnh được lưu trong trình duyệt (localStorage) nên chỉ hiện trên máy đã tải lên.
- Banner trang chủ: sửa danh sách `HOME_BANNERS` ở đầu `assets/js/pages/trang-chu.js`.
- Đây là dự án mô phỏng: mật khẩu lưu dạng thô, thanh toán thẻ/QR không thực hiện giao dịch thật.
