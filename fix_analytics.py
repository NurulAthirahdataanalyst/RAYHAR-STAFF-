import codecs
import re

with codecs.open('src/pages/outstation/OutstationAnalytics.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Imports
target_imports = r'import \{ TablePagination \} from "@/components/common/TablePagination";'
replace_imports = r'import { TablePagination } from "@/components/common/TablePagination";\nimport { YearPopover } from "@/components/shared/YearPopover";'
content = re.sub(target_imports, replace_imports, content)

# 2. Add selectedYear state
target_state = r'const \[selectedMonth, setSelectedMonth\] = useState<string>\("all"\);'
replace_state = r'const [selectedMonth, setSelectedMonth] = useState<string>("all");\n  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());'
content = re.sub(target_state, replace_state, content)

# 3. Add filteredAssignments useMemo
target_filtered = r'// Group individual employee assignments into distinct Outstation Events'
replace_filtered = r'''// Filter by selected year
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (!a.start_date) return false;
      return a.start_date.startsWith(selectedYear);
    });
  }, [assignments, selectedYear]);

  // Group individual employee assignments into distinct Outstation Events'''
content = re.sub(target_filtered, replace_filtered, content)

# 4. Replace 'assignments' with 'filteredAssignments' inside eventGroups, activeStaffCount, totalDestinations, destinationData, allRecentAssignments, upcomingGroups
content = re.sub(r'assignments\.forEach\(\(a\)', r'filteredAssignments.forEach((a)', content)
content = re.sub(r'assignments\.filter\(a =>', r'filteredAssignments.filter(a =>', content)
content = re.sub(r'assignments\.map\(a =>', r'filteredAssignments.map(a =>', content)
content = re.sub(r'assignments\s*\n\s*\.slice', r'filteredAssignments\n      .slice', content)
content = re.sub(r'\[assignments\]\)', r'[filteredAssignments])', content)

# 5. Replace Refresh button with YearPopover
target_btn = r'''<PageActions>
          <Button onClick=\{\(\) => void fetchData\(\)\} className="h-11 px-5 w-full sm:w-auto">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
          </Button>
        </PageActions>'''
replace_btn = r'''<PageActions>
          <YearPopover 
            year={selectedYear} 
            onSelectYear={setSelectedYear} 
            className="flex items-center justify-between h-10 px-4 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 rounded-md shadow-sm min-w-[140px] shrink-0" 
          />
        </PageActions>'''
content = re.sub(target_btn, replace_btn, content)

# 6. Make sure "Across entire year" texts use selectedYear instead of "year"
content = re.sub(r'Across entire year', r'Across {selectedYear}', content)


with codecs.open('src/pages/outstation/OutstationAnalytics.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated OutstationAnalytics")
