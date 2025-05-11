const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (amount, currency = 'usd') => {
  try {
    // Stripe expects amounts in cents/smallest currency unit
    // Convert the amount to cents only here, not in the controller
    const stripeAmount = Math.round(amount * 100);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency,
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

const confirmPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};

const createRefund = async (paymentIntentId) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  createRefund
};