const mongoose = require('mongoose');
const Appointment = require('../models/Appointment.model');
const StaffAttendance = require('../models/StaffAttendance.model');
const UserAudit = require('../models/UserAudit.model');

describe('staff model validation', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('appointment accepts custom start_time without forcing invalid time_slot', async () => {
    const appointment = new Appointment({
      customer_id: new mongoose.Types.ObjectId(),
      staff_id: new mongoose.Types.ObjectId(),
      appointment_date: '2026-06-10',
      start_time: '10:15',
      status: 'IN_PROGRESS'
    });

    await expect(appointment.validate()).resolves.toBeUndefined();
    expect(appointment.time_slot).toBeUndefined();
  });

  test('staff attendance rejects invalid work_date format', () => {
    const attendance = new StaffAttendance({
      staff_id: new mongoose.Types.ObjectId(),
      work_date: '10/06/2026',
      check_in_time: new Date()
    });

    const error = attendance.validateSync();
    expect(error.errors.work_date).toBeDefined();
  });

  test('checkOut calculates total hours and status', () => {
    const checkIn = new Date('2026-06-10T08:00:00.000Z');
    const checkOut = new Date('2026-06-10T11:30:00.000Z');
    const attendance = new StaffAttendance({
      staff_id: new mongoose.Types.ObjectId(),
      work_date: '2026-06-10',
      check_in_time: checkIn
    });

    attendance.checkOut(checkOut);

    expect(attendance.status).toBe('CHECKED_OUT');
    expect(attendance.total_hours).toBe(3.5);
    expect(attendance.check_out_time).toEqual(checkOut);
  });

  test('new staff audit actions are valid', () => {
    const audit = new UserAudit({
      user_id: new mongoose.Types.ObjectId(),
      action: 'STAFF_MATERIALS_USED',
      status: 'SUCCESS'
    });

    expect(audit.validateSync()).toBeUndefined();
  });
});
