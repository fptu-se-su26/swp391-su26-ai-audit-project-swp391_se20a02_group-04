# Tài Liệu Yêu Cầu

## Giới Thiệu

Tính năng **Admin Appointment Actions** bổ sung 5 API endpoint mới vào hệ thống quản lý lịch hẹn sửa xe máy, cho phép admin/quản lý thực hiện các thao tác nâng cao: gửi SMS thông báo, gửi Email thông báo, xuất phiếu dịch vụ, xem lịch sử hoạt động thực từ database, và ghi chú garage riêng biệt (tách khỏi `staff_notes`).

Hệ thống backend sử dụng Node.js/Express với MongoDB (Mongoose). Xác thực qua JWT middleware hiện có. Gửi email qua Nodemailer (SMTP). SMS được tích hợp qua SMS Gateway bên thứ ba.

## Bảng Thuật Ngữ

- **Admin_API**: Tập hợp các endpoint REST dưới prefix `/api/admin/`, yêu cầu xác thực JWT và role `ADMIN` hoặc `MANAGER`
- **Appointment**: Tài liệu MongoDB đại diện cho một lịch hẹn sửa xe, lưu trong collection `appointments`
- **Activity_Log**: Danh sách các bản ghi `UserAudit` liên quan đến một lịch hẹn cụ thể, lấy từ collection `user_audits`
- **Service_Ticket**: Phiếu dịch vụ tổng hợp thông tin lịch hẹn, khách hàng, xe, dịch vụ và chi phí — dùng để in hoặc xuất PDF
- **Garage_Note**: Trường ghi chú nội bộ của garage (`garage_note`) trên document `Appointment`, tách biệt với `staff_notes` của kỹ thuật viên
- **SMS_Gateway**: Dịch vụ bên thứ ba gửi SMS qua HTTP API (cấu hình qua biến môi trường)
- **Email_Service**: Module `email.util.js` dùng Nodemailer/SMTP để gửi email thông báo
- **Notification**: Tin nhắn SMS hoặc email được gửi đến khách hàng để thông báo về trạng thái lịch hẹn
- **UserAudit**: Model MongoDB ghi lại lịch sử các hành động quan trọng trong hệ thống

---

## Yêu Cầu

### Yêu Cầu 1: Gửi SMS Thông Báo Cho Khách Hàng

**User Story:** Với tư cách admin, tôi muốn gửi SMS thông báo đến số điện thoại của khách hàng về lịch hẹn, để khách hàng được cập nhật kịp thời mà không cần mở email.

#### Tiêu Chí Chấp Nhận

1. WHEN admin gọi `POST /api/admin/appointments/:id/send-sms`, THE Admin_API SHALL xác thực JWT token và kiểm tra role `ADMIN` hoặc `MANAGER` trước khi xử lý yêu cầu
2. WHEN `:id` không phải MongoDB ObjectId hợp lệ, THE Admin_API SHALL trả về HTTP 400 với thông báo lỗi rõ ràng
3. WHEN `:id` là ObjectId hợp lệ nhưng không tồn tại trong database, THE Admin_API SHALL trả về HTTP 404
4. WHEN lịch hẹn tồn tại và khách hàng có số điện thoại, THE Admin_API SHALL gửi SMS qua SMS_Gateway với nội dung bao gồm mã lịch hẹn (`appointment_code`), ngày giờ hẹn và trạng thái hiện tại
5. WHERE `message` được cung cấp trong request body, THE Admin_API SHALL sử dụng nội dung `message` đó thay vì nội dung mặc định
6. WHEN SMS được gửi thành công, THE Admin_API SHALL tạo một bản ghi `UserAudit` với action `SMS_SENT` và trả về HTTP 200
7. IF khách hàng không có số điện thoại trong hồ sơ, THEN THE Admin_API SHALL trả về HTTP 422 với thông báo "Khách hàng chưa có số điện thoại"
8. IF SMS_Gateway trả về lỗi, THEN THE Admin_API SHALL ghi log lỗi và trả về HTTP 502 với thông báo lỗi phù hợp

---

### Yêu Cầu 2: Gửi Email Thông Báo Cho Khách Hàng

