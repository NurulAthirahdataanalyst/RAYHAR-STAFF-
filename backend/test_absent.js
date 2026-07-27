const https = require('https');

https.get('https://rayhar-staff.onrender.com/api/reports/absent-employees?date=2026-07-26', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
