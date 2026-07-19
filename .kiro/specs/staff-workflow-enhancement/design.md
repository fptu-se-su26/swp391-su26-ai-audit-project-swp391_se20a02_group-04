# Design Document — staff-workflow-enhancement

## Overview

Feature này biến quy trình làm việc của kỹ thuật viên từ các màn hình rời rạc thành một **Workflow Stepper 4 bước tuyến tính** gắn trực tiếp vào trang Job Detail. Bốn bước — Kiểm tra / Liên hệ KH / Vật tư / Thanh toán — phản ánh đúng thứ tự công việc thực tế tại garage.

Ngoài UI workflow, feature còn cải thiện **Job List** (sort mặc định theo `assigned_at`, bộ lọc đầy đủ) và tích hợp **PayOS** để tạo QR thanh toán tại quầy.

Phạm vi thay đổi:
- Backend: 4 API endpoint mới, mở rộng sort/filter, thêm 3 field vào Appointment model, tạo `payos.service.js`.
- Frontend: Refactor `StaffJobDetail.js` thành WorkflowStepper + 4 Step component, cập nhật `StaffJobs.js`.

---

## Architecture

Hệ thống theo kiến trúc REST API hiện tại: React SPA gọi Express/Node.js, dữ liệu lưu MongoDB.

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React)                                    │
│                                                      │
│  StaffJobs.js          StaffJobDetail.js             │
│  ├─ FilterBar          ├─ WorkflowStepper            │
│  └─ JobList            │   ├─ Step1_Diagnosis        │
│                        │   ├─ Step2_ContactLog       │
│                        │   ├─ Step3_Materials        │
│                        │   └─ Step4_Payment          │
│                        └─ JobSummary (readonly)      │
└────────────────┬────────────────────────────────────┘
                 │ REST (JWT)
┌────────────────▼────────────────────────────────────┐
│  Backend (Express/Node.js)                           │
│                                                      │
│  staff.appointment.routes.js                         │
│  staff.appointment.controller.js                     │
│  ├─ saveDiagnosis          (PUT  /:id/diagnosis)     │
│  ├─ saveContactLog         (PUT  /:id/contact-log)   │
│  ├─ createPayment          (POST /:id/payment)       │
│  └─ getPaymentStatus       (GET  /:id/payment/status)│
│                                                      │
│  payos.service.js                                    │
│  ├─ createPaymentLink()                              │
│  └─ getPaymentStatus()                               │
│                                                      │
│  webhook.routes.js  → POST /api/webhooks/payos       │
└────────────────┬────────────────────────────────────┘
                 │ Mongoose
┌────────────────▼────────────────────────────────────┐
│  MongoDB                                             │
│  appointments  (+ diagnosis_notes, contact_log,      │
│                   payment_info fields)               │
│  inventory_items / inventory_transactions            │
│  services                                            │
└─────────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  PayOS (external)                                    │
│  POST /v2/payment-requests  — tạo payment link       │
│  GET  /v2/payment-requests/:orderCode — poll status  │
│  Webhook callback → POST /api/webhooks/payos         │
└─────────────────────────────────────────────────────┘
```

Không có thay đổi kiến trúc tầng: không thêm collection mới, không thêm service layer trung gian ngoài `payos.service.js`.

---

## Components and Interfaces

### Backend

#### 1. `STAFF_APPOINTMENT_SORT_FIELDS` (mở rộng)

```js
// Trước
const STAFF_APPOINTMENT_SORT_FIELDS = new Set([
  'appointment_date', 'start_time', 'time_slot', 'status', 'created_at'
]);
// Sau — thêm assigned_at
const STAFF_APPOINTMENT_SORT_FIELDS = new Set([
  'appointment_date', 'start_time', 'time_slot', 'status', 'created_at', 'assigned_at'
]);
```

#### 2. `service_category` filter trong `getMyAssignedAppointments`

Khi query có `service_category`, controller dùng aggregation `$lookup` để join với collection `services` và lọc theo `services.category`. Các request không có `service_category` không thay đổi (vẫn dùng `Appointment.find`).

```js
// Nếu service_category có trong query:
Appointment.aggregate([
  { $match: baseQuery },
  { $lookup: { from: 'services', localField: 'service_id', foreignField: '_id', as: 'svc' } },
  { $match: { 'svc.category': service_category.toUpperCase() } },
  { $sort: { [safeSortBy]: safeSortOrder } },
  { $skip: skip }, { $limit: limit }
])
```

#### 3. Endpoint: `PUT /api/staff/appointments/:id/diagnosis`

```
Request:  { diagnosis_notes: string (max 2000) }
Response: 200 { appointment: { _id, diagnosis_notes } }
Errors:   400 validation | 403 ownership | 404 not found | 422 status not IN_PROGRESS
```

Validation: trim + maxlength 2000 (express-validator `body('diagnosis_notes')`).

#### 4. Endpoint: `PUT /api/staff/appointments/:id/contact-log`

```
Request:  { status: 'AGREED'|'DECLINED'|'NO_ANSWER', notes?: string (max 500) }
Response: 200 { appointment: { _id, contact_log } }
Errors:   400 validation | 403 ownership | 422 status not IN_PROGRESS
```

`contacted_at` được set server-side = `new Date()`.

#### 5. Endpoint: `POST /api/staff/appointments/:id/payment`

```
Request:  {} (no body — amount calculated server-side)
Response: 200 { payment_url, qr_code, order_code }
Errors:   402 PayOS error | 403 | 422 status not IN_PROGRESS
```

Server tính `amount = appointment.service_id.base_price + sum(InventoryTransaction.total_cost where reference_id = appointment._id)`. Lưu `payment_info` vào appointment trước khi return.

#### 6. Endpoint: `GET /api/staff/appointments/:id/payment/status`

```
Response: 200 { status: 'PENDING'|'PAID'|'CANCELLED', paid_at?, amount }
```

Nếu status = PAID và appointment chưa COMPLETED: tự động cập nhật `appointment.status = COMPLETED`, `appointment.final_cost`, `appointment.payment_info`.

#### 7. `POST /api/webhooks/payos` (webhook handler)

Route **không** cần JWT. Xác thực bằng checksum từ PayOS SDK trước khi xử lý. Khi hợp lệ + payment thành công: cập nhật appointment giống GET payment/status.

#### 8. `payos.service.js`

```js
// Interface
createPaymentLink(orderCode, amount, description, returnUrl, cancelUrl)
  → Promise<{ payment_url: string, qr_code: string }>

