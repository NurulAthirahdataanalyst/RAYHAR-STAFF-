fetch('https://rayhar-staff.onrender.com/api/employees')
  .then(res => res.text())
  .then(text => console.log(text.substring(0, 500)))
  .catch(console.error);
