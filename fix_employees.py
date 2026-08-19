import re

path = "src/pages/Employees.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add tempAssignmentsHistory state
content = content.replace(
    'const [tempAssignment, setTempAssignment] = useState({ location: "", start_date: "", end_date: "", status: "Active" });',
    'const [tempAssignment, setTempAssignment] = useState({ location: "", start_date: "", end_date: "", status: "Active" });\n  const [tempAssignmentsHistory, setTempAssignmentsHistory] = useState<any[]>([]);'
)

# 2. Update fetchAttendanceSettings
content = content.replace(
    'if (waData.success && waData.assignments.length > 0) {\n        const activeOrLatest = waData.assignments[0];',
    'if (waData.success && waData.assignments.length > 0) {\n        setTempAssignmentsHistory(waData.assignments);\n        const activeOrLatest = waData.assignments[0];'
)
content = content.replace(
    '      } else {\n        setTempAssignment({ location: "", start_date: "", end_date: "", status: "Active" });\n      }',
    '      } else {\n        setTempAssignmentsHistory([]);\n        setTempAssignment({ location: "", start_date: "", end_date: "", status: "Active" });\n      }'
)

# 3. Add tab trigger
content = content.replace(
    '<TabsTrigger value="attendance_settings">Attendance Settings</TabsTrigger>',
    '<TabsTrigger value="attendance_settings">Attendance Settings</TabsTrigger>\n                  <TabsTrigger value="temporary_branch">Temporary Branch</TabsTrigger>'
)

# 4. Add tab content
tab_content = """
                <TabsContent value="temporary_branch" className="mt-0">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mb-6">
                      <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-500" />
                        Temporary Branch History
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">View this employee's previous temporary branch transfers.</p>
                    </div>

                    {tempAssignmentsHistory.length === 0 ? (
                      <div className="border border-slate-200 dark:border-slate-700 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center mb-3 shadow-sm">
                          <MapPin className="w-5 h-5 text-slate-400" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No Temporary Transfer</h4>
                        <p className="text-xs font-semibold text-slate-500 max-w-[250px]">This employee has no previous temporary branch transfer records.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                          <span className="text-xs font-bold text-slate-500">Total Temporary Transfers</span>
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{tempAssignmentsHistory.length} Transfers</span>
                        </div>
                        
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                                <TableHead className="font-bold text-slate-500 text-xs">Temporary Branch</TableHead>
                                <TableHead className="font-bold text-slate-500 text-xs">Period</TableHead>
                                <TableHead className="font-bold text-slate-500 text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tempAssignmentsHistory.map((assignment, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                      {assignment.temp_branch || assignment.location}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {assignment.start_date ? new Date(assignment.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : '?'} – {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : '?'}
                                  </TableCell>
                                  <TableCell>
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${assignment.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {assignment.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
"""

content = content.replace(
    '</TabsContent>\n              </Tabs>\n            ) : (',
    '</TabsContent>\n' + tab_content + '              </Tabs>\n            ) : ('
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
