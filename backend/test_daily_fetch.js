fetch('https://rayhar-staff.onrender.com/api/reports/daily-attendance')
  .then(res => res.text())
  .then(text => console.log(text.substring(0, 1000)))
  .catch(console.error);
