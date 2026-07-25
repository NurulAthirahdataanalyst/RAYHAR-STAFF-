const fs = require('fs');

try {
  let ta = fs.readFileSync('src/pages/TeamAttendance.tsx', 'utf8');
  
  // Replace imports
  ta = ta.replace(/import \{ Loader2.*?\} from "lucide-react";/, 'import { Loader2, Users, Clock, AlertCircle, Building2, CalendarDays, Search } from "lucide-react";\nimport PageHeader from "@/components/layout/PageHeader";\nimport PageActions from "@/components/layout/PageActions";');
  
  // Remove portalTarget hook
  ta = ta.replace('const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);\n\n  useEffect(() => {\n    setPortalTarget(document.getElementById("page-header-actions"));\n  }, []);', '');
  
  // Replace createPortal header section with PageHeader and PageActions
  const headerStartRegex = /<div className=\"min-h-screen bg-background\">[\s\S]*?\{portalTarget && createPortal\([\s\S]*?<div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6\">/;
  
  const headerReplacement = `<div className="min-h-screen bg-background space-y-6 animate-in fade-in duration-500 pb-8">
      <PageHeader
        title="Daily Team Attendance Overview"
        description="Review employee attendance records, clock-in activities, and working hours for today"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Attendance", href: "/attendance" },
          { label: "Team Attendance" }
        ]}
      />
      
      <PageActions>
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
          <div className="flex flex-wrap gap-2 mr-auto sm:mr-4">
            <Badge variant="outline" className="text-xs font-semibold border-primary/20 bg-primary/5 px-3 py-1.5 flex items-center shadow-sm">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {role === 'hr_admin' ? 'All Branches' : userBranch || 'HQ'}
            </Badge>
            {role === 'head_of_department' && (
              <Badge variant="outline" className="text-xs font-semibold border-primary/20 bg-primary/5 px-3 py-1.5 flex items-center shadow-sm">
                <Users className="w-3.5 h-3.5 mr-1.5 text-primary" />
                {userDepartment || 'All Departments'}
              </Badge>
            )}
          </div>
          
          {/* Date Filter */}
          <div className="relative">
            {dateViewMode === "DAY" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-[34px] gap-2 hover:border-[#7B0099] hover:ring-1 hover:ring-[#7B0099] transition-all">
                    {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1" align="start">
                  <CalendarWidget
                    mode="single"
                    selected={new Date(selectedDate)}
                    onSelect={(d) => {
                      if (d) setSelectedDate(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <input
                type="month"
                value={\`\${new Date(selectedDate).getFullYear()}-\${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}\`}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(\`\${e.target.value}-01\`);
                  }
                }}
                className="appearance-none px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none focus:border-[#7B0099] focus:ring-1 focus:ring-[#7B0099] uppercase tracking-widest h-[34px]"
              />
            )}
          </div>

          <ExportDropdown 
            onExportCSV={() => exportToCSV(filteredList, 'Team_Attendance')} 
            onExportPDF={() => window.print()} 
          />

          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
            <Input
              placeholder="Search Employee..."
              className="pl-9 h-[34px] w-[200px] text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </PageActions>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0">`;
  
  ta = ta.replace(headerStartRegex, headerReplacement);
  
  // Replace CardHeader with just the remaining buttons (Day/Month toggle and Status toggle)
  const cardHeaderRegex = /<CardHeader className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">[\s\S]*?<\/CardHeader>/;
  
  const cardHeaderReplacement = `<CardHeader className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <CardTitle className="text-lg whitespace-nowrap">{dateViewMode === 'DAY' ? "Today's Attendance Log" : "Monthly Attendance Log"}</CardTitle>
            
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
              {/* Day / Month Toggle */}
              <div className="flex items-center bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md p-1 shadow-sm">
                <button 
                  onClick={() => setDateViewMode('DAY')}
                  className={\`px-4 py-1.5 rounded-md text-xs font-bold transition-colors \${dateViewMode === 'DAY' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}\`}
                >
                  DAY
                </button>
                <button 
                  onClick={() => setDateViewMode('MONTH')}
                  className={\`px-4 py-1.5 rounded-md text-xs font-bold transition-colors \${dateViewMode === 'MONTH' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}\`}
                >
                  MONTH
                </button>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md p-1 shadow-sm overflow-x-auto">
                {["ALL", "ON TIME", "LATE"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={\`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap \${statusFilter === status ? 'bg-white dark:bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}\`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>`;
  
  ta = ta.replace(cardHeaderRegex, cardHeaderReplacement);
  
  fs.writeFileSync('src/pages/TeamAttendance.tsx', ta);
  console.log('Successfully rewrote TeamAttendance.tsx');
} catch (e) {
  console.error(e);
}
