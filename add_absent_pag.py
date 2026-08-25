import re

with open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''(                        All hands on deck! No employees are absent today\.
                        </td>
                      </tr>
                    \)}
                  </tbody>
                </table>
              </div>
            \))'''

replacement = r'''\1
            
            {filteredAbsentEmployees.length > parseInt(absentLimit) && !loadingAbsent && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                  <span>
                    TOTAL SHOWING {((absentCurrentPage - 1) * parseInt(absentLimit)) + 1} TO {Math.min(absentCurrentPage * parseInt(absentLimit), filteredAbsentEmployees.length)} OF {filteredAbsentEmployees.length} ENTRIES
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button 
                    onClick={() => setAbsentCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={absentCurrentPage === 1}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md text-[11px] font-medium border-gray-200 dark:border-slate-800 bg-white dark:bg-card"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.ceil(filteredAbsentEmployees.length / parseInt(absentLimit)) }).map((_, i) => (
                    <Button 
                      key={i} 
                      onClick={() => setAbsentCurrentPage(i + 1)}
                      variant={absentCurrentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      className={`h-7 w-7 rounded-md text-[11px] font-medium ${absentCurrentPage === i + 1 ? 'bg-[#7B0099] hover:bg-[#5e0080] text-white border-[#7B0099]' : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-card'}`}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button 
                    onClick={() => setAbsentCurrentPage(p => Math.min(Math.ceil(filteredAbsentEmployees.length / parseInt(absentLimit)), p + 1))} 
                    disabled={absentCurrentPage === Math.ceil(filteredAbsentEmployees.length / parseInt(absentLimit))}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md text-[11px] font-medium border-gray-200 dark:border-slate-800 bg-white dark:bg-card"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}'''

new_content = re.sub(pattern, replacement, content)

with open('src/pages/hr-analytics/AttendanceDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Added absenteeism pagination")