getPaymentStatus(orderCode)
  → Promise<{ status: 'PENDING'|'PAID'|'CANCELLED', paid_at?: Date, amount: number }>

verifyWebhookSignature(webhookData)
  → boolean
```

Khởi tạo PayOS SDK với `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`. Nếu thiếu env → log warning, không crash server.

### Frontend

#### 1. `WorkflowStepper` component

Logic xác định bước hiện tại:

```
Step 1 done: job.raw.diagnosis_notes có giá trị (non-empty)
Step 2 done: job.raw.contact_log.status có giá trị
           | dịch vụ có price_type = FIXED → auto-skip
Step 3 done: job.materialsUsed.length > 0
Step 4 done: job.status === 'COMPLETED'

currentStep = index của bước đầu tiên chưa done
```

Hiển thị stepper chỉ khi `status === 'IN_PROGRESS'`. Status CONFIRMED → nút "Bắt đầu công việc". Status COMPLETED → tất cả bước hiện "done" + bill readonly.

#### 2. `Step1_Diagnosis` component

- Textarea `diagnosis_notes` (maxlength=2000, counter hiển thị ký tự còn lại)
- Gọi `PUT /api/staff/appointments/:id/diagnosis`
- Readonly khi appointment COMPLETED

#### 3. `Step2_ContactLog` component

- Hiển thị số điện thoại khách từ `job.phone`
- 3 nút: AGREED / DECLINED / NO_ANSWER
- Textarea notes (optional, max 500)
- Gọi `PUT /api/staff/appointments/:id/contact-log`
- Skip hoàn toàn (mark done tự động) nếu `service.price_type === 'FIXED'`

#### 4. `Step3_Materials` component

- Tái sử dụng logic từ `StaffJobMaterials` trong `StaffJobDetail.js` hiện có
- Thêm search input lọc inventory theo tên/mã
- Real-time tổng cộng tạm tính khi Staff chọn số lượng
- Gọi API hiện có `POST /api/staff/appointments/:id/materials`

#### 5. `Step4_Payment` component

- Hiển thị bill chi tiết: base_price + từng vật tư + tổng
- Nút "Tạo QR thanh toán" → gọi `POST /api/staff/appointments/:id/payment`
- Hiển thị QR code + link PayOS sau khi tạo thành công
- Nút "Kiểm tra thanh toán" → gọi `GET /api/staff/appointments/:id/payment/status`
- Nút "Thanh toán tiền mặt" → dialog nhập `final_cost` thủ công + gọi complete

#### 6. `StaffJobs.js` — cập nhật

- Thay `sort_by: "appointment_date"` → `sort_by: "assigned_at"` (mặc định)
- Thêm `FilterBar` component với date-range picker và service_category dropdown
- Cập nhật `filterJobsByUiStatus` hoặc truyền filter params lên API

#### 7. `staffAppointmentMapper.js` — cập nhật

Thêm mapping cho các field mới:

```js
diagnosisNotes: appointment.diagnosis_notes || '',
contactLog: appointment.contact_log || null,
paymentInfo: appointment.payment_info || null,
assignedAt: appointment.assigned_at || null,
priceType: serviceDoc.price_type || service.price_type || 'FIXED',
```

---

## Data Models

### Appointment model — fields mới

```js
// Thêm vào appointmentSchema

