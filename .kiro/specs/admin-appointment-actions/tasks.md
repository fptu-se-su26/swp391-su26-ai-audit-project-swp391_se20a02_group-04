# Kế Hoạch Triển Khai: Admin Appointment Actions

## Tasks

- [ ] 1. Cập nhật Models
  - [ ] 1.1 Thêm field `garage_note` vào Appointment model
  - [ ] 1.2 Cập nhật UserAudit model: thêm actions mới, field `appointment_id`, và index mới

- [ ] 2. Tạo SMS Service
  - [ ] 2.1 Tạo `backend/src/services/sms.service.js` với function `sendSms`

- [ ] 3. Cập nhật Email Utility
  - [ ] 3.1 Thêm function `sendAppointmentNotification` vào `backend/src/utils/email.util.js`

- [ ] 4. Tạo Service Ticket Service
  - [ ] 4.1 Tạo `backend/src/services/serviceTicket.service.js` với function `buildServiceTicket`

- [ ] 5. Thêm Controller Functions
  - [ ] 5.1 Thêm `sendSmsNotification` vào admin.appointment.controller.js
  - [ ] 5.2 Thêm `sendEmailNotification` vào admin.appointment.controller.js
  - [ ] 5.3 Thêm `getServiceTicket` và `printServiceTicket` vào admin.appointment.controller.js
  - [ ] 5.4 Thêm `getActivityLog` vào admin.appointment.controller.js
  - [ ] 5.5 Thêm `updateGarageNote` vào admin.appointment.controller.js

- [ ] 6. Thêm Routes
  - [ ] 6.1 Thêm 6 routes mới vào admin.appointment.routes.js với validation

- [ ] 7. Viết Tests
  - [ ] 7.1 Viết property-based tests cho các Correctness Properties (dùng fast-check)
  - [ ] 7.2 Viết unit tests cho edge cases và error conditions
