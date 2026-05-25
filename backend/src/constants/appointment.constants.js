const SERVICE_TYPES = ['WASH', 'MAINTENANCE', 'REPAIR'];

const TIME_SLOTS = ['08:00', '09:30', '10:30', '13:30', '15:00', '16:30', '18:00'];

const SERVICE_PACKAGES = {
  WASH: {
    'wash-basic': {
      name: 'Basic wash',
      description: 'Body wash, wheel wash, and quick dry.',
      estimated_price: 40000,
      estimated_duration_minutes: 25
    },
    'wash-premium': {
      name: 'Premium wash',
      description: 'Foam wash, wheel cleaning, and plastic care.',
      estimated_price: 80000,
      estimated_duration_minutes: 45
    },
    'engine-clean': {
      name: 'Engine cleaning',
      description: 'Engine area cleaning and basic leak inspection.',
      estimated_price: 120000,
      estimated_duration_minutes: 60
    }
  },
  MAINTENANCE: {
    'maintenance-basic': {
      name: 'Basic maintenance',
      description: 'Oil, brake, tire, light, and bolt inspection.',
      estimated_price: 150000,
      estimated_duration_minutes: 45
    },
    'maintenance-periodic': {
      name: 'Periodic maintenance',
      description: 'General inspection, air filter cleaning, and brake adjustment.',
      estimated_price: 280000,
      estimated_duration_minutes: 75
    },
    'maintenance-full': {
      name: 'Full maintenance',
      description: 'Deep maintenance package for long-running motorcycles.',
      estimated_price: 450000,
      estimated_duration_minutes: 120
    }
  }
};

const APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'PAID',
  'CANCELLED',
  'REJECTED'
];

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
const CUSTOMER_CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];
const DEFAULT_TIMEZONE_OFFSET = '+07:00';
const MAX_ADVANCE_BOOKING_DAYS = 60;

const getServicePackage = (serviceType, packageId) => {
  if (!serviceType || !packageId) {
    return null;
  }

  return SERVICE_PACKAGES[serviceType]?.[packageId] || null;
};

module.exports = {
  SERVICE_TYPES,
  TIME_SLOTS,
  SERVICE_PACKAGES,
  APPOINTMENT_STATUSES,
  ACTIVE_APPOINTMENT_STATUSES,
  CUSTOMER_CANCELLABLE_STATUSES,
  DEFAULT_TIMEZONE_OFFSET,
  MAX_ADVANCE_BOOKING_DAYS,
  getServicePackage
};
