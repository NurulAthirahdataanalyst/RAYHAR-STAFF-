const fs = require('fs');
let text = fs.readFileSync('src/components/shared/StaffProfileDialog.tsx', 'utf8');

const targetStr = \<div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] print:text-[13px] font-bold text-foreground uppercase tracking-widest">Status</span>
                          <Badge className={\\\	ext-white font-black text-[9px] print:text-[13px] uppercase tracking-wider \\\\\\}>
                            {selectedEmployee.status}
                          </Badge>
                        </div>\;

const newStr = \<div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] print:text-[13px] font-bold text-foreground uppercase tracking-widest">Status</span>
                          <Badge className={\\\	ext-white font-black text-[9px] print:text-[13px] uppercase tracking-wider \\\\\\}>
                            {selectedEmployee.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] print:text-[13px] font-bold text-foreground uppercase tracking-widest">Date Created</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                            {selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : "N/A"}
                          </span>
                        </div>
                        {(selectedEmployee.status === 'Deleted' || selectedEmployee.status === 'Inactive') && (
                          <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] print:text-[13px] font-bold text-rose-500 uppercase tracking-widest">Date Deleted</span>
                            <span className="text-xs font-black text-rose-600">
                              {selectedEmployee.updated_at ? new Date(selectedEmployee.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : "N/A"}
                            </span>
                          </div>
                        )}\;

if (text.includes(targetStr)) {
  text = text.replace(targetStr, newStr);
  fs.writeFileSync('src/components/shared/StaffProfileDialog.tsx', text);
  console.log('Successfully replaced in StaffProfileDialog.tsx');
} else {
  console.log('Target string not found in StaffProfileDialog.tsx');
}
