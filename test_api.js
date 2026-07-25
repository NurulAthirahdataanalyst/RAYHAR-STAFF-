const https = require('https');
https.get('https://rayharstaffportal.vercel.app/api/leave-requests?userId=E005', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
