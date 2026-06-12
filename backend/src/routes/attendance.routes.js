const express = require('express');
const staffAttendanceController = require('../controllers/staff.attendance.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate, authorize('STAFF'));

router.get('/today', staffAttendanceController.getTodayAttendance);
router.post('/check-in', staffAttendanceController.checkIn);
router.post('/check-out', staffAttendanceController.checkOut);

module.exports = router;