**User Story:** Với tư cách admin, tôi muốn gửi email thông báo đến địa chỉ email của khách hàng về lịch hẹn, để khách hàng có đầy đủ thông tin chi tiết bằng văn bản.

#### Tiêu Chí Chấp Nhận

1. WHEN admin gọi `POST /api/admin/appointments/:id/send-email`, THE Admin_API SHALL xác thực JWT token và kiểm tra role `ADMIN` hoặc `MANAGER` trước khi xử lý yêu cầu
2. WHEN `:id` không phải MongoDB ObjectId hợp lệ, THE Admin_API SHALL trả về HTTP 400 với thông báo lỗi rõ ràng
3. WHEN `:id` là ObjectId hợp lệ nhưng không tồn tại trong database, THE Admin_API SHALL trả về HTTP 404
4. WHEN lịch hẹn tồn tại và khách hàng có địa chỉ email, THE Admin_API SHALL gửi email qua Email_Service với nội dung HTML bao gồm mã lịch hẹn, tên khách hàng, thông tin xe, dịch vụ, ngày giờ hẹn và trạng thái
5. WHERE `subject` và `message` được cung cấp trong request body, THE Admin_API SHALL sử dụng chúng để tùy chỉnh tiêu đề và nội dung email
6. WHEN email được gửi thành công, THE Admin_API SHALL tạo một bản ghi `UserAudit` với action `EMAIL_SENT` và trả về HTTP 200
7. IF khách hàng không có địa chỉ email trong hồ sơ, THEN THE Admin_API SHALL trả về HTTP 422 với thông báo "Khách hàng chưa có địa chỉ email"
8. IF Email_Service trả về lỗi (SMTP failure), THEN THE Admin_API SHALL ghi log lỗi và trả về HTTP 502 với thông báo lỗi phù hợp

---

### Yêu Cầu 3: Lấy và In Phiếu Dịch Vụ

**User Story:** Với tư cách admin, tôi muốn lấy dữ liệu phiếu dịch vụ của một lịch hẹn, để có thể in hoặc xuất cho khách hàng khi bàn giao xe.

#### Tiêu Chí Chấp Nhận

1. WHEN admin gọi `GET /api/admin/appointments/:id/service-ticket`, THE Admin_API SHALL xác thực JWT token và kiểm tra role `ADMIN` hoặc `MANAGER` trước khi xử lý yêu cầu
2. WHEN `:id` không phải MongoDB ObjectId hợp lệ, THE Admin_API SHALL trả về HTTP 400
3. WHEN `:id` là ObjectId hợp lệ nhưng không tồn tại, THE Admin_API SHALL trả về HTTP 404
4. WHEN lịch hẹn tồn tại, THE Admin_API SHALL trả về HTTP 200 với object `service_ticket` bao gồm: `appointment_code`, thông tin khách hàng (`customer`), thông tin xe (`vehicle`), thông tin dịch vụ (`service`), tên kỹ thuật viên, tên repair bay, ngày giờ hẹn, trạng thái, chi phí dự kiến (`estimated_price`), chi phí thực tế (`final_cost` nếu đã hoàn thành), ghi chú kỹ thuật viên (`staff_notes`), và thời gian tạo phiếu (`generated_at`)
5. WHEN admin gọi `POST /api/admin/appointments/:id/service-ticket/print`, THE Admin_API SHALL tạo một bản ghi `UserAudit` với action `SERVICE_TICKET_PRINTED` và trả về cùng dữ liệu phiếu dịch vụ như `GET`
6. THE Admin_API SHALL populate đầy đủ thông tin liên quan (`customer_id`, `staff_id`, `service_id`, `repair_bay_id`) khi tạo phiếu dịch vụ

---

### Yêu Cầu 4: Lấy Lịch Sử Hoạt Động Từ Database

**User Story:** Với tư cách admin, tôi muốn xem lịch sử các thay đổi thực tế của một lịch hẹn từ database, thay vì dữ liệu tĩnh/mock, để có thể truy vết đầy đủ mọi thao tác đã thực hiện.

#### Tiêu Chí Chấp Nhận

