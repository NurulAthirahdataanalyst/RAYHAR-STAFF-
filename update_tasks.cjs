const fs = require('fs');
const path = require('path');

// 1. Leave Analytics StatCard border
const leaveAnalyticsPath = 'src/pages/LeaveAnalytics.tsx';
if (fs.existsSync(leaveAnalyticsPath)) {
  let content = fs.readFileSync(leaveAnalyticsPath, 'utf8');
  
  // Replace the card class in StatCard
  content = content.replace(
    /className=\{\`relative overflow-hidden border-0 shadow-\[0_8px_24px_rgba\(0,0,0,0\.02\)\] \$\{bgClass\} rounded-\[20px\]\`\}/,
    "className={`relative overflow-hidden border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 ${borderClass.replace('bg-', 'border-l-')} ${bgClass} rounded-[20px]`}"
  );
  
  // Remove the absolute div used for the old left border
  content = content.replace(
    /<div\s*className=\{\`absolute left-0 top-0 bottom-0 w-\[5px\] \$\{borderClass\}\`\}\s*\/>/g,
    ""
  );

  fs.writeFileSync(leaveAnalyticsPath, content);
  console.log("Updated LeaveAnalytics.tsx");
} else {
  console.log("LeaveAnalytics.tsx not found");
}

// 2. Reduce gaps in multiple pages
const pagesToUpdate = [
  'src/pages/master/Role.tsx',
  'src/pages/Employees.tsx',
  'src/pages/master/Department.tsx',
  'src/pages/outstation/OutstationAssignment.tsx',
  'src/pages/master/LeaveEntitlementManagement.tsx'
];

pagesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Reduce py-4 sm:py-6 to pt-0 pb-4 sm:pb-6
    content = content.replace(/py-4 sm:py-6/g, 'pt-0 pb-4 sm:pb-6');
    content = content.replace(/py-6/g, 'pt-0 pb-6');
    
    // Reduce space-y-6 to space-y-4
    content = content.replace(/space-y-6/g, 'space-y-4');
    
    // Reduce mb-4 on Back buttons
    content = content.replace(/<div className="mb-4">/g, '<div className="mb-2">');
    
    fs.writeFileSync(file, content);
    console.log("Updated gap in", file);
  } else {
    console.log("File not found:", file);
  }
});

// 3. Add KPI cards to LeaveCalendar.tsx
const leaveCalendarPath = 'src/pages/LeaveCalendar.tsx';
if (fs.existsSync(leaveCalendarPath)) {
  let content = fs.readFileSync(leaveCalendarPath, 'utf8');
  
  // Make sure we have the right imports
  if (!content.includes("Activity")) {
    content = content.replace(/import \{ Loader2, ChevronLeft, ChevronRight, X, Calendar, User, FileText \} from "lucide-react";/, 'import { Loader2, ChevronLeft, ChevronRight, X, Calendar, User, FileText, Activity, AlertCircle } from "lucide-react";');
    // If exact match fails, just try to inject it
    if (!content.includes("Activity")) {
      content = content.replace('from "lucide-react";', ', Activity, AlertCircle } from "lucide-react";');
    }
  }

  // Calculate KPIs inside the component, right before return
  const kpiCalcCode = `
  const monthStartStr = format(new Date(viewYear, viewMonth, 1), 'yyyy-MM-dd');
  const monthEndStr = format(new Date(viewYear, viewMonth + 1, 0), 'yyyy-MM-dd');
  const currentMonthRequests = requests.filter(r => r.start_date <= monthEndStr && r.end_date >= monthStartStr);
  const kpiAnnual = currentMonthRequests.filter(r => r.status === "Approved" && r.leave_type?.includes("Annual")).length;
  const kpiSick = currentMonthRequests.filter(r => r.status === "Approved" && r.leave_type?.includes("Sick")).length;
  const kpiReplacement = currentMonthRequests.filter(r => r.status === "Approved" && r.leave_type?.includes("Replacement")).length;
  const kpiUnpaid = currentMonthRequests.filter(r => r.status === "Approved" && r.leave_type?.includes("Unpaid")).length;

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-[#7B0099]" /></div>;
`;

  content = content.replace(
    /if \(roleLoading\) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-\[\#7B0099\]" \/><\/div>;/,
    kpiCalcCode
  );

  const kpiCardsCode = `
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Annual Leave", value: kpiAnnual, dot: "bg-emerald-500", border: "border-l-emerald-500", icon: Calendar },
          { label: "Sick Leave", value: kpiSick, dot: "bg-red-500", border: "border-l-red-500", icon: Activity },
          { label: "Replacement Leave", value: kpiReplacement, dot: "bg-blue-500", border: "border-l-blue-500", icon: Calendar },
          { label: "Unpaid Leave", value: kpiUnpaid, dot: "bg-gray-500", border: "border-l-gray-500", icon: AlertCircle },
        ].map(kpi => (
          <Card key={kpi.label} className={\`border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 \${kpi.border}\`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={\`w-2.5 h-2.5 rounded-full shrink-0 \${kpi.dot}\`} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-black dark:text-white leading-tight">{kpi.label}</p>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100 leading-tight">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}`;

  content = content.replace(/\{\/\* Controls \*\/\}/, kpiCardsCode);

  fs.writeFileSync(leaveCalendarPath, content);
  console.log("Updated LeaveCalendar.tsx");
} else {
  console.log("LeaveCalendar.tsx not found");
}

console.log("All updates completed.");
