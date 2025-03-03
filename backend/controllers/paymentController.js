const https = require('https');
const { db, admin } = require('../firebase');
const crypto = require('crypto');

const initializePayment = async (req, res) => {
    try {
        const { email, amount } = req.body;
        const baseUrl = process.env.APP_URL || 'http://192.168.68.106:8383';

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
            callback_url: `${baseUrl}/payment/callback`,
            metadata: {
                cancel_action: `${baseUrl}/payment/cancel`
            }
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

const verifyPayment = async (reference) => {
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
};

const verifyPaystackWebhookSignature = (req) => {
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    return hash === req.headers['x-paystack-signature'];
};

const handlePaymentCallback = async (req, res) => {
    try {
        const reference = req.method === 'POST' ? req.body.data?.reference : req.query.reference;
        
        if (!reference) {
            console.error('No reference provided');
            return res.status(400).json({ message: 'No reference provided' });
        }

        console.log('Processing payment reference:', reference);
        
        // Verify payment with Paystack
        const paymentData = await verifyPayment(reference);
        console.log('Payment verification response:', paymentData);
        
        if (paymentData.status && paymentData.data.status === 'success') {
            // Get user email from payment data
            const userEmail = paymentData.data.customer.email;
            console.log('Updating user plan for email:', userEmail);
            
            // Find user by email
            const userSnapshot = await db.collection('users')
                .where('email', '==', userEmail)
                .limit(1)
                .get();

            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                // Upgrade user to premium
                await userDoc.ref.update({
                    plan: 'premium',
                    status: 'active',
                    paymentReference: reference,
                    lastPaymentDate: admin.firestore.Timestamp.now(),
                    upgradeDate: admin.firestore.Timestamp.now()
                });
                console.log('User upgraded to premium successfully');
            } else {
                console.error('User not found for email:', userEmail);
            }

            // Simple redirect to success page
            if (req.method === 'GET') {
                return res.redirect('/payment-success.html');
            } else {
                return res.status(200).json({ 
                    status: 'success',
                    message: 'Payment processed successfully'
                });
            }
        } else {
            console.error('Payment verification failed:', paymentData);
            // Redirect to failure page with relative path
            if (req.method === 'GET') {
                return res.redirect('/payment-failed.html');
            } else {
                return res.status(400).json({ 
                    status: 'failed',
                    message: 'Payment verification failed'
                });
            }
        }
    } catch (error) {
        console.error('Payment callback error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    initializePayment,
    handlePaymentCallback
};
