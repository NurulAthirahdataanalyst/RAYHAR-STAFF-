const http = require('http');

http.get('http://localhost:5000/api/employees', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
