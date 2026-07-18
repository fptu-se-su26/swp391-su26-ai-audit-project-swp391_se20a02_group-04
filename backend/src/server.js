require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const serviceRoutes = require('./routes/service.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const staffAppointmentRoutes = require('./routes/staff.appointment.routes');
const staffInventoryRoutes = require('./routes/staff.inventory.routes');
const staffAttendanceRoutes = require('./routes/staff.attendance.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const adminUserRoutes = require('./routes/admin.user.routes');
const adminAppointmentRoutes = require('./routes/admin.appointment.routes');
const adminInventoryRoutes = require('./routes/admin.inventory.routes');
const adminServiceRoutes = require('./routes/admin.service.routes');
const managerStaffRoutes = require('./routes/manager.staff.routes');
const managerAppointmentRoutes = require('./routes/manager.appointment.routes');
const notificationRoutes = require('./routes/notification.routes');
const chatRoutes = require('./routes/chat.routes');
const adminChatRoutes = require('./routes/admin.chat.routes');

const app = express();

// Connect to MongoDB
connectDB();

const configuredCorsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const devCorsPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (configuredCorsOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && devCorsPattern.test(origin))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/staff', staffAppointmentRoutes);
app.use('/api/staff', staffInventoryRoutes);
app.use('/api/staff', staffAttendanceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin', adminAppointmentRoutes);
app.use('/api/admin', adminInventoryRoutes);
app.use('/api/admin', adminServiceRoutes);
app.use('/api/manager', managerStaffRoutes);
app.use('/api/manager', managerAppointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminChatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the running backend process before starting a new one.`);
    process.exit(1);
  }

  console.error('Server failed to start:', error);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
});

module.exports = app;
