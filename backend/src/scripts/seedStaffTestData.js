require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Appointment = require('../models/Appointment.model');
const InventoryItem = require('../models/InventoryItem.model');
const Role = require('../models/Role.model');
const Service = require('../models/Service.model');
const StaffAttendance = require('../models/StaffAttendance.model');
const User = require('../models/User.model');
const UserRole = require('../models/UserRole.model');

const STAFF_EMAIL = 'staff1@example.com';
const STAFF_PASSWORD = 'Staff@123';

const toDateString = (date = new Date()) => date.toISOString().slice(0, 10);

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
};

async function ensureRole(role_name, description) {
  return Role.findOneAndUpdate(
    { role_name },
    { $setOnInsert: { role_name, description, is_active: true } },
    { new: true, upsert: true }
  );
}

async function ensureUser({ email, full_name, phone, password, role }) {
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      password_hash: password,
      full_name,
      phone,
      verified: true,
      is_active: true
    });
  } else {
    user.full_name = user.full_name || full_name;
    user.phone = user.phone || phone;
    user.verified = true;
    user.is_active = true;
    await user.save();
  }

  await UserRole.updateOne(
    { user_id: user._id, role_id: role._id },
    { $setOnInsert: { user_id: user._id, role_id: role._id } },
    { upsert: true }
  );

  return user;
}

async function ensureService(service) {
  return Service.findOneAndUpdate(
    { service_name: service.service_name },
    { $set: service },
    { new: true, upsert: true }
  );
}

async function upsertAppointment(data) {
  return Appointment.findOneAndUpdate(
    { appointment_code: data.appointment_code },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );
}

async function ensureInventoryItem(item) {
  return InventoryItem.findOneAndUpdate(
    { item_code: item.item_code },
    { $set: item },
    { new: true, upsert: true, runValidators: true }
  );
}

async function ensureAttendance(staffId, workDate, data) {
  return StaffAttendance.findOneAndUpdate(
    { staff_id: staffId, work_date: workDate },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );
}

