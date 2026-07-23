const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send OTP verification email
 * @param {String} email - Recipient email
 * @param {String} name - Recipient name
 * @param {String} otp - 6-digit OTP code
 */
const sendVerificationOTP = async (email, name, otp) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Email Verification OTP - Motorcycle Repair Booking',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp-box { background: white; border: 2px dashed #4CAF50; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏍️ Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${name || 'there'}!</h2>
            <p>Thank you for registering with Motorcycle Repair Booking System.</p>
            <p>Please use the following OTP code to verify your email address:</p>
            
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Valid for 10 minutes</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 5px 0;">
                <li>This OTP will expire in <strong>10 minutes</strong></li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
            
            <p style="margin-top: 20px;">Enter this code on the verification page to complete your registration.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Motorcycle Repair Booking. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

/**
 * Send email verification (old method - kept for backward compatibility)
 * @param {String} email - Recipient email
 * @param {String} name - Recipient name
 * @param {String} token - Verification token
 */
const sendVerificationEmail = async (email, name, token) => {
  const transporter = createTransporter();
  
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email - Motorcycle Repair Booking',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏍️ Motorcycle Repair Booking</h1>
          </div>
          <div class="content">
            <h2>Hello ${name || 'there'}!</h2>
            <p>Thank you for registering with Motorcycle Repair Booking System.</p>
            <p>Please verify your email address by clicking the button below:</p>
            <center>
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Motorcycle Repair Booking. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send password reset email
 * @param {String} email - Recipient email
 * @param {String} name - Recipient name
 * @param {String} token - Reset token
 */
const sendPasswordResetEmail = async (email, name, token) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Password Reset Request - Motorcycle Repair Booking',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF5722; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #FF5722; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${name || 'there'}!</h2>
            <p>We received a request to reset your password for your Motorcycle Repair Booking account.</p>
            <p>Click the button below to reset your password:</p>
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Motorcycle Repair Booking. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send welcome email after verification
 * @param {String} email - Recipient email
 * @param {String} name - Recipient name
 */
const sendWelcomeEmail = async (email, name) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Motorcycle Repair Booking! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .features { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Aboard!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Your email has been verified successfully. Welcome to Motorcycle Repair Booking System!</p>
            
            <div class="features">
              <h3>What you can do now:</h3>
              <ul>
                <li>📅 Book appointments for motorcycle repair services</li>
                <li>🏍️ Manage your vehicles</li>
                <li>⭐ Rate and review services</li>
                <li>📊 Track your service history</li>
              </ul>
            </div>
            
            <center>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </center>
            
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Motorcycle Repair Booking. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error for welcome email
    return false;
  }
};

