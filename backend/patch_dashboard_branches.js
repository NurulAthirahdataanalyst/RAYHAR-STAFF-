const fs = require('fs');
const path = require('path');

// 1. Patch AttendanceDashboard.tsx
const dashboardFile = path.join(__dirname, '../src/pages/hr-analytics/AttendanceDashboard.tsx');
let dashboardContent = fs.readFileSync(dashboardFile, 'utf8');

const oldEmployeeDiv = `                                <div>
                                  <span className="font-semibold text-gray-800 dark:text-gray-200 block text-xs">{record.full_name}</span>
                                  <span className="text-[10px] text-gray-400 capitalize">{((record as any).role || "").replace(/_/g, ' ')} • {record.branch}{record.branch === "HQ" && record.department ? \`, • \${record.department}\` : ""}</span>
                                </div>`;

const newEmployeeDiv = `                                <div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200 block text-xs">{record.full_name}</span>
                                    { (record as any).attendance_type === "Temporary Assignment" && (
                                      <span className="bg-purple-100 text-[#7B0099] border border-purple-200 text-[8px] font-bold px-1 py-0.5 rounded shadow-sm">TEMP</span>
                                    ) }
                                  </div>
                                  <span className="text-[10px] text-gray-400 capitalize">{((record as any).role || "").replace(/_/g, ' ')} • {record.branch}{record.branch === "HQ" && record.department ? \`, • \${record.department}\` : ""}</span>
                                </div>`;

if (dashboardContent.includes(oldEmployeeDiv)) {
  dashboardContent = dashboardContent.replace(oldEmployeeDiv, newEmployeeDiv);
  fs.writeFileSync(dashboardFile, dashboardContent, 'utf8');
  console.log("AttendanceDashboard patched!");
}

// 2. Patch Branches.tsx
const branchesFile = path.join(__dirname, '../src/pages/Branches.tsx');
let branchesContent = fs.readFileSync(branchesFile, 'utf8');

// Add state
if (!branchesContent.includes('const [temporaryStaff, setTemporaryStaff] = useState<any[]>([])')) {
  branchesContent = branchesContent.replace(
    'const [employees, setEmployees] = useState<any[]>([]);',
    'const [employees, setEmployees] = useState<any[]>([]);\n  const [temporaryStaff, setTemporaryStaff] = useState<any[]>([]);'
  );
  
  // Add fetch
  const fetchCode = `
  const fetchTemporaryStaff = async () => {
    try {
      const res = await fetch(\`\${API_BASE_URL}/api/work-assignments-all\`);
      const data = await res.json();
      if (data.success) {
        setTemporaryStaff(data.assignments);
      }
    } catch (e) {
      console.error("Failed to fetch temporary staff", e);
    }
  };

  useEffect(() => {
    fetchTemporaryStaff();
  }, []);
`;
  branchesContent = branchesContent.replace(
    '  useEffect(() => {',
    fetchCode + '\n  useEffect(() => {'
  );
}

// Add the table
// Find where to inject: after the first table
const tableEnd = `                    </tbody>
                  </table>
                </div>`;

const newTable = `
                {/* Temporary Staff Table */}
                <div className="mt-8 mb-4">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#7B0099]" />
                    Temporary Staff On Duty
                  </h3>
                  <div className="bg-card border border-border/50 rounded-[24px] overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border/50">
                          <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-widest uppercase">Employee</th>
                          <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-widest uppercase">Permanent Branch</th>
                          <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-widest uppercase">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {(() => {
                          const today = new Date().toISOString().split('T')[0];
                          const activeTempStaff = temporaryStaff.filter(a => 
                            a.temp_branch === selectedBranch?.code && 
                            a.status === 'Active' && 
                            a.start_date.split('T')[0] <= today && 
                            (!a.end_date || a.end_date.split('T')[0] >= today)
                          );

                          if (activeTempStaff.length === 0) {
                            return (
                              <tr>
                                <td colSpan={3} className="py-12 text-center text-muted-foreground italic font-medium">
                                  No temporary personnel found in this branch.
                                </td>
                              </tr>
                            );
                          }

                          return activeTempStaff.map(emp => (
                            <tr key={emp.id} className="hover:bg-muted/30 transition-colors group">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-[11px] font-black text-purple-600 group-hover:scale-110 transition-transform">
                                    {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-foreground group-hover:text-purple-600 transition-colors">{emp.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-widest">{emp.role?.replace(/_/g, ' ')}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6 font-bold text-muted-foreground text-xs uppercase">{emp.primary_branch || 'HQ'}</td>
                              <td className="py-4 px-6 font-bold text-muted-foreground text-xs">
                                {new Date(emp.start_date).toLocaleDateString()} - {emp.end_date ? new Date(emp.end_date).toLocaleDateString() : 'Present'}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
`;

if (!branchesContent.includes('Temporary Staff On Duty')) {
  branchesContent = branchesContent.replace(tableEnd, tableEnd + newTable);
  fs.writeFileSync(branchesFile, branchesContent, 'utf8');
  console.log("Branches.tsx patched!");
}

