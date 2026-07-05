const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverFile, 'utf8');

// Update /api/leave-requests to support month and year
const oldDateLogic = `
    if (date) {
      filters.push("DATE(lr.created_at AT TIME ZONE 'Asia/Kuala_Lumpur') = ?");
      params.push(date);
    }`;

const newDateLogic = `
    const month = req.query.month;
    const year = req.query.year;

    if (date) {
      filters.push("(?::date BETWEEN lr.start_date AND lr.end_date OR DATE(lr.created_at AT TIME ZONE 'Asia/Kuala_Lumpur') = ?)");
      params.push(date, date);
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      filters.push("(?::date <= lr.end_date AND ?::date >= lr.start_date)");
      params.push(endDate, startDate);
    }`;

if (content.includes(oldDateLogic)) {
  content = content.replace(oldDateLogic, newDateLogic);
  fs.writeFileSync(serverFile, content, 'utf8');
  console.log("Successfully patched leave-requests route.");
} else if (content.includes("const month = req.query.month;")) {
  console.log("leave-requests route already patched.");
} else {
  console.log("Could not find oldDateLogic to replace.");
}