1. WHEN admin gọi `GET /api/admin/appointments/:id/activity-log`, THE Admin_API SHALL xác thực JWT token và kiểm tra role `ADMIN` hoặc `MANAGER` trước khi xử lý yêu cầu
2. WHEN `:id` không phải MongoDB ObjectId hợp lệ, THE Admin_API SHALL trả về HTTP 400
3. WHEN `:id` là ObjectId hợp lệ nhưng không tồn tại, THE Admin_API SHALL trả về HTTP 404
4. WHEN lịch hẹn tồn tại, THE Admin_API SHALL truy vấn collection `user_audits` để lấy tất cả bản ghi có `metadata.appointment_id` bằng `:id`, sắp xếp theo `created_at` giảm dần
5. THE Admin_API SHALL trả về HTTP 200 với mảng `activity_log` gồm các trường: `action`, `status`, `created_at`, `metadata`, và thông tin actor (người thực hiện) được populate từ `user_id`
6. WHERE query param `limit` được cung cấp (số nguyên dương, tối đa 100), THE Admin_API SHALL giới hạn số bản ghi trả về theo giá trị đó; mặc định là 50
7. WHEN không có bản ghi nào trong `user_audits` cho lịch hẹn đó, THE Admin_API SHALL trả về HTTP 200 với mảng `activity_log` rỗng

---

### Yêu Cầu 5: Ghi Chú Garage Riêng

**User Story:** Với tư cách admin/quản lý garage, tôi muốn lưu ghi chú nội bộ của garage vào một trường riêng biệt, để không bị lẫn với ghi chú của kỹ thuật viên (`staff_notes`) và dễ quản lý hơn.

#### Tiêu Chí Chấp Nhận

1. WHEN admin gọi `PUT /api/admin/appointments/:id/garage-note`, THE Admin_API SHALL xác thực JWT token và kiểm tra role `ADMIN` hoặc `MANAGER` trước khi xử lý yêu cầu
2. WHEN `:id` không phải MongoDB ObjectId hợp lệ, THE Admin_API SHALL trả về HTTP 400
3. WHEN `:id` là ObjectId hợp lệ nhưng không tồn tại, THE Admin_API SHALL trả về HTTP 404
4. WHEN request body chứa `garage_note` là chuỗi ký tự hợp lệ (tối đa 1000 ký tự), THE Admin_API SHALL lưu giá trị vào trường `garage_note` của document `Appointment` mà không thay đổi trường `staff_notes`
5. WHEN `garage_note` được lưu thành công, THE Admin_API SHALL tạo bản ghi `UserAudit` với action `APPOINTMENT_NOTES_ADDED` và trả về HTTP 200 với document appointment đã cập nhật
6. IF `garage_note` vượt quá 1000 ký tự, THEN THE Admin_API SHALL trả về HTTP 400 với thông báo lỗi validation
7. THE Appointment model SHALL lưu `garage_note` trong một trường riêng biệt, không gộp vào `staff_notes`
8. WHEN `garage_note` là chuỗi rỗng (`""`), THE Admin_API SHALL chấp nhận và lưu giá trị rỗng (xóa ghi chú)

---

### Yêu Cầu 6: Audit Log Cho Các Hành Động Mới

**User Story:** Với tư cách quản trị hệ thống, tôi muốn tất cả hành động mới (gửi SMS, gửi email, in phiếu) đều được ghi vào audit log, để có thể kiểm tra và truy vết khi cần.

#### Tiêu Chí Chấp Nhận

1. THE UserAudit model SHALL hỗ trợ các action mới: `SMS_SENT`, `EMAIL_SENT`, `SERVICE_TICKET_PRINTED`
2. WHEN bất kỳ action nào trong số `SMS_SENT`, `EMAIL_SENT`, `SERVICE_TICKET_PRINTED` được thực hiện thành công, THE Admin_API SHALL tạo bản ghi `UserAudit` với `user_id` là `customer_id` của lịch hẹn, `metadata.appointment_id` là id lịch hẹn, và `metadata.performed_by` là id admin thực hiện
3. IF việc tạo bản ghi `UserAudit` thất bại, THEN THE Admin_API SHALL ghi log lỗi nhưng KHÔNG được để lỗi đó làm fail toàn bộ request (audit failure không ảnh hưởng response chính)
