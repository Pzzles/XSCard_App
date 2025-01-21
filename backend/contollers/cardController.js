const QRCode = require('qrcode');

const generateQRCode = async (req, res) => {
    const { name, status } = req.body;
    if (!name || !status) {
        return res.status(400).send({ message: 'Name and status are required to generate QR code' });
    }
    try {
        const qrData = JSON.stringify({ name, status });
        const qrCodeBuffer = await QRCode.toBuffer(qrData);
        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(qrCodeBuffer);
    } catch (error) {
        res.status(500).send({ message: 'Internal Server Error', error });
    }
};

module.exports = {
    generateQRCode
};