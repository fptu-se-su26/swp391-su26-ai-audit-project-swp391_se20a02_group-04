require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/Role.model');

const roles = [
  {
    role_name: 'ADMIN',
    description: 'System administrator with full access',
    permissions: [
      'manage_users',
      'manage_roles',
      'manage_services',
      'manage_appointments',
      'manage_inventory',
      'view_reports',
      'manage_system_settings'
    ],
    is_active: true
  },
  {
    role_name: 'MANAGER',
    description: 'Shop manager with operational access',
    permissions: [
      'manage_staff',
      'manage_services',
      'manage_appointments',
      'manage_inventory',
      'view_reports',
      'approve_appointments'
    ],
    is_active: true
  },
  {
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
  },
  {
    role_name: 'CUSTOMER',
    description: 'Regular customer',
    permissions: [
      'create_appointment',
      'view_own_appointments',
      'cancel_own_appointment',
      'manage_own_vehicles',
      'create_review',
      'view_services'
    ],
    is_active: true
  }
];

const seedRoles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    // Clear existing roles
    await Role.deleteMany({});
    console.log('🗑️  Cleared existing roles');

    // Insert new roles
    const createdRoles = await Role.insertMany(roles);
    console.log(`✅ Created ${createdRoles.length} roles:`);
    createdRoles.forEach(role => {
      console.log(`   - ${role.role_name}: ${role.description}`);
    });

    console.log('\n🎉 Roles seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    process.exit(1);
  }
};

seedRoles();
