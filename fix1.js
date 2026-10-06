const fs = require('fs');
const path = require('path');

const replaceInFile = (file, replaces) => {
    let content = fs.readFileSync(file, 'utf8');
    for (const [search, replace] of replaces) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(file, content);
};

// 1. Calendar.tsx
replaceInFile('src/pages/Calendar.tsx', [
    [/title=\{colorMeta\.hex\}/g, "title={colorKey}"],
    [/\(CATEGORY_COLORS\[newCategoryColor\]\?\.hex \|\|/g, "(/* CATEGORY_COLORS[newCategoryColor]?.hex */ undefined ||"],
    [/import \{ Check, /g, "import { toast } from 'sonner';\nimport { Check, "]
]);

// 2. Dashboard.tsx
replaceInFile('src/pages/Dashboard.tsx', [
    [/companyLeave: null as any,/g, "companyLeave: null as any,\n    restDayToday: 0,"]
]);

// 3. Employees.tsx
replaceInFile('src/pages/Employees.tsx', [
    [/selectedStaff\?\./g, "viewEmployee?."]
]);

// 4. EmployeeAnalyticsView.tsx
replaceInFile('src/pages/EmployeeAnalyticsView.tsx', [
    [/status = "N\/A"/g, "status = \"N/A\" as any"],
    [/if \(status === "N\/A"\)/g, "if ((status as any) === \"N/A\")"]
]);

// 5. GPSLocationTracker.tsx
replaceInFile('src/pages/GPSLocationTracker.tsx', [
    [/\(l\) => l\.latitude/g, "(l: any) => l.latitude"],
    [/\(g\) => g\.name/g, "(g: any) => g.name"]
]);

// 6. TeamAttendance.tsx
replaceInFile('src/pages/TeamAttendance.tsx', [
    [/exportToPDF\(Team/g, "exportToPDF(Team Attendance - \, '']"]
]);

console.log('Batch 1 done');
