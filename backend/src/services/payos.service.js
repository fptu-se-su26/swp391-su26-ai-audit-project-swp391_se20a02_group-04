const { PayOS } = require('@payos/node');

let client = null;
let configurationWarningLogged = false;

const PAYMENT_STATUS = {
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING'
};

const hasConfiguration = () => Boolean(
  process.env.PAYOS_CLIENT_ID
  && process.env.PAYOS_API_KEY
  && process.env.PAYOS_CHECKSUM_KEY
);

const getClient = () => {
  if (!hasConfiguration()) {
    if (!configurationWarningLogged) {
      console.warn('PayOS is not configured. Set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY to enable payments.');
      configurationWarningLogged = true;
    }
    const error = new Error('PayOS payment service is not configured');
    error.code = 'PAYOS_NOT_CONFIGURED';
    throw error;
  }

  if (!client) {
    client = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY
    });
  }

  return client;
};

const normalizeStatus = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAID') return PAYMENT_STATUS.PAID;
  if (['CANCELLED', 'EXPIRED', 'FAILED', 'UNDERPAID'].includes(normalized)) {
    return PAYMENT_STATUS.CANCELLED;
  }
  return PAYMENT_STATUS.PENDING;
};

const toPaidAt = (paymentLink) => {
  const transactions = paymentLink?.transactions || [];
  const transaction = transactions[transactions.length - 1];
  if (!transaction?.transactionDateTime) return null;

  const parsed = new Date(transaction.transactionDateTime);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

async function createPaymentLink(orderCode, amount, description, returnUrl, cancelUrl) {
  const numericOrderCode = Number(orderCode);
  if (!Number.isSafeInteger(numericOrderCode) || numericOrderCode <= 0) {
    throw new Error('PayOS order code must be a positive safe integer');
  }

  const paymentLink = await getClient().paymentRequests.create({
    orderCode: numericOrderCode,
    amount: Math.round(Number(amount)),
    description: String(description).slice(0, 25),
    returnUrl,
    cancelUrl
  });

  return {
    payment_url: paymentLink.checkoutUrl,
    qr_code: paymentLink.qrCode
  };
}

async function getPaymentStatus(orderCode) {
  const paymentLink = await getClient().paymentRequests.get(Number(orderCode));
  return {
    status: normalizeStatus(paymentLink.status),
    paid_at: normalizeStatus(paymentLink.status) === PAYMENT_STATUS.PAID ? toPaidAt(paymentLink) : null,
    amount: Number(paymentLink.amount || 0)
  };
}

async function getVerifiedWebhookData(webhookData) {
  return getClient().webhooks.verify(webhookData);
}

async function verifyWebhookSignature(webhookData) {
  try {
    await getVerifiedWebhookData(webhookData);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  createPaymentLink,
  getPaymentStatus,
  getVerifiedWebhookData,
  verifyWebhookSignature
};
