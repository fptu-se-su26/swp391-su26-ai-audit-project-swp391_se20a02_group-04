/**
 * Nạp danh mục dịch vụ thực tế cho garage sửa xe máy.
 * - Xóa dịch vụ demo cũ chưa phát sinh lượt đặt và không nằm trong danh mục mới.
 * - Upsert theo service_name với đầy đủ mã DV, kiểu giá, loại xe, nhắc bảo dưỡng.
 *
 * Chạy: node src/scripts/seedGarageServices.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Service = require('../models/Service.model');
const Appointment = require('../models/Appointment.model');

const CATALOG = [
  // ---- Rửa & chăm sóc xe ----
  {
    service_code: 'SVC-WASH-001',
    service_name: 'Rửa xe cơ bản',
    category: 'WASH_CARE',
    description: 'Rửa sạch toàn bộ xe bằng dung dịch chuyên dụng, xì khô, lau bóng nhanh dàn áo.',
    base_price: 30000,
    price_type: 'FIXED',
    vehicle_type: 'ALL',
    estimated_duration: 20,
    allow_booking: true,
    image_url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80',
  },
  {
    service_code: 'SVC-WASH-002',
    service_name: 'Rửa xe cao cấp + dưỡng bóng',
    category: 'WASH_CARE',
    description: 'Rửa bọt tuyết, vệ sinh mâm và gầm xe, dưỡng bóng dàn nhựa, xịt thơm khoang xe.',
    base_price: 70000,
    price_type: 'FIXED',
    vehicle_type: 'ALL',
    estimated_duration: 45,
    allow_booking: true,
    image_url: 'https://images.unsplash.com/photo-1605164599901-f8a1464a2c87?auto=format&fit=crop&w=900&q=80',
  },
  {
    service_code: 'SVC-WASH-003',
    service_name: 'Vệ sinh khoang máy & gầm xe',
    category: 'WASH_CARE',
    description: 'Xịt rửa khoang máy bằng dung dịch an toàn điện, vệ sinh gầm, chống rỉ sét các mối nối.',
    base_price: 120000,
    price_type: 'FIXED',
    vehicle_type: 'ALL',
    estimated_duration: 60,
    allow_booking: true,
  },

  // ---- Bảo dưỡng định kỳ ----
  {
    service_code: 'SVC-MAIN-001',
    service_name: 'Bảo dưỡng nhanh (checklist 10 hạng mục)',
    category: 'MAINTENANCE',
    description: 'Kiểm tra nhớt, phanh, lốp, đèn còi, xích/dây curoa, siết ốc toàn xe. Phù hợp bảo dưỡng mỗi 2.000km.',
    base_price: 100000,
    price_type: 'FIXED',
    vehicle_type: 'ALL',
    estimated_duration: 45,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 60,
    reminder_mileage: 2000,
    image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80',
  },
  {
    service_code: 'SVC-MAIN-002',
    service_name: 'Bảo dưỡng định kỳ 4.000km',
    category: 'MAINTENANCE',
    description: 'Thay nhớt, vệ sinh lọc gió, kiểm tra bugi, phanh, lốp, ắc quy và bôi trơn dây ga dây phanh. Giá chưa gồm vật tư thay thế.',
    base_price: 180000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 90,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 120,
    reminder_mileage: 4000,
  },
  {
    service_code: 'SVC-MAIN-003',
    service_name: 'Bảo dưỡng toàn diện 8.000km',
    category: 'MAINTENANCE',
    description: 'Bảo dưỡng lớn: thay nhớt + lọc nhớt, vệ sinh kim phun/họng ga, vệ sinh nồi (xe ga), kiểm tra toàn bộ hệ thống điện và gầm.',
    base_price: 450000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 180,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 240,
    reminder_mileage: 8000,
  },

  // ---- Dầu nhớt & dung dịch ----
  {
    service_code: 'SVC-LUBE-001',
    service_name: 'Thay nhớt máy',
    category: 'LUBRICANT',
    description: 'Xả nhớt cũ, thay nhớt mới theo lựa chọn của khách (giá tùy loại nhớt trong kho), kiểm tra nhanh xích và phanh.',
    base_price: 90000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 15,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 60,
    reminder_mileage: 1500,
  },
  {
    service_code: 'SVC-LUBE-002',
    service_name: 'Thay nhớt láp (xe tay ga)',
    category: 'LUBRICANT',
    description: 'Thay dầu láp hộp số xe tay ga, nên thay sau mỗi 3 lần thay nhớt máy.',
    base_price: 40000,
    price_type: 'FROM',
    vehicle_type: 'SCOOTER',
    estimated_duration: 15,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 180,
    reminder_mileage: 5000,
  },
  {
    service_code: 'SVC-LUBE-003',
    service_name: 'Thay nước làm mát',
    category: 'LUBRICANT',
    description: 'Xả và châm nước làm mát chuyên dụng cho xe tay ga có két nước, kiểm tra quạt và đường ống.',
    base_price: 80000,
    price_type: 'FROM',
    vehicle_type: 'SCOOTER',
    estimated_duration: 30,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 365,
    reminder_mileage: 10000,
  },

  // ---- Lốp & bánh xe ----
  {
    service_code: 'SVC-TIRE-001',
    service_name: 'Vá lốp / vá vỏ không ruột',
    category: 'TIRE_WHEEL',
    description: 'Vá dùi hoặc vá trong tùy tình trạng, kiểm tra áp suất cả hai bánh.',
    base_price: 25000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 15,
    allow_booking: true,
  },
  {
    service_code: 'SVC-TIRE-002',
    service_name: 'Thay lốp xe (công thay)',
    category: 'TIRE_WHEEL',
    description: 'Tháo lắp và thay lốp mới, cân chỉnh vành, kiểm tra bạc đạn bánh. Giá lốp tính riêng theo loại khách chọn trong kho.',
    base_price: 40000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 30,
    allow_booking: true,
    image_url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80',
  },

  // ---- Hệ thống phanh ----
  {
    service_code: 'SVC-BRAKE-001',
    service_name: 'Thay má phanh (công thay)',
    category: 'BRAKE',
    description: 'Thay má phanh trước hoặc sau, vệ sinh heo dầu/đùm, kiểm tra hành trình phanh. Giá má phanh tính theo loại trong kho.',
    base_price: 30000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 30,
    allow_booking: true,
  },
  {
    service_code: 'SVC-BRAKE-002',
    service_name: 'Thay dầu phanh & xả gió',
    category: 'BRAKE',
    description: 'Thay dầu phanh DOT4, xả gió hệ thống phanh đĩa, kiểm tra ống dầu và heo phanh.',
    base_price: 80000,
    price_type: 'FIXED',
    vehicle_type: 'ALL',
    estimated_duration: 30,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 365,
    reminder_mileage: 15000,
  },

  // ---- Điện & ắc quy ----
  {
    service_code: 'SVC-ELEC-001',
    service_name: 'Kiểm tra & thay ắc quy',
    category: 'ELECTRICAL',
    description: 'Đo tình trạng ắc quy và hệ thống sạc, thay ắc quy mới nếu cần (giá ắc quy theo loại trong kho).',
    base_price: 30000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 20,
    allow_booking: true,
  },
  {
    service_code: 'SVC-ELEC-002',
    service_name: 'Sửa chữa hệ thống điện, đèn, còi',
    category: 'ELECTRICAL',
    description: 'Dò và xử lý chập điện, đứt dây, hỏng công tắc, đèn không sáng, còi không kêu. Báo giá sau khi kiểm tra.',
    base_price: 50000,
    price_type: 'QUOTE',
    vehicle_type: 'ALL',
    estimated_duration: 60,
    allow_booking: true,
  },

  // ---- Động cơ & truyền động ----
  {
    service_code: 'SVC-ENG-001',
    service_name: 'Vệ sinh kim phun & họng ga (FI)',
    category: 'ENGINE_TRANSMISSION',
    description: 'Vệ sinh hệ thống phun xăng điện tử bằng dung dịch chuyên dụng, giúp xe nổ êm, tiết kiệm xăng.',
    base_price: 150000,
    price_type: 'FIXED',
    vehicle_type: 'ALL',
    estimated_duration: 60,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 240,
    reminder_mileage: 8000,
  },
  {
    service_code: 'SVC-ENG-002',
    service_name: 'Bảo dưỡng nồi xe tay ga',
    category: 'ENGINE_TRANSMISSION',
    description: 'Tháo vệ sinh bộ nồi, kiểm tra bi nồi, dây curoa, ba càng; thay thế nếu mòn (vật tư tính riêng).',
    base_price: 120000,
    price_type: 'FROM',
    vehicle_type: 'SCOOTER',
    estimated_duration: 90,
    allow_booking: true,
    reminder_enabled: true,
    reminder_days: 240,
    reminder_mileage: 8000,
  },
  {
    service_code: 'SVC-ENG-003',
    service_name: 'Thay nhông sên dĩa (công thay)',
    category: 'ENGINE_TRANSMISSION',
    description: 'Thay bộ nhông sên dĩa, căn chỉnh độ chùng sên, bôi trơn. Giá bộ nhông sên dĩa theo loại trong kho.',
    base_price: 50000,
    price_type: 'FROM',
    vehicle_type: 'MANUAL',
    estimated_duration: 45,
    allow_booking: true,
  },
  {
    service_code: 'SVC-ENG-004',
    service_name: 'Đại tu / làm máy',
    category: 'ENGINE_TRANSMISSION',
    description: 'Mổ máy kiểm tra piston, xupap, bạc đạn; báo giá chi tiết trước khi làm. Bảo hành công sửa 3 tháng.',
    base_price: 200000,
    price_type: 'QUOTE',
    vehicle_type: 'ALL',
    estimated_duration: 480,
    allow_booking: true,
  },

  // ---- Khung, phuộc & tay lái ----
  {
    service_code: 'SVC-SUSP-001',
    service_name: 'Bảo dưỡng phuộc trước',
    category: 'SUSPENSION_FRAME',
    description: 'Thay dầu phuộc, thay phốt nếu chảy dầu, kiểm tra bạc đạn cổ lái.',
    base_price: 150000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 90,
    allow_booking: true,
  },
  {
    service_code: 'SVC-SUSP-002',
    service_name: 'Sửa chữa khung sườn, tay lái',
    category: 'SUSPENSION_FRAME',
    description: 'Xử lý xe bị lệch tay lái, rơ cổ, cong càng sau va chạm. Kiểm tra và báo giá trước khi sửa.',
    base_price: 50000,
    price_type: 'QUOTE',
    vehicle_type: 'ALL',
    estimated_duration: 120,
    allow_booking: true,
  },

  // ---- Phụ kiện & nâng cấp ----
  {
    service_code: 'SVC-ACC-001',
    service_name: 'Lắp phụ kiện (baga, kính gió, giá đỡ...)',
    category: 'ACCESSORY',
    description: 'Lắp đặt phụ kiện chính hãng mua tại cửa hàng hoặc khách mang tới, đảm bảo không ảnh hưởng kết cấu xe.',
    base_price: 30000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 30,
    allow_booking: true,
  },
  {
    service_code: 'SVC-ACC-002',
    service_name: 'Dán keo xe / PPF chống trầy',
    category: 'ACCESSORY',
    description: 'Dán keo trong hoặc decal đổi màu theo yêu cầu, báo giá theo dòng xe và loại keo.',
    base_price: 300000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 240,
    allow_booking: true,
  },

  // ---- Kiểm tra & chẩn đoán ----
  {
    service_code: 'SVC-INSP-001',
    service_name: 'Kiểm tra tổng quát xe',
    category: 'INSPECTION',
    description: 'Checklist 20 hạng mục toàn xe: động cơ, điện, phanh, lốp, khung sườn. Phù hợp trước chuyến đi xa hoặc khi mua xe cũ.',
    base_price: 50000,
    price_type: 'FIXED',
    vehicle_type: 'ALL',
    estimated_duration: 30,
    allow_booking: true,
  },
  {
    service_code: 'SVC-INSP-002',
    service_name: 'Đọc lỗi FI bằng máy chẩn đoán',
    category: 'INSPECTION',
    description: 'Kết nối máy chẩn đoán đọc mã lỗi hệ thống phun xăng điện tử, xóa lỗi và tư vấn hướng xử lý.',
    base_price: 80000,
    price_type: 'FIXED',
    vehicle_type: 'ALL',
    estimated_duration: 30,
    allow_booking: true,
  },

  // ---- Cứu hộ ----
  {
    service_code: 'SVC-SOS-001',
    service_name: 'Cứu hộ xe tận nơi (nội thành)',
    category: 'EMERGENCY',
    description: 'Hỗ trợ xe chết máy, hết bình, thủng lốp tận nơi trong bán kính 5km. Phí di chuyển tính theo khoảng cách.',
    base_price: 50000,
    price_type: 'FROM',
    vehicle_type: 'ALL',
    estimated_duration: 60,
    allow_booking: true,
  },
];

async function run() {
  await connectDB();

  const catalogNames = new Set(CATALOG.map((item) => item.service_name.toLowerCase()));

  // Dọn dịch vụ demo cũ: không thuộc catalog mới và chưa có lượt đặt nào.
  const existing = await Service.find({});
  let removed = 0;
  for (const service of existing) {
    if (catalogNames.has((service.service_name || '').toLowerCase())) continue;
    const bookings = await Appointment.countDocuments({ service_id: service._id });
    if (bookings === 0) {
      await Service.deleteOne({ _id: service._id });
      removed += 1;
      console.log(`- Đã xóa dịch vụ demo: ${service.service_name}`);
    } else {
      // Đã có lượt đặt nên không xóa; tạm ngưng để không lẫn vào danh mục mới.
      await Service.updateOne({ _id: service._id }, { $set: { is_active: false } });
      console.log(`- Tạm ngưng (đã có ${bookings} lượt đặt): ${service.service_name}`);
    }
  }

  // Upsert catalog mới theo service_name.
  let created = 0;
  let updated = 0;
  for (const item of CATALOG) {
    const result = await Service.updateOne(
      { service_name: item.service_name },
      {
        $set: { ...item, is_active: true },
        $setOnInsert: { total_bookings: 0 },
      },
      { upsert: true, runValidators: true }
    );
    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  console.log(`\nHoàn tất: thêm mới ${created}, cập nhật ${updated}, xóa ${removed} dịch vụ.`);
  const total = await Service.countDocuments();
  console.log(`Tổng số dịch vụ hiện có: ${total}`);

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Seed dịch vụ thất bại:', error);
  process.exit(1);
});