const sendAppointmentConfirmedEmail = async (email, name, appointment = {}) => {
  if (!email) return false;

  const transporter = createTransporter();
  const appointmentCode = appointment.appointment_code || appointment.id || 'lich hen';
  const appointmentDate = appointment.appointment_date || 'ngay hen';
  const appointmentTime = appointment.start_time || appointment.time_slot || '--:--';
  const serviceName = appointment.service_name || appointment.service?.name || appointment.service?.repair_issue || 'Dich vu sua xe';
  const vehicleName = [appointment.vehicle?.brand, appointment.vehicle?.model].filter(Boolean).join(' ') || 'Xe cua quy khach';
  const vehiclePlate = appointment.vehicle?.license_plate || appointment.vehicle_info?.license_plate || 'Chua cap nhat';

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `[MOTOCORE] Lich hen ${appointmentCode} da duoc xac nhan`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #222; background: #f6f7f8; }
          .container { max-width: 640px; margin: 0 auto; padding: 24px; }
          .card { background: #fff; border: 1px solid #ead8cf; border-radius: 12px; overflow: hidden; }
          .header { background: #e4282b; color: #fff; padding: 18px 22px; }
          .content { padding: 22px; }
          .meta { margin: 16px 0; border: 1px solid #ead8cf; border-radius: 10px; overflow: hidden; }
          .row { display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 10px 12px; border-bottom: 1px solid #ead8cf; }
          .row:last-child { border-bottom: 0; }
          .label { color: #6b7280; font-weight: 700; }
          .value { color: #111827; font-weight: 800; }
          .notice { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 14px; margin-top: 16px; }
          .footer { color: #6b7280; font-size: 12px; padding: 16px 22px; border-top: 1px solid #ead8cf; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h2 style="margin:0;">MOTOCORE da xac nhan lich hen</h2>
            </div>
            <div class="content">
              <p>Xin chao ${name || 'quy khach'},</p>
              <p>Lich hen cua quy khach da duoc xac nhan. Nhan vien garage se tiep nhan va thong bao lai cac van de ve xe sau khi kiem tra thuc te.</p>
              <div class="meta">
                <div class="row"><span class="label">Ma lich</span><span class="value">${appointmentCode}</span></div>
                <div class="row"><span class="label">Ngay hen</span><span class="value">${appointmentDate}</span></div>
                <div class="row"><span class="label">Gio hen</span><span class="value">${appointmentTime}</span></div>
                <div class="row"><span class="label">Dich vu</span><span class="value">${serviceName}</span></div>
                <div class="row"><span class="label">Xe</span><span class="value">${vehicleName} - ${vehiclePlate}</span></div>
              </div>
              <div class="notice">
                Sau khi quy khach dua xe den garage, ky thuat vien se kiem tra tinh trang xe, xac nhan hang muc can sua va vat tu can thay the truoc khi tien hanh.
              </div>
            </div>
            <div class="footer">
              Email nay duoc gui tu he thong quan ly garage MOTOCORE.
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Appointment confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending appointment confirmation email:', error);
    return false;
  }
};

/**
 * Reminder email for periodic maintenance (oil change, inspection, etc.)
 */
const sendMaintenanceReminderEmail = async (email, name, payload = {}) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('SMTP is not configured. Skipping maintenance reminder email.');
    return false;
  }

  const transporter = createTransporter();
  const serviceName = payload.service_name || 'bảo dưỡng định kỳ';
  const reminderDays = Number(payload.reminder_days || 0);
  const reminderMileage = Number(payload.reminder_mileage || 0);
  const vehicle = payload.vehicle || {};
  const vehicleLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'xe của quý khách';
  const plate = vehicle.license_plate || 'Chưa cập nhật';
  const bookingUrl = payload.booking_url || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking`;
  const completedDate = payload.completed_date || '';
  const dueDate = payload.due_date || '';

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: `[MOTOCORE] Nhắc bảo dưỡng: ${serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #222; background: #f6f7f8; }
          .container { max-width: 640px; margin: 0 auto; padding: 24px; }
          .card { background: #fff; border: 1px solid #ead8cf; border-radius: 12px; overflow: hidden; }
          .header { background: #e4282b; color: #fff; padding: 18px 22px; }
          .content { padding: 22px; }
          .meta { margin: 16px 0; border: 1px solid #ead8cf; border-radius: 10px; overflow: hidden; }
          .row { display: grid; grid-template-columns: 160px 1fr; gap: 12px; padding: 10px 12px; border-bottom: 1px solid #ead8cf; }
          .row:last-child { border-bottom: 0; }
          .label { color: #6b7280; font-weight: 700; }
          .value { color: #111827; font-weight: 800; }
          .button { display: inline-block; margin-top: 8px; padding: 12px 22px; background: #e4282b; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 800; }
          .notice { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 14px; margin-top: 16px; }
          .footer { color: #6b7280; font-size: 12px; padding: 16px 22px; border-top: 1px solid #ead8cf; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h2 style="margin:0;">Đến hạn bảo dưỡng rồi</h2>
            </div>
            <div class="content">
              <p>Xin chào ${name || 'quý khách'},</p>
              <p>
                Đã khoảng <strong>${reminderDays} ngày</strong> kể từ lần
                <strong>${serviceName}</strong> gần nhất.
                MOTOCORE nhắc quý khách mang xe đến kiểm tra / bảo dưỡng để xe vận hành ổn định.
              </p>
              <div class="meta">
                <div class="row"><span class="label">Dịch vụ</span><span class="value">${serviceName}</span></div>
                <div class="row"><span class="label">Xe</span><span class="value">${vehicleLabel} · ${plate}</span></div>
                ${completedDate ? `<div class="row"><span class="label">Lần làm gần nhất</span><span class="value">${completedDate}</span></div>` : ''}
                ${dueDate ? `<div class="row"><span class="label">Ngày đến hạn nhắc</span><span class="value">${dueDate}</span></div>` : ''}
                ${reminderMileage ? `<div class="row"><span class="label">Gợi ý theo km</span><span class="value">~${reminderMileage.toLocaleString('vi-VN')} km</span></div>` : ''}
              </div>
              <center>
                <a href="${bookingUrl}" class="button">Đặt lịch bảo dưỡng</a>
              </center>
              <div class="notice">
                Đây là nhắc bảo dưỡng theo chu kỳ dịch vụ, không phải quảng cáo sản phẩm.
                Quý khách có thể bỏ qua email nếu xe vừa được bảo dưỡng gần đây.
              </div>
            </div>
            <div class="footer">
              Email được gửi tự động từ hệ thống MOTOCORE.
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Maintenance reminder email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending maintenance reminder email:', error);
    return false;
  }
};

module.exports = {
  sendVerificationOTP,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAppointmentConfirmedEmail,
  sendMaintenanceReminderEmail
};
