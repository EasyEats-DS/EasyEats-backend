const { Kafka } = require('kafkajs');
const { 
    createPaymentIntent, 
    getPaymentStatus, 
    handleWebhook,
    processRefund,
    getPaymentsByUserId,
    getPaymentByOrderId
} = require('../controllers/paymentController');

const kafka = new Kafka({
    clientId: 'payment-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'payment-service-group' });

const sendResponse = async (correlationId, data, error = null) => {
    try {
        await producer.send({
            topic: 'payment-response',
            messages: [{
                value: JSON.stringify({
                    correlationId,
                    success: !error,
                    data: error ? null : data,
                    error: error ? error.message : null
                })
            }]
        });
    } catch (err) {
        console.error('Error sending response:', err);
    }
};

const initKafka = async () => {
    try {
        await producer.connect();
        await consumer.connect();
        await consumer.subscribe({ topics: ['payment-request'] });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                let parsedMessage;
                try {
                    parsedMessage = JSON.parse(message.value.toString());
                    const { action, payload, correlationId } = parsedMessage;

                    if (!action || !correlationId) {
                        throw new Error('Invalid message format: missing action or correlationId');
                    }

                    let response;
                    switch (action) {
                        case 'createPaymentIntent':
                            response = await createPaymentIntent(payload);
                            break;
                        case 'getPaymentStatus':
                            response = await getPaymentStatus(payload.orderId);
                            break;
                        case 'handleWebhook':
                            response = await handleWebhook(payload, produceMessage);
                            break;
                        case 'processRefund':
                            response = await processRefund(payload);
                            break;
                        case 'getPaymentsByUserId':
                            response = await getPaymentsByUserId(payload.userId);
                            break;
                        case 'getPaymentByOrderId':
                            response = await getPaymentByOrderId(payload.orderId);
                            break;
                        default:
                            throw new Error(`Unknown action: ${action}`);
                    }

                    await sendResponse(correlationId, response);
                } catch (error) {
                    console.error('Error processing payment request:', error);
                    if (parsedMessage && parsedMessage.correlationId) {
                        await sendResponse(parsedMessage.correlationId, null, error);
                    }
                }
            },
        });
        console.log('Kafka Consumer initialized');
    } catch (error) {
        console.error('Error initializing Kafka:', error);
        throw error;
    }
};

const produceMessage = async (topic, message) => {
    try {
        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }]
        });
        console.log(`Message sent to topic ${topic}:`, message);
    } catch (error) {
        console.error('Error producing message:', error);
        throw error;
    }
};

module.exports = {
    initKafka,
    produceMessage
};