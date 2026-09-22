const fs = require('fs');

const files = [
  'src/components/leave/LeaveDetailsModal.tsx',
  'src/pages/LeaveFormView.tsx',
  'src/pages/TeamLeaveRequests.tsx',
  'src/pages/Employees.tsx',
  'src/pages/Branches.tsx',
  'src/components/shared/StaffProfileDialog.tsx',
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  // Create a regex to match the old div container and its contents.
  // We need to handle both selectedRequest (LeaveDetailsModal) and selectedForm (LeaveFormView).
  const reqObj = c.includes('selectedRequest.from') ? 'selectedRequest' : 'selectedForm';
  
  const oldCode = `<div className="grid grid-cols-4 gap-3 p-4 print:p-5 bg-muted/30 rounded-[20px] border border-border/50">
                      <div className="text-center flex flex-col justify-center">
                        <p className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Dari</p>
                        <p className="font-black text-xs sm:text-sm print:text-[11px]">\${${reqObj}.from}</p>
                      </div>
                      <div className="text-center flex flex-col justify-center border-l border-border/50">
                        <p className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">Hingga</p>
                        <p className="font-black text-xs sm:text-sm print:text-[11px]">\${${reqObj}.to}</p>
                      </div>
                      <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] print:text-[13px] uppercase font-black text-[#942392]">Hari</p>
                        <p className="font-black text-lg text-[#942392] leading-none mt-0.5">\${${reqObj}.days}</p>
                      </div>
                      <div className="text-center rounded-[14px] border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-center py-1">
                        <p className="text-[9px] print:text-[13px] uppercase font-black text-emerald-600">Baki Layak</p>
                        <p className="font-black text-sm text-emerald-600 mt-0.5">
                          {\${${reqObj}.balance} ?? "-"} HARI
                        </p>
                      </div>
                    </div>`;

  // Actually, string replace might be tricky with exact spaces. I'll just use a more generic regex to replace the whole block.
  
  const regex = /<div className="grid grid-cols-4 gap-3 p-4 print:p-5 bg-muted\/30 rounded-\[20px\] border border-border\/50">[\s\S]*?<\/div>\s*<\/div>\s*\) : \(/;
  
  const newCode = `<div className="grid grid-cols-4 gap-3 print:gap-4">
                      {/* Dari */}
                      <div className="border border-border/50 rounded-xl overflow-hidden flex flex-col">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 text-center border-b border-border/50">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Dari</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-center">{${reqObj}.from}</p>
                        </div>
                      </div>
                      
                      {/* Hingga */}
                      <div className="border border-border/50 rounded-xl overflow-hidden flex flex-col">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 text-center border-b border-border/50">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Hingga</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-center">{${reqObj}.to}</p>
                        </div>
                      </div>
                      
                      {/* Bilangan Hari */}
                      <div className="border border-[#942392]/30 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-[#942392]/5 p-1.5 text-center border-b border-[#942392]/20">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-[#942392]">Bilangan Hari</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-[#942392] text-center">{${reqObj}.days}</p>
                        </div>
                      </div>
                      
                      {/* Baki Layak */}
                      <div className="border border-emerald-500/40 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-emerald-50 p-1.5 text-center border-b border-emerald-500/20 dark:bg-emerald-950/20">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-emerald-600">Baki Layak</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-emerald-600 text-center">{${reqObj}.balance ?? "-"} HARI</p>
                        </div>
                      </div>
                    </div>
                  ) : (`;

  c = c.replace(regex, newCode);
  fs.writeFileSync(f, c);
});
