const fs = require('fs');
const content = fs.readFileSync('backend/server.js', 'utf8');
const start = content.indexOf('app.get("/api/reports/workforce-insights"');
const end = content.indexOf('app.get("/api/reports/monthly-attendance"', start);
fs.writeFileSync('workforce_insights_api.txt', content.substring(start, end));
