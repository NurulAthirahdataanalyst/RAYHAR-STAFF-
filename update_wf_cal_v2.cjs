const fs = require('fs');

let content = fs.readFileSync('src/pages/hr-analytics/WorkforceCalendar.tsx', 'utf8');

// 1. KPI vars
content = content.replace(
  /const kpiEmergency = currentMonthEvents\.filter[\s\S]*?length;/,
  \`const kpiReplacement = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Replacement")).length;
  const kpiUnpaid = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Unpaid")).length;\`
);

// 2. KPI Cards
content = content.replace(/lg:grid-cols-6/, 'lg:grid-cols-7');
content = content.replace(
  /\{ label: "Emergency Leave", value: kpiEmergency, dot: "bg-orange-500", border: "border-l-orange-500", icon: AlertCircle \},/,
  \`{ label: "Replacement Leave", value: kpiReplacement, dot: "bg-blue-500", border: "border-l-blue-500", icon: Calendar },
          { label: "Unpaid Leave", value: kpiUnpaid, dot: "bg-gray-500", border: "border-l-gray-500", icon: AlertCircle },\`
);
content = content.replace(
  /<p className="text-\[10px\] font-black uppercase tracking-wider text-foreground leading-tight">\{kpi.label\}<\/p>/,
  \`<p className="text-[10px] font-black uppercase tracking-wider text-black dark:text-white leading-tight">{kpi.label}</p>\`
);

// 3. Dropdown Filters
content = content.replace(
  /\{\["All Types", "Annual Leave", "Sick Leave", "Emergency Leave"/,
  \`{["All Types", "Annual Leave", "Sick Leave", "Unpaid Leave"\`
);

// 4. Legend
content = content.replace(
  /\{ key: "Emergency Leave", label: "Emergency Leave" \},/,
  \`{ key: "Unpaid Leave", label: "Unpaid Leave" },\`
);

fs.writeFileSync('src/pages/hr-analytics/WorkforceCalendar.tsx', content);
console.log('Update complete.');
