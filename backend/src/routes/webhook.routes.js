const express = require('express');
const Appointment = require('../models/Appointment.model');
const payosService = require('../services/payos.service');

const router = express.Router();

router.post('/payos', async (req, res) => {
  try {
    if (!await payosService.verifyWebhookSignature(req.body)) {
      return res.status(400).json({ success: false, message: 'Invalid PayOS webhook signature' });
    }

    const data = await payosService.getVerifiedWebhookData(req.body);
    const orderCode = String(data.orderCode);
    const appointment = await Appointment.findOne({ 'payment_info.order_code': orderCode });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment payment was not found' });
    }

    const paid = String(data.code || '').toUpperCase() === '00' || String(req.body.code || '') === '00';
    if (paid && appointment.payment_info.status !== 'PAID') {
      const paidAt = data.transactionDateTime ? new Date(data.transactionDateTime) : new Date();
      const safePaidAt = Number.isNaN(paidAt.getTime()) ? new Date() : paidAt;
      appointment.payment_info.status = 'PAID';
      appointment.payment_info.paid_at = safePaidAt;
      appointment.payment_info.amount = Number(data.amount || appointment.payment_info.amount || 0);
      appointment.payment_info.method = 'PAYOS';
      appointment.final_cost = appointment.payment_info.amount;
      appointment.status = 'COMPLETED';
      appointment.completed_at = appointment.completed_at || safePaidAt;
      appointment.actual_end_time = appointment.actual_end_time || safePaidAt;
      await appointment.save();
    }

    return res.status(200).json({ success: true, message: 'PayOS webhook received' });
  } catch (error) {
    console.error('PayOS webhook error:', error);
    return res.status(500).json({ success: false, message: 'Unable to process PayOS webhook' });
  }
});

module.exports = router;