async function seedStaffTestData() {
  try {
    await connectDB();

    const staffRole = await ensureRole('STAFF', 'Technical staff');
    const customerRole = await ensureRole('CUSTOMER', 'Customer');

    const staff = await ensureUser({
      email: STAFF_EMAIL,
      password: STAFF_PASSWORD,
      full_name: 'Nguyen Van A',
      phone: '0902234567',
      role: staffRole
    });

    const customers = await Promise.all([
      ensureUser({
        email: 'customer.staff.test.1@example.com',
        password: 'Customer@123',
        full_name: 'Nguyen Thu Ha',
        phone: '0902114258',
        role: customerRole
      }),
      ensureUser({
        email: 'customer.staff.test.2@example.com',
        password: 'Customer@123',
        full_name: 'Le Quoc Huy',
        phone: '0918774120',
        role: customerRole
      }),
      ensureUser({
        email: 'customer.staff.test.3@example.com',
        password: 'Customer@123',
        full_name: 'Pham Minh Tu',
        phone: '0936712009',
        role: customerRole
      })
    ]);

    const services = await Promise.all([
      ensureService({
        service_name: 'Rua xe cao cap va ve sinh dong co',
        description: 'Rua xe cao cap, ve sinh dong co nhe va kiem tra nhanh tinh trang xe.',
        category: 'OTHER',
        base_price: 120000,
        estimated_duration: 45,
        is_active: true
      }),
      ensureService({
        service_name: 'Thay nhot va kiem tra bugi',
        description: 'Thay nhot, kiem tra bugi, can chinh phanh va loc gio.',
        category: 'MAINTENANCE',
        base_price: 220000,
        estimated_duration: 70,
        is_active: true
      }),
      ensureService({
        service_name: 'Kiem tra tong quat xe may',
        description: 'Kiem tra tong quat, tang sen, can chinh phanh va bao duong co ban.',
        category: 'INSPECTION',
        base_price: 160000,
        estimated_duration: 60,
        is_active: true
      })
    ]);

    const inventoryItems = await Promise.all([
      ensureInventoryItem({
        item_name: 'Nhot 10W40',
        item_code: 'STAFF-OIL-10W40',
        description: 'Nhot ban tong hop dung cho bao duong xe may pho thong.',
        category: 'CONSUMABLES',
        unit: 'chai',
        unit_price: 120000,
        cost_price: 85000,
        quantity: 24,
        min_stock_level: 8,
        max_stock_level: 100,
        reorder_point: 10,
        supplier_name: 'MotoCare Parts',
        is_active: true
      }),
      ensureInventoryItem({
        item_name: 'Bugi NGK',
        item_code: 'STAFF-SPARK-NGK',
        description: 'Bugi NGK chinh hang cho xe so va xe ga pho thong.',
        category: 'SPARE_PARTS',
        unit: 'cai',
        unit_price: 65000,
        cost_price: 42000,
        quantity: 18,
        min_stock_level: 10,
        max_stock_level: 120,
        reorder_point: 12,
        supplier_name: 'MotoCare Parts',
        is_active: true
      }),
      ensureInventoryItem({
        item_name: 'Dung dich rua xe',
        item_code: 'STAFF-WASH-SOLUTION',
        description: 'Dung dich rua xe va ve sinh dan ao.',
        category: 'CONSUMABLES',
        unit: 'can',
        unit_price: 95000,
        cost_price: 60000,
        quantity: 3,
        min_stock_level: 3,
        max_stock_level: 30,
        reorder_point: 4,
        supplier_name: 'MotoCare Detailing',
        is_active: true
      })
    ]);

    const today = addDays(0);
    const yesterday = addDays(-1);
    const tomorrow = addDays(1);

    const appointments = [
      {
        appointment_code: `STAFFTEST-${today}-ASSIGNED-01`,
        customer_id: customers[0]._id,
        staff_id: staff._id,
        service_id: services[0]._id,
        service: {
          type: 'WASH',
          name: 'Rua xe cao cap, ve sinh dong co nhe',
          description: services[0].description,
          estimated_price: services[0].base_price,
          estimated_duration_minutes: services[0].estimated_duration,
          issue_description: 'Khach yeu cau kiem tra tieng keu o phanh sau.'
        },
        vehicle: {
          brand: 'Honda',
          model: 'Vision',
          license_plate: '59A1-234.56',
          odometer: 18240
        },
        appointment_date: today,
        start_time: '09:30',
        end_time: '10:15',
        status: 'CONFIRMED',
        customer_note: 'Kiem tra them phanh sau neu con thoi gian.',
        staff_notes: ''
      },
      {
        appointment_code: `STAFFTEST-${today}-PROGRESS-01`,
        customer_id: customers[1]._id,
        staff_id: staff._id,
        service_id: services[1]._id,
        service: {
          type: 'MAINTENANCE',
          name: 'Thay nhot, kiem tra bugi, can chinh phanh',
          description: services[1].description,
          estimated_price: services[1].base_price,
          estimated_duration_minutes: services[1].estimated_duration,
          issue_description: 'May yeu, phanh truoc an khong deu.'
        },
        vehicle: {
          brand: 'Yamaha',
          model: 'Sirius',
          license_plate: '68B1-998.21',
          odometer: 31560
        },
        appointment_date: today,
        start_time: '10:15',
        end_time: '11:25',
        status: 'IN_PROGRESS',
        customer_note: 'Xe di hang ngay, can giao trong buoi sang.',
        staff_notes: 'Da nhan xe, dang kiem tra bugi va dau nhot.'
      },
      {
        appointment_code: `STAFFTEST-${today}-DONE-01`,
        customer_id: customers[2]._id,
        staff_id: staff._id,
        service_id: services[0]._id,
        service: {
          type: 'WASH',
          name: 'Rua xe thuong, kiem tra ap suat lop',
          description: services[0].description,
          estimated_price: 80000,
          estimated_duration_minutes: 30,
          issue_description: 'Rua xe dinh ky.'
        },
        vehicle: {
          brand: 'Honda',
          model: 'Air Blade',
          license_plate: '51F8-712.09',
          odometer: 22010
        },
        appointment_date: today,
        start_time: '11:00',
        end_time: '11:30',
        status: 'COMPLETED',
        completed_at: new Date(),
        actual_duration: 28,
        customer_note: 'Rua sach dan ao.',
        staff_notes: 'Da hoan thanh rua xe va bom lop.'
      },
      {
        appointment_code: `STAFFTEST-${tomorrow}-ASSIGNED-01`,
        customer_id: customers[0]._id,
        staff_id: staff._id,
        service_id: services[2]._id,
        service: {
          type: 'REPAIR',
          name: 'Kiem tra tong quat, tang sen, can chinh phanh',
          description: services[2].description,
          estimated_price: services[2].base_price,
          estimated_duration_minutes: services[2].estimated_duration,
          issue_description: 'Xe rung khi tang ga, sen chungkin.'
        },
        vehicle: {
          brand: 'Honda',
          model: 'Wave Alpha',
          license_plate: '60C1-551.42',
          odometer: 44900
        },
        appointment_date: tomorrow,
        start_time: '13:30',
        end_time: '14:30',
        status: 'CONFIRMED',
        customer_note: 'Khach bao xe bi rung khi tang ga.',
        staff_notes: ''
      },
      {
        appointment_code: `STAFFTEST-${yesterday}-DONE-01`,
        customer_id: customers[1]._id,
        staff_id: staff._id,
        service_id: services[1]._id,
        service: {
          type: 'MAINTENANCE',
          name: 'Bao duong nhanh',
          description: services[1].description,
          estimated_price: 150000,
          estimated_duration_minutes: 45,
          issue_description: 'Bao duong dinh ky.'
        },
        vehicle: {
          brand: 'Yamaha',
          model: 'Janus',
          license_plate: '62B1-808.66',
          odometer: 20450
        },
        appointment_date: yesterday,
        start_time: '15:00',
        end_time: '15:45',
        status: 'COMPLETED',
        completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        actual_duration: 43,
        customer_note: 'Bao duong nhanh truoc khi di xa.',
        staff_notes: 'Da thay nhot va kiem tra phanh.'
      }
    ];

    await Promise.all(appointments.map(upsertAppointment));

    const checkInAt = new Date(`${today}T07:45:00+07:00`);
    const checkOutAt = new Date(`${yesterday}T17:20:00+07:00`);
    const yesterdayCheckIn = new Date(`${yesterday}T07:50:00+07:00`);
    await Promise.all([
      ensureAttendance(staff._id, today, {
        staff_id: staff._id,
        work_date: today,
        check_in_time: checkInAt,
        status: 'CHECKED_IN'
      }),
      ensureAttendance(staff._id, yesterday, {
        staff_id: staff._id,
        work_date: yesterday,
        check_in_time: yesterdayCheckIn,
        check_out_time: checkOutAt,
        total_hours: Number(((checkOutAt.getTime() - yesterdayCheckIn.getTime()) / 3600000).toFixed(2)),
        status: 'CHECKED_OUT'
      })
    ]);

    console.log('Seed staff test data completed.');
    console.log(`Staff login: ${STAFF_EMAIL} / ${STAFF_PASSWORD}`);
    console.log(`Appointments upserted: ${appointments.length}`);
    console.log(`Inventory items upserted: ${inventoryItems.length}`);
    console.log('Attendance records upserted: 2');
  } catch (error) {
    console.error('Seed staff test data failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seedStaffTestData();
