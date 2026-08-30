const fs = require('fs');

let fileContent = fs.readFileSync('src/pages/hr-analytics/WorkforceCalendar.tsx', 'utf8');

// Update KPIs declarations
const oldKpis = `  const kpiAnnual = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Annual")).length;
  const kpiSick = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Sick")).length;
  const kpiEmergency = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Emergency")).length;
  
  const outstationEvents = currentMonthEvents.filter(e => e.source === "outstation");`;

const newKpis = `  const kpiAnnual = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Annual")).length;
  const kpiSick = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Sick")).length;
  const kpiReplacement = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Replacement")).length;
  const kpiUnpaid = currentMonthEvents.filter(e => e.source === "leave" && e.status === "Approved" && e.type?.includes("Unpaid")).length;
  
  const outstationEvents = currentMonthEvents.filter(e => e.source === "outstation");`;
fileContent = fileContent.replace(oldKpis, newKpis);

// Update KPI cards block
const oldCards = `      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Annual Leave", value: kpiAnnual, dot: "bg-emerald-500", border: "border-l-emerald-500", icon: Calendar },
          { label: "Sick Leave", value: kpiSick, dot: "bg-red-500", border: "border-l-red-500", icon: Activity },
          { label: "Emergency Leave", value: kpiEmergency, dot: "bg-orange-500", border: "border-l-orange-500", icon: AlertCircle },
          { label: "Outstation", value: kpiOutstation, dot: "bg-pink-500", border: "border-l-pink-500", icon: Plane },
          { label: "Company Leave", value: kpiCompany, dot: "bg-purple-500", border: "border-l-purple-500", icon: Building2 },
          { label: "Pending", value: kpiPending, dot: "bg-amber-400", border: "border-l-amber-400", icon: FileText },
        ].map(kpi => (
          <Card key={kpi.label} className={\`border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 \${kpi.border}\`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={\`w-2.5 h-2.5 rounded-full shrink-0 \${kpi.dot}\`} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-foreground leading-tight">{kpi.label}</p>`;

const newCards = `      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: "Annual Leave", value: kpiAnnual, dot: "bg-emerald-500", border: "border-l-emerald-500", icon: Calendar },
          { label: "Sick Leave", value: kpiSick, dot: "bg-red-500", border: "border-l-red-500", icon: Activity },
          { label: "Replacement Leave", value: kpiReplacement, dot: "bg-blue-500", border: "border-l-blue-500", icon: Calendar },
          { label: "Unpaid Leave", value: kpiUnpaid, dot: "bg-gray-500", border: "border-l-gray-500", icon: AlertCircle },
          { label: "Outstation", value: kpiOutstation, dot: "bg-pink-500", border: "border-l-pink-500", icon: Plane },
          { label: "Company Leave", value: kpiCompany, dot: "bg-purple-500", border: "border-l-purple-500", icon: Building2 },
          { label: "Pending", value: kpiPending, dot: "bg-amber-400", border: "border-l-amber-400", icon: FileText },
        ].map(kpi => (
          <Card key={kpi.label} className={\`border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 \${kpi.border}\`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={\`w-2.5 h-2.5 rounded-full shrink-0 \${kpi.dot}\`} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-black dark:text-white leading-tight">{kpi.label}</p>`;
fileContent = fileContent.replace(oldCards, newCards);

// Update dropdown filters (Emergency Leave -> Unpaid Leave)
const oldSelect = `               {["All Types", "Annual Leave", "Sick Leave", "Emergency Leave", "Replacement Leave", "Outstation", "Company Leave", "Pending"].map(t => (`;
const newSelect = `               {["All Types", "Annual Leave", "Sick Leave", "Unpaid Leave", "Replacement Leave", "Outstation", "Company Leave", "Pending"].map(t => (`;
fileContent = fileContent.replace(oldSelect, newSelect);

// Update Legend (Emergency Leave -> Unpaid Leave)
const oldLegend = `      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        {[
          { key: "Annual Leave",    label: "Annual Leave" },
          { key: "Sick Leave",      label: "Sick Leave" },
          { key: "Emergency Leave", label: "Emergency Leave" },
          { key: "Replacement Leave", label: "Replacement Leave" },
          { key: "Outstation",      label: "Outstation" },
          { key: "Company Leave",   label: "Company Leave" },
          { key: "Pending",         label: "Pending" },
        ]`;

const newLegend = `      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        {[
          { key: "Annual Leave",    label: "Annual Leave" },
          { key: "Sick Leave",      label: "Sick Leave" },
          { key: "Unpaid Leave",    label: "Unpaid Leave" },
          { key: "Replacement Leave", label: "Replacement Leave" },
          { key: "Outstation",      label: "Outstation" },
          { key: "Company Leave",   label: "Company Leave" },
          { key: "Pending",         label: "Pending" },
        ]`;
fileContent = fileContent.replace(oldLegend, newLegend);

fs.writeFileSync('src/pages/hr-analytics/WorkforceCalendar.tsx', fileContent);
console.log('WorkforceCalendar updated.');