diagnosis_notes: {
  type: String,
  trim: true,
  maxlength: [2000, 'Diagnosis notes cannot exceed 2000 characters'],
  default: null
},

contact_log: {
  status: {
    type: String,
    enum: ['AGREED', 'DECLINED', 'NO_ANSWER'],
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Contact log notes cannot exceed 500 characters'],
    default: ''
  },
  contacted_at: {
    type: Date,
    default: null
  }
},

payment_info: {
  order_code: { type: String, default: null },
  payment_url: { type: String, default: null },
  qr_code: { type: String, default: null },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'CANCELLED'],
    default: null
  },
  paid_at: { type: Date, default: null },
  amount: { type: Number, default: null }
}
```

Các field mới đều `default: null` — backward compatible, document cũ load bình thường.

### InventoryTransaction — không thay đổi

Đã có `total_cost` được tính từ `unit_cost * abs(quantity_change)`. Bill_Calculator dùng `$sum('total_cost')` từ các transaction có `reference_id = appointment._id`.

### Index bổ sung (tùy chọn)

```js
appointmentSchema.index({ assigned_at: 1 }); // hỗ trợ sort mặc định
appointmentSchema.index({ 'payment_info.order_code': 1 }); // lookup webhook
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sort theo `assigned_at` luôn đặt job cũ hơn lên trước

*For any* danh sách appointments được trả về từ `GET /api/staff/appointments?sort_by=assigned_at&sort_order=asc`, với bất kỳ hai phần tử liền kề `a[i]` và `a[i+1]`, ta có `a[i].assigned_at <= a[i+1].assigned_at`.

**Validates: Requirements 1.1, 1.5, 8.5**

### Property 2: Filter `service_category` chỉ trả về đúng category

*For any* giá trị `service_category` hợp lệ trong `SERVICE_CATEGORIES`, tất cả appointments được trả về từ `GET /api/staff/appointments?service_category=X` đều phải có `service_id.category === X` (sau khi populate).

**Validates: Requirements 2.3, 8.6**

### Property 3: `diagnosis_notes` vượt giới hạn phải bị từ chối, dữ liệu không đổi

*For any* chuỗi có độ dài > 2000 ký tự, `PUT /api/staff/appointments/:id/diagnosis` phải trả về HTTP 400 và `diagnosis_notes` trên Appointment không được thay đổi (invariant: document state preserved on invalid input).

**Validates: Requirements 4.7, 9.1**

### Property 4: `contact_log.notes` vượt giới hạn phải bị từ chối, dữ liệu không đổi

*For any* chuỗi `notes` có độ dài > 500 ký tự, `PUT /api/staff/appointments/:id/contact-log` phải trả về HTTP 400 và `contact_log` trên Appointment không được thay đổi.

**Validates: Requirements 5.7, 9.2**

### Property 5: Round-trip lưu và đọc lại diagnosis_notes

*For any* chuỗi `diagnosis_notes` hợp lệ (1–2000 ký tự), sau khi gọi thành công `PUT /:id/diagnosis`, gọi tiếp `GET /:id` phải trả về đúng `diagnosis_notes` đã lưu; đồng thời WorkflowStepper phải đánh dấu Bước 1 là "done".

**Validates: Requirements 4.4, 4.5, 8.1**

### Property 6: Round-trip lưu và đọc lại contact_log

*For any* giá trị `status` trong `{AGREED, DECLINED, NO_ANSWER}` và bất kỳ chuỗi `notes` hợp lệ (0–500 ký tự), sau khi gọi thành công `PUT /:id/contact-log`, gọi tiếp `GET /:id` phải trả về đúng `contact_log.status` và `contact_log.notes` đã lưu; đồng thời WorkflowStepper phải đánh dấu Bước 2 là "done".

**Validates: Requirements 5.2, 5.4, 8.2**

### Property 7: Dịch vụ FIXED-price tự động skip Bước 2

*For any* appointment có `service.price_type === 'FIXED'`, hàm tính step state của WorkflowStepper phải trả về Bước 2 là "done" mà không cần `contact_log` có giá trị.

**Validates: Requirements 5.5**

### Property 8: PayOS round-trip — order_code lookup

*For any* payment link được tạo qua `POST /:id/payment`, `appointment_code` được dùng làm `orderCode` phải lookup lại được đúng Appointment gốc — tức là `Appointment.findOne({ appointment_code: orderCode })._id === appointment._id`.

