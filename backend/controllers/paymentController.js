const https = require('https');
const { db } = require('../firebase');

const initializePayment = async (req, res) => {
    try {
        const { email, amount } = req.body;

        if (!email || !amount) {
            return res.status(400).json({
                status: false,
                message: 'Email and amount are required'
            });
        }

        const params = JSON.stringify({
            email,
            amount: amount * 100, // Convert to kobo/cents
            currency: 'ZAR',
            callback_url: `${process.env.APP_URL || 'http://192.168.207.93:8383'}/payment/callback`
        });

        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transaction/initialize',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const paymentReq = https.request(options, paymentRes => {
            let data = '';

            paymentRes.on('data', (chunk) => {
                data += chunk;
            });

            paymentRes.on('end', () => {
                const response = JSON.parse(data);
                res.status(200).json(response);
            });
        });

        paymentReq.on('error', (error) => {
            console.error('Payment error:', error);
            res.status(500).json({ 
                status: false,
                message: 'Payment initialization failed',
                error: error.message 
            });
        });

        paymentReq.write(params);
        paymentReq.end();

    } catch (error) {
        console.error('Payment controller error:', error);
        res.status(500).json({ 
            status: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
};

module.exports = {
    initializePayment
};
