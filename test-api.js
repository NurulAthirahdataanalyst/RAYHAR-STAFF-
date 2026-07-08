const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/branch-employees?branch=TGG');
    const emps = res.data.employees;
    emps.forEach(e => {
      console.log(`${e.full_name}: is_outstation=${e.is_outstation} type=${typeof e.is_outstation}, outstation_today=${e.outstation_today}`);
    });
  } catch (e) {
    console.error(e);
  }
}
test();
