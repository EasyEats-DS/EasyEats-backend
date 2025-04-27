require('dotenv').config();
const twilio = require('twilio');

// Validate Twilio credentials
const validateCredentials = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Missing Twilio credentials. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env file');
  }
  return { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER };
};

// Validate phone number format
const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new Error('Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
  }
};

// Initialize Twilio client
let client;
try {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = validateCredentials();
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  console.log('SMS service initialized successfully');
} catch (error) {
  console.error('Failed to initialize SMS service:', error.message);
}

const sendSMS = async (to, message) => {
  if (!client) {
    throw new Error('SMS service not initialized. Check your Twilio credentials.');
  }

  try {
    validatePhoneNumber(to);
    const { TWILIO_PHONE_NUMBER } = process.env;

    const result = await client.messages.create({
      body: message,
      to,
      from: TWILIO_PHONE_NUMBER
    });

    console.log('SMS sent successfully:', result.sid);
    return result.sid;
  } catch (error) {
    console.error('SMS sending error:', error);
    if (error.code === 21211) {
      throw new Error('Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
    }
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

module.exports = { sendSMS };