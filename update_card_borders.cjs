const fs = require('fs');

// 1. LeaveOverview.tsx
let path = 'src/pages/LeaveOverview.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /className="relative overflow-hidden border border-border\/40 shadow-\[0_4px_16px_rgba\(0,0,0,0\.03\)\] dark:shadow-\[0_4px_16px_rgba\(0,0,0,0\.12\)\] bg-white\/90 dark:bg-card\/80 backdrop-blur-md rounded-xl group hover:shadow-md transition-all duration-300"/g,
    'className="relative overflow-hidden border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 border-l-[#7B0099] bg-white/90 dark:bg-card/80 backdrop-blur-md rounded-xl group hover:shadow-md transition-all duration-300"'
  );
  content = content.replace(/<div className="absolute left-0 top-0 bottom-0 w-1 bg-\[\#7B0099\]" \/>/g, '');
  fs.writeFileSync(path, content);
  console.log("Updated LeaveOverview.tsx");
}

// 2. AttendanceDashboard.tsx
path = 'src/pages/hr-analytics/AttendanceDashboard.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /className=\{\`relative overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-card rounded-md shadow-none p-4 flex flex-col justify-between h-\[150px\] transition-all duration-200 cursor-pointer hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50\/50 dark:hover:bg-slate-900\/50\`\}/g,
    "className={`relative overflow-hidden border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 ${k.color.replace('text-', 'border-l-')} bg-white dark:bg-card rounded-md p-4 flex flex-col justify-between h-[150px] transition-all duration-200 cursor-pointer hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-900/50`}"
  );
  fs.writeFileSync(path, content);
  console.log("Updated AttendanceDashboard.tsx");
}

// 3. TeamAttendance.tsx
path = 'src/pages/TeamAttendance.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /<Card className="border-border shadow-sm">/g,
    (match, offset, string) => {
      // Find what color to use based on the icon's background class that follows
      let slice = string.slice(offset, offset + 200);
      let colorClass = "border-l-[#7B0099]";
      if (slice.includes("text-primary")) colorClass = "border-l-[#7B0099]";
      if (slice.includes("text-green-500")) colorClass = "border-l-green-500";
      if (slice.includes("text-amber-500")) colorClass = "border-l-amber-500";
      if (slice.includes("text-red-500")) colorClass = "border-l-red-500";
      return `<Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 ${colorClass}">`;
    }
  );
  fs.writeFileSync(path, content);
  console.log("Updated TeamAttendance.tsx");
}

// 4. LeaveAdmin.tsx
path = 'src/pages/LeaveAdmin.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /className="bg-card border border-border shadow-sm rounded-lg overflow-hidden flex relative h-\[100px\] hover:shadow-md transition-shadow"/g,
    "className={`bg-card border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 ${stat.bg.replace('bg-', 'border-l-')} rounded-lg overflow-hidden flex relative h-[100px] hover:shadow-md transition-shadow`}"
  );
  fs.writeFileSync(path, content);
  console.log("Updated LeaveAdmin.tsx");
}

