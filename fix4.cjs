const fs = require('fs');

try {
  let ta = fs.readFileSync('src/pages/TeamAttendance.tsx', 'utf8');
  ta = ta.replace('import { Search, CalendarDays } from "lucide-react";', '');
  fs.writeFileSync('src/pages/TeamAttendance.tsx', ta);
  console.log('Fixed TeamAttendance.tsx');
} catch (e) {
  console.error(e);
}
