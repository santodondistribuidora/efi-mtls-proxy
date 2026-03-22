const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

app.use(express.json());

// MTLS Configuration
const options = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/certificate.pem'),
  rejectUnauthorized: false
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EFI MTLS Proxy is running' });
});

// Proxy endpoint
app.post('/proxy', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Proxy endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Start HTTPS server
const PORT = process.env.PORT || 3000;
https.createServer(options, app).listen(PORT, () => {
  console.log(`✓ EFI MTLS Proxy running on port ${PORT}`);
  console.log(`✓ Health check: https://localhost:${PORT}/health`);
});