**Validates: Requirements 10.7**

### Property 9: Webhook signature không hợp lệ phải bị từ chối, không cập nhật dữ liệu

*For any* request đến `POST /api/webhooks/payos` với checksum signature không khớp, server phải trả về HTTP 400 và không có appointment nào được cập nhật (invariant: no side effects on invalid webhook).

**Validates: Requirements 10.3**

### Property 10: Tổng bill = base_price + tổng giá trị vật tư

*For any* appointment với bất kỳ tập hợp InventoryTransaction nào có `reference_id = appointment._id` và `transaction_type = STOCK_OUT`, giá trị `total` được tính bởi Bill_Calculator phải bằng đúng `service.base_price + sum(transaction.total_cost)`.

**Validates: Requirements 7.1, 6.7**

### Property 11: Xác thực auth — 401 và 403 được thực thi trên mọi endpoint mới

*For any* request không có JWT hợp lệ đến `PUT /:id/diagnosis`, `PUT /:id/contact-log`, `POST /:id/payment`, hoặc `GET /:id/payment/status` phải trả về HTTP 401; với bất kỳ staff user nào gọi appointment không được giao cho họ phải trả về HTTP 403.

**Validates: Requirements 8.7, 8.8**

### Property 12: Backward compatibility — document cũ vẫn load bình thường

*For any* Appointment document không có fields `diagnosis_notes`, `contact_log`, hoặc `payment_info`, load document đó qua Mongoose phải thành công và các fields mới phải có giá trị `null`/`undefined` (không throw error, không fail validation).

**Validates: Requirements 9.4, 9.5**

---

## Error Handling

| Tình huống | Phản hồi |
|---|---|
| JWT thiếu / hết hạn | 401 Unauthorized |
| Staff gọi appointment không phải của mình | 403 Forbidden |
| Appointment không tồn tại | 404 Not Found |
| Cố gọi API workflow khi status không phải IN_PROGRESS | 422 Unprocessable Entity |
| `diagnosis_notes` > 2000 ký tự | 400 Bad Request + message |
| `contact_log.notes` > 500 ký tự | 400 Bad Request + message |
| `contact_log.status` không thuộc enum | 400 Bad Request |
| PayOS không khởi tạo được (thiếu env) | 500 với message rõ ràng, không crash server |
| PayOS trả lỗi khi tạo payment link | 502 Bad Gateway, frontend hiện retry button |
| Webhook signature sai | 400 Bad Request, không xử lý |
| Kho không đủ vật tư | 409 Conflict (đã xử lý bởi API hiện có) |

Frontend hiển thị lỗi inline trong từng Step component, không dùng alert/confirm ngoài trường hợp no-show (đã có).

---

## Testing Strategy

### Unit tests

Tập trung vào các logic nghiệp vụ quan trọng:

- `payos.service.js`: mock PayOS SDK, test `createPaymentLink` và `getPaymentStatus` với các response scenarios
- `saveDiagnosis` controller: test validation boundary (2000 ký tự), test ownership check, test 422 khi status != IN_PROGRESS
- `saveContactLog` controller: test enum validation, test 400 khi notes > 500 ký tự
- Webhook handler: test checksum validation với valid/invalid signatures
- `WorkflowStepper` logic (pure function `getStepState`): test 16 combinations của 4 boolean flags

### Property-based tests

Sử dụng **fast-check** (npm package, phù hợp Jest ecosystem hiện có).

Mỗi property test chạy tối thiểu 100 lần với dữ liệu sinh ngẫu nhiên.

**Tag format:** `// Feature: staff-workflow-enhancement, Property N: <property_text>`

```js
// Ví dụ cấu hình
import fc from 'fast-check';
test('Property 3: diagnosis_notes quá dài bị từ chối', async () => {
  // Feature: staff-workflow-enhancement, Property 3: diagnosis_notes vượt giới hạn phải bị từ chối
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 2001, maxLength: 3000 }),
      async (longNotes) => {
        const res = await request(app)
          .put(`/api/staff/appointments/${testAppId}/diagnosis`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ diagnosis_notes: longNotes });
        expect(res.status).toBe(400);
      }
    ),
    { numRuns: 100 }
  );
});
```

Mỗi Correctness Property từ phần trên được implement bởi **đúng một** property test. Edge cases (empty string, null, boundary values) được cover bởi unit tests riêng, không tạo property test trùng lặp.

### Integration tests

- Full flow: start appointment → save diagnosis → save contact_log → use materials → create payment → webhook → COMPLETED
- Sort + filter combinations trên `GET /api/staff/appointments`
- PayOS mock với nock hoặc jest manual mock
