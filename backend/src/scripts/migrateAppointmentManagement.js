require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const RepairBay = require('../models/RepairBay.model');
const User = require('../models/User.model');
const UserRole = require('../models/UserRole.model');
const Role = require('../models/Role.model');

const repairBays = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(3, '0');
  return {
    name: `Ke sua ${String(index + 1).padStart(2, '0')}`,
    code: `BAY_${number}`,
    status: 'AVAILABLE',
    capacity: 1,
    equipment: index % 3 === 0
      ? ['Ban nang xe may', 'May doc loi Fi', 'Bo dung cu dien']
      : index % 3 === 1
        ? ['Ban nang xe may', 'May nen khi', 'Dung cu phanh']
        : ['Ban nang xe may', 'Dung cu bao duong', 'May rua chi tiet'],
    location: `Khu sua chua ${index < 5 ? 'A' : 'B'}`,
    hourly_rate: index < 5 ? 90000 : 110000,
    is_active: true
  };
});

const technicians = [
  {
    email: 'staff1@example.com',
    password_hash: 'Staff@123',
    full_name: 'Nguyen Van A',
    phone: '0902234567',
    specialization: 'Dong co va bao duong tong quat'
  },
  {
    email: 'staff.engine@motocore.vn',
    password_hash: 'Staff@123',
    full_name: 'Tran Minh Duc',
    phone: '0903345678',
    specialization: 'Sua chua dong co'
  },
  {
    email: 'staff.electric@motocore.vn',
    password_hash: 'Staff@123',
    full_name: 'Le Quang Huy',
    phone: '0904456789',
    specialization: 'He thong dien va Fi'
  },
  {
    email: 'staff.brake@motocore.vn',
    password_hash: 'Staff@123',
    full_name: 'Pham Anh Tuan',
    phone: '0905567890',
    specialization: 'Phanh, phuoc va lop'
  },
  {
    email: 'staff.maintenance@motocore.vn',
    password_hash: 'Staff@123',
    full_name: 'Vo Thanh Nam',
    phone: '0906678901',
    specialization: 'Bao duong dinh ky'
  }
];

const specializations = [
  'Engine',
  'Electrical',
  'General Maintenance',
  'Suspension',
  'Brakes',
  'Fuel Injection'
];

async function seedRepairBays() {
  for (const bay of repairBays) {
    await RepairBay.findOneAndUpdate(
      { code: bay.code },
      { $set: bay },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
}

async function ensureStaffRole() {
  return Role.findOneAndUpdate(
    { role_name: 'STAFF' },
    {
      $setOnInsert: {
        role_name: 'STAFF',
        description: 'Shop staff member',
        permissions: [
          'view_appointments',
          'update_appointment_status',
          'view_services',
          'view_inventory',
          'create_job_cards'
        ],
        is_active: true
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seedTechnicians() {
  const staffRole = await ensureStaffRole();

  for (const technician of technicians) {
    let user = await User.findOne({ email: technician.email }).select('+password_hash');

    if (!user) {
      user = await User.create({
        email: technician.email,
        password_hash: technician.password_hash,
        full_name: technician.full_name,
        phone: technician.phone,
        specialization: technician.specialization,
        verified: true,
        is_active: true
      });
    } else {
      user.full_name = technician.full_name;
      user.phone = technician.phone;
      user.specialization = technician.specialization;
      user.verified = true;
      user.is_active = true;

      if (!String(user.password_hash || '').startsWith('$2')) {
        user.password_hash = technician.password_hash;
        user.markModified('password_hash');
      }

      await user.save();
    }

    await UserRole.updateOne(
      { user_id: user._id, role_id: staffRole._id },
      { $setOnInsert: { user_id: user._id, role_id: staffRole._id } },
      { upsert: true }
    );
  }
}

async function seedTechnicianSpecializations() {
  const staffRole = await Role.findOne({ role_name: 'STAFF' });
  if (!staffRole) return;

  const userRoles = await UserRole.find({ role_id: staffRole._id }).select('user_id');
  const staffIds = userRoles.map((item) => item.user_id);
  const technicians = await User.find({ _id: { $in: staffIds }, is_active: true }).sort({ created_at: 1 });

  for (let index = 0; index < technicians.length; index += 1) {
    const technician = technicians[index];
    if (!technician.specialization) {
      technician.specialization = specializations[index % specializations.length];
      await technician.save();
    }
  }
}

async function run() {
  await connectDB();
  await seedRepairBays();
  await seedTechnicians();
  await seedTechnicianSpecializations();

  const bayCount = await RepairBay.countDocuments();
  const staffRole = await Role.findOne({ role_name: 'STAFF' });
  const staffCount = staffRole
    ? await UserRole.countDocuments({ role_id: staffRole._id })
    : 0;
  console.log(`Appointment management migration completed. Repair bays: ${bayCount}. Staff users: ${staffCount}`);
  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error('Appointment management migration failed:', error);
  await mongoose.connection.close();
  process.exit(1);
});
