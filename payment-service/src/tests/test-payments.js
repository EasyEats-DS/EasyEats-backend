const axios = require('axios');

const API_URL = 'http://localhost:5001';

const testAllPaymentEndpoints = async () => {
  try {
    // Generate unique order ID
    const orderId = `test-order-${Date.now()}`;
    console.log('\n1. Testing create payment intent...');
    const createPaymentData = {
      orderId,
      userId: 'test-user-123',
      amount: 2999,
      currency: 'usd'
    };
    console.log('Creating payment intent with data:', createPaymentData);
    
    const createResponse = await axios.post(
      `${API_URL}/payments/create-payment-intent`,
      createPaymentData
    );
    console.log('Create Payment Response:', createResponse.data);

    // Store payment details
    const { paymentIntentId } = createResponse.data;
    console.log('\nPayment Intent Created:', paymentIntentId);

    // Test get payment by order ID
    console.log('\n2. Testing get payment by order ID...');
    const getPaymentResponse = await axios.get(`${API_URL}/payments/order/${orderId}`);
    console.log('Get Payment Response:', getPaymentResponse.data);

    // Note about confirmation
    console.log('\n3. Payment Confirmation Note:');
    console.log('Payment confirmation requires a payment method attachment.');
    console.log('In a real application, this would be handled by:');
    console.log('1. Frontend collecting card details via Stripe Elements');
    console.log('2. Attaching payment method to the intent');
    console.log('3. Then calling the confirm endpoint');

    // Test refund endpoint
    console.log('\n4. Testing refund endpoint...');
    console.log('Note: Refund can only be processed for completed payments');
    try {
      const refundResponse = await axios.post(`${API_URL}/payments/refund`, {
        paymentIntentId,
        reason: 'customer_requested'
      });
      console.log('Refund Response:', refundResponse.data);
    } catch (refundError) {
      console.log('Expected refund error (payment not completed):', 
        refundError.response?.data?.message || refundError.message);
    }

  } catch (error) {
    console.error('\nError Details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

console.log('Starting comprehensive payment service tests...');
testAllPaymentEndpoints();