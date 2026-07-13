const http = require('http');

http.get('http://localhost:5000/api/workforce-calendar?role=hr_admin', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
}).on('error', err => {
  console.log("Error: ", err.message);
});
