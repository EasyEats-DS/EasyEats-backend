const nodemailer = require('nodemailer');
require('dotenv').config();

// Validate and initialize email configuration
const validateEmailConfig = () => {
    const { EMAIL_USER, EMAIL_PASSWORD } = process.env;
    
    if (!EMAIL_USER) {
        throw new Error('EMAIL_USER is not configured in .env file');
    }
    if (!EMAIL_PASSWORD) {
        throw new Error('EMAIL_PASSWORD is not configured in .env file');
    }

    return { EMAIL_USER, EMAIL_PASSWORD };
};

// Create transporter with validated config
const createTransporter = () => {
    try {
        const { EMAIL_USER, EMAIL_PASSWORD } = validateEmailConfig();
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            },
            debug: true // Enable debug logging
        });

        // Verify connection configuration
        transporter.verify(function (error, success) {
            if (error) {
                console.error('Email service verification failed:', error);
                throw error;
            } else {
                console.log('Email server connection verified and ready');
            }
        });

        return transporter;
    } catch (error) {
        console.error('Failed to create email transporter:', error.message);
        return null;
    }
};

// Initialize transporter
const transporter = createTransporter();

const sendEmail = async (to, subject, data) => {
    if (!transporter) {
        throw new Error('Email service not initialized - check EMAIL_USER and EMAIL_PASSWORD in .env file');
    }

    try {
        const mailOptions = {
            from: `"EasyEats" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: generateEmailContent(subject, data)
        };

        console.log('Attempting to send email to:', to);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
};

const generateEmailContent = (subject, data) => {
    switch (subject) {
        case 'Order Confirmation':
            return `
                <h2>Order Confirmation</h2>
                <p>Your order #${data.orderId} has been confirmed.</p>
                <h3>Order Details:</h3>
                <p>Total Amount: $${data.totalAmount}</p>
                <p>Estimated Delivery Time: ${data.estimatedDeliveryTime}</p>
                ${data.items ? `
                    <h4>Items:</h4>
                    <ul>
                        ${data.items.map(item => `
                            <li>${item.name} x ${item.quantity} - $${item.price}</li>
                        `).join('')}
                    </ul>
                ` : ''}
            `;
        case 'Delivery Update':
            return `
                <h2>Delivery Update</h2>
                <p>Order #${data.orderId}</p>
                <p>Status: ${data.status}</p>
                <p>Estimated Arrival: ${data.estimatedArrival}</p>
            `;
        default:
            return `<p>${JSON.stringify(data)}</p>`;
    }
};

module.exports = { sendEmail };