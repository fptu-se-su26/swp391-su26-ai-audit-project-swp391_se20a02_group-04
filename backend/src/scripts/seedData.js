require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const UserRole = require('../models/UserRole.model');
const Service = require('../models/Service.model');
const Appointment = require('../models/Appointment.model');
const InventoryItem = require('../models/InventoryItem.model');
const InventoryTransaction = require('../models/InventoryTransaction.model');

const seedData = async () => {
  try {
    console.log('🌱 Starting seed process...');

    // Connect to database
    await connectDB();

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Appointment.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      InventoryItem.deleteMany({}),
      Service.deleteMany({})
      // Don't delete users and roles as they might be needed
    ]);

    // Get roles
    const adminRole = await Role.findOne({ role_name: 'ADMIN' });
    const staffRole = await Role.findOne({ role_name: 'STAFF' });
    const customerRole = await Role.findOne({ role_name: 'CUSTOMER' });

    if (!adminRole || !staffRole || !customerRole) {
      console.error('❌ Roles not found. Please run seedRoles.js first!');
      process.exit(1);
    }

    // Create test users if they don't exist
    console.log('👥 Creating test users...');
    
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@example.com',
        password_hash: 'Admin@123',
        full_name: 'Admin User',
        phone: '0901234567',
        verified: true,
        is_active: true
      });
      await UserRole.create({ user_id: adminUser._id, role_id: adminRole._id });
      console.log('✅ Admin user created');
    }

    let staffUser1 = await User.findOne({ email: 'staff1@example.com' });
    if (!staffUser1) {
      staffUser1 = await User.create({
        email: 'staff1@example.com',
        password_hash: 'Staff@123',
        full_name: 'Nguyen Van A',
        phone: '0902234567',
        verified: true,
        is_active: true
      });
      await UserRole.create({ user_id: staffUser1._id, role_id: staffRole._id });
      console.log('✅ Staff 1 created');
    }

    let staffUser2 = await User.findOne({ email: 'staff2@example.com' });
    if (!staffUser2) {
      staffUser2 = await User.create({
        email: 'staff2@example.com',
        password_hash: 'Staff@123',
        full_name: 'Tran Van B',
        phone: '0903234567',
        verified: true,
        is_active: true
      });
      await UserRole.create({ user_id: staffUser2._id, role_id: staffRole._id });
      console.log('✅ Staff 2 created');
    }

    let customerUser1 = await User.findOne({ email: 'customer1@example.com' });
    if (!customerUser1) {
      customerUser1 = await User.create({
        email: 'customer1@example.com',
        password_hash: 'Customer@123',
        full_name: 'Le Thi C',
        phone: '0904234567',
        verified: true,
        is_active: true
      });
      await UserRole.create({ user_id: customerUser1._id, role_id: customerRole._id });
      console.log('✅ Customer 1 created');
    }

    let customerUser2 = await User.findOne({ email: 'customer2@example.com' });
    if (!customerUser2) {
      customerUser2 = await User.create({
        email: 'customer2@example.com',
        password_hash: 'Customer@123',
        full_name: 'Pham Van D',
        phone: '0905234567',
        verified: true,
        is_active: true
      });
      await UserRole.create({ user_id: customerUser2._id, role_id: customerRole._id });
      console.log('✅ Customer 2 created');
    }

    // Create services
    console.log('🔧 Creating services...');
    const services = await Service.insertMany([
      {
        service_name: 'Thay dầu động cơ',
        description: 'Thay dầu động cơ tổng hợp cao cấp cho xe máy',
        category: 'MAINTENANCE',
        base_price: 150000,
        estimated_duration: 30,
        is_active: true,
        total_bookings: 50
      },
      {
        service_name: 'Thay má phanh',
        description: 'Thay má phanh trước và sau, kiểm tra hệ thống phanh',
        category: 'REPAIR',
        base_price: 200000,
        estimated_duration: 45,
        is_active: true,
        total_bookings: 30
      },
      {
        service_name: 'Bảo dưỡng định kỳ',
        description: 'Bảo dưỡng toàn diện: thay dầu, lọc gió, bugi, kiểm tra hệ thống',
        category: 'MAINTENANCE',
        base_price: 300000,
        estimated_duration: 60,
        is_active: true,
        total_bookings: 80
      },
      {
        service_name: 'Sửa chữa động cơ',
        description: 'Kiểm tra và sửa chữa các vấn đề về động cơ',
        category: 'REPAIR',
        base_price: 500000,
        estimated_duration: 120,
        is_active: true,
        total_bookings: 20
      },
      {
        service_name: 'Kiểm tra tổng quát',
        description: 'Kiểm tra toàn bộ xe, chẩn đoán sự cố',
        category: 'INSPECTION',
        base_price: 100000,
        estimated_duration: 30,
        is_active: true,
        total_bookings: 40
      },
      {
        service_name: 'Độ xe',
        description: 'Độ pô, độ đèn, độ yên xe theo yêu cầu',
        category: 'CUSTOMIZATION',
        base_price: 800000,
        estimated_duration: 180,
        is_active: true,
        total_bookings: 10
      }
    ]);
    console.log(`✅ Created ${services.length} services`);

    // Create appointments
    console.log('📅 Creating appointments...');
    const today = new Date();
    const appointments = [];

    // Past appointments (completed)
    for (let i = 1; i <= 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      appointments.push({
        customer_id: i % 2 === 0 ? customerUser1._id : customerUser2._id,
        staff_id: i % 2 === 0 ? staffUser1._id : staffUser2._id,
        service_id: services[i % services.length]._id,
        appointment_date: date,
        start_time: '09:00',
        end_time: '10:00',
        status: 'COMPLETED',
        vehicle_info: {
          brand: 'Honda',
          model: 'Wave',
          year: 2020 + (i % 4),
          license_plate: `29A-${10000 + i}`
        },
        customer_notes: 'Xe có tiếng kêu bất thường',
        staff_notes: 'Đã kiểm tra và sửa chữa xong',
        completed_at: date
      });
    }

    // Upcoming appointments
    for (let i = 1; i <= 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      appointments.push({
        customer_id: i % 2 === 0 ? customerUser1._id : customerUser2._id,
        staff_id: i % 2 === 0 ? staffUser1._id : null,
        service_id: services[i % services.length]._id,
        appointment_date: date,
        start_time: `${9 + (i % 4)}:00`,
        status: i % 2 === 0 ? 'CONFIRMED' : 'PENDING',
        vehicle_info: {
          brand: i % 2 === 0 ? 'Yamaha' : 'Honda',
          model: i % 2 === 0 ? 'Exciter' : 'Air Blade',
          year: 2021 + (i % 3),
          license_plate: `29B-${20000 + i}`
        },
        customer_notes: 'Cần bảo dưỡng định kỳ'
      });
    }

    // Today's appointments
    appointments.push({
      customer_id: customerUser1._id,
      staff_id: staffUser1._id,
      service_id: services[0]._id,
      appointment_date: today,
      start_time: '10:00',
      status: 'IN_PROGRESS',
      vehicle_info: {
        brand: 'Honda',
        model: 'SH',
        year: 2023,
        license_plate: '29C-12345'
      },
      customer_notes: 'Khách VIP, ưu tiên phục vụ'
    });

    await Appointment.insertMany(appointments);
    console.log(`✅ Created ${appointments.length} appointments`);

    // Create inventory items
    console.log('📦 Creating inventory items...');
    const inventoryItems = await InventoryItem.insertMany([
      {
        item_name: 'Dầu động cơ 10W-40',
        item_code: 'OIL-10W40',
        description: 'Dầu động cơ tổng hợp cho xe máy',
        category: 'CONSUMABLES',
        unit: 'lít',
        unit_price: 80000,
        cost_price: 60000,
        quantity: 50,
        min_stock_level: 20,
        max_stock_level: 200,
        reorder_point: 30,
        supplier_name: 'Công ty Dầu nhớt ABC',
        supplier_contact: '0901111111',
        location: { warehouse: 'Kho chính', shelf: 'A1', bin: 'B1' },
        is_active: true
      },
      {
        item_name: 'Má phanh trước',
        item_code: 'BP-FRONT',
        description: 'Má phanh trước cho xe Honda Wave',
        category: 'SPARE_PARTS',
        unit: 'bộ',
        unit_price: 150000,
        cost_price: 100000,
        quantity: 15,
        min_stock_level: 10,
        max_stock_level: 100,
        reorder_point: 20,
        supplier_name: 'Phụ tùng XYZ',
        supplier_contact: '0902222222',
        location: { warehouse: 'Kho chính', shelf: 'B2', bin: 'C3' },
        is_active: true
      },
      {
        item_name: 'Má phanh sau',
        item_code: 'BP-REAR',
        description: 'Má phanh sau cho xe Honda Wave',
        category: 'SPARE_PARTS',
        unit: 'bộ',
        unit_price: 120000,
        cost_price: 80000,
        quantity: 8,
        min_stock_level: 10,
        max_stock_level: 100,
        reorder_point: 15,
        supplier_name: 'Phụ tùng XYZ',
        supplier_contact: '0902222222',
        location: { warehouse: 'Kho chính', shelf: 'B2', bin: 'C4' },
        is_active: true
      },
      {
        item_name: 'Lọc gió',
        item_code: 'AF-001',
        description: 'Lọc gió cho xe máy các loại',
        category: 'SPARE_PARTS',
        unit: 'cái',
        unit_price: 50000,
        cost_price: 30000,
        quantity: 100,
        min_stock_level: 30,
        max_stock_level: 300,
        reorder_point: 50,
        supplier_name: 'Phụ tùng XYZ',
        supplier_contact: '0902222222',
        location: { warehouse: 'Kho chính', shelf: 'C1', bin: 'D1' },
        is_active: true
      },
      {
        item_name: 'Bugi NGK',
        item_code: 'SP-NGK',
        description: 'Bugi NGK chính hãng',
        category: 'SPARE_PARTS',
        unit: 'cái',
        unit_price: 40000,
        cost_price: 25000,
        quantity: 80,
        min_stock_level: 20,
        max_stock_level: 200,
        reorder_point: 40,
        supplier_name: 'Phụ tùng XYZ',
        supplier_contact: '0902222222',
        location: { warehouse: 'Kho chính', shelf: 'C2', bin: 'D2' },
        is_active: true
      },
      {
        item_name: 'Nhớt phanh',
        item_code: 'BF-001',
        description: 'Dầu phanh DOT 4',
        category: 'CONSUMABLES',
        unit: 'chai',
        unit_price: 60000,
        cost_price: 40000,
        quantity: 5,
        min_stock_level: 10,
        max_stock_level: 50,
        reorder_point: 15,
        supplier_name: 'Công ty Dầu nhớt ABC',
        supplier_contact: '0901111111',
        location: { warehouse: 'Kho chính', shelf: 'A2', bin: 'B2' },
        is_active: true
      },
      {
        item_name: 'Bộ dụng cụ sửa chữa',
        item_code: 'TOOL-SET-01',
        description: 'Bộ dụng cụ sửa chữa cơ bản',
        category: 'TOOLS',
        unit: 'bộ',
        unit_price: 500000,
        cost_price: 350000,
        quantity: 10,
        min_stock_level: 5,
        max_stock_level: 20,
        reorder_point: 8,
        supplier_name: 'Công cụ DEF',
        supplier_contact: '0903333333',
        location: { warehouse: 'Kho chính', shelf: 'D1', bin: 'E1' },
        is_active: true
      },
      {
        item_name: 'Dây curoa',
        item_code: 'BELT-001',
        description: 'Dây curoa cho xe tay ga',
        category: 'SPARE_PARTS',
        unit: 'cái',
        unit_price: 180000,
        cost_price: 120000,
        quantity: 25,
        min_stock_level: 15,
        max_stock_level: 80,
        reorder_point: 25,
        supplier_name: 'Phụ tùng XYZ',
        supplier_contact: '0902222222',
        location: { warehouse: 'Kho chính', shelf: 'B3', bin: 'C5' },
        is_active: true
      }
    ]);
    console.log(`✅ Created ${inventoryItems.length} inventory items`);

    // Create inventory transactions for initial stock
    console.log('📝 Creating inventory transactions...');
    const transactions = inventoryItems.map(item => ({
      inventory_item_id: item._id,
      transaction_type: 'STOCK_IN',
      quantity_change: item.quantity,
      quantity_before: 0,
      quantity_after: item.quantity,
      unit_cost: item.cost_price,
      performed_by: adminUser._id,
      notes: 'Nhập kho ban đầu',
      reference_type: 'MANUAL'
    }));

    await InventoryTransaction.insertMany(transactions);
    console.log(`✅ Created ${transactions.length} inventory transactions`);

    console.log('\n✨ Seed data completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Admin:');
    console.log('   Email: admin@example.com');
    console.log('   Password: Admin@123');
    console.log('\n👤 Staff 1:');
    console.log('   Email: staff1@example.com');
    console.log('   Password: Staff@123');
    console.log('\n👤 Staff 2:');
    console.log('   Email: staff2@example.com');
    console.log('   Password: Staff@123');
    console.log('\n👤 Customer 1:');
    console.log('   Email: customer1@example.com');
    console.log('   Password: Customer@123');
    console.log('\n👤 Customer 2:');
    console.log('   Email: customer2@example.com');
    console.log('   Password: Customer@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

// Run seed
seedData();
