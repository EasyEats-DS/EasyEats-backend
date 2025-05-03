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
        // Log the incoming data for debugging
        console.log('Email data received:', { to, subject, data });

        const mailOptions = {
            from: `"EasyEats" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            // Pass the full data object to generateEmailContent
            html: generateEmailContent(subject, {
                orderId: data.orderId,
                totalAmount: data.totalAmount || data.total,
                estimatedDeliveryTime: data.estimatedDeliveryTime,
                items: data.items,
                message: data.message
            })
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
        case 'Order Confirmation - EasyEats':
            return `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #e65100; margin-bottom: 20px;">Thanks for your order!</h2>
                    <p style="font-size: 16px; color: #333;">${data.message}</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${data.orderId}</p>
                        <p style="margin: 5px 0;"><strong>Total:</strong> $${data.totalAmount}</p>
                        ${data.estimatedDeliveryTime ? `<p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDeliveryTime}</p>` : ''}
                    </div>

                    ${data.items ? `
                        <div style="margin-top: 20px;">
                            <h3 style="color: #424242;">Order Details</h3>
                            <div style="border-top: 1px solid #eee; padding-top: 10px;">
                                ${data.items.map(item => `
                                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                                        <span>${item.name} × ${item.quantity}</span>
                                        <span>$${item.price}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <p style="margin-top: 20px; color: #666;">We'll keep you updated on your order status.</p>
                </div>
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