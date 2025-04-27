const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5004';

async function testNotificationService() {
  console.log('Starting notification service tests...\n');

  const testData = {
    orderId: `TEST-${Date.now()}`,
    userId: 'test-user-123',
    customerEmail: process.env.TEST_EMAIL || 'test@example.com',
    customerPhone: process.env.TEST_PHONE || '+1234567890',
    orderDetails: {
      items: [{ name: 'Test Item', quantity: 1, price: 10.99 }],
      totalAmount: 10.99,
      estimatedDeliveryTime: '30 minutes'
    }
  };

  try {
    // Test 1: Order confirmation notification
    console.log('1. Testing order confirmation notifications...');
    try {
      const response = await axios.post(
        `${API_URL}/notifications/order-confirmation`,
        testData
      );
      console.log('Success:', response.data);
    } catch (error) {
      console.error('Error Details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
    }

    // Test 2: Delivery status notification
    console.log('\n2. Testing delivery status notifications...');
    try {
      const response = await axios.post(
        `${API_URL}/notifications/delivery-update`,
        {
          ...testData,
          status: 'OUT_FOR_DELIVERY',
          estimatedArrival: '15 minutes'
        }
      );
      console.log('Success:', response.data);
    } catch (error) {
      console.error('Error Details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
    }

    // Test 3: Get notification history
    console.log('\n3. Testing notification history...');
    try {
      const response = await axios.get(
        `${API_URL}/notifications/history/${testData.orderId}`
      );
      console.log('Success:', response.data);
    } catch (error) {
      console.error('Error Details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
    }

  } catch (error) {
    console.error('Test suite error:', error.message);
  }
}

testNotificationService();