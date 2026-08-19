import re

path = "src/pages/outstation/OutstationAssignment.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add viewFormAssignment state
if "const [viewFormAssignment, setViewFormAssignment] = useState" not in content:
    content = content.replace(
        "const [drawerOpen, setDrawerOpen] = useState(false);",
        "const [drawerOpen, setDrawerOpen] = useState(false);\n  const [viewFormAssignment, setViewFormAssignment] = useState<any>(null);"
    )

# 2. Add onClick to TableRow
content = content.replace(
    '<TableRow key={a.id} className="hover:bg-pink-50/20 transition-colors">',
    '<TableRow key={a.id} className="hover:bg-pink-50/20 transition-colors cursor-pointer" onClick={() => setViewFormAssignment(a)}>'
)

# 3. Add stopPropagation to Actions TableCell so Edit/Delete buttons don't trigger the row click
content = content.replace(
    '<TableCell className="px-2.5">',
    '<TableCell className="px-2.5" onClick={(e) => e.stopPropagation()}>'
)

# 4. Add the View Form Modal
modal_html = """
      {/* View Form Dialog */}
      <Dialog open={!!viewFormAssignment} onOpenChange={() => setViewFormAssignment(null)}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {viewFormAssignment && (
            <>
              {/* Header (Fixed) */}
              <div className="bg-[#7B0099] px-6 py-5 text-white shrink-0">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/20 shrink-0">
                    <Plane className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Outstation Assignment</p>
                    <DialogTitle className="text-lg font-black text-white leading-tight">
                      {viewFormAssignment.project || viewFormAssignment.purpose || "Outstation Trip"}
                    </DialogTitle>
                    <p className="text-[11px] text-white/80 mt-1">The outstation details below.</p>
                  </div>
                </div>
              </div>

              {/* Body (Scrollable) */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                {/* Trip Information */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Trip Information
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Destination</p>
                      <p className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5">{viewFormAssignment.destination}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Event Name</p>
                      <p className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5">{viewFormAssignment.project || viewFormAssignment.purpose || "Outstation Trip"}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Status</p>
                      <div className="mt-1">{statusBadge(viewFormAssignment.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Duration
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Start Date</p>
                      <p className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5">{fmtDate(viewFormAssignment.start_date)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">End Date</p>
                      <p className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5">{fmtDate(viewFormAssignment.end_date)}</p>
                    </div>
                    <div className="bg-[#7B0099]/5 rounded-xl p-3 border border-[#7B0099]/20">
                      <p className="text-[10px] text-[#7B0099] font-bold uppercase">Total Days</p>
                      <p className="text-lg font-black text-[#7B0099] mt-0.5">{viewFormAssignment.total_days || 0} {viewFormAssignment.total_days === 1 ? 'Day' : 'Days'}</p>
                    </div>
                  </div>
                </div>

                {/* Employees Assigned */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Employee Assigned
                  </p>
                  <div className="space-y-2">
                      <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B0099]/20 to-pink-200 flex items-center justify-center text-[10px] font-black text-[#7B0099] shrink-0">
                          {(viewFormAssignment.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate">{viewFormAssignment.full_name}</p>
                          <p className="text-[10px] text-gray-400">{viewFormAssignment.department || "—"} · {viewFormAssignment.branch || "—"}</p>
                        </div>
                        {statusBadge(viewFormAssignment.status)}
                      </div>
                  </div>
                </div>
              </div>

              {/* Footer (Fixed) */}
              <div className="px-6 pb-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  if (!viewFormAssignment) return;
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  const html = `
                    <html>
                      <head>
                        <title>Outstation Assignment - ${viewFormAssignment.project || viewFormAssignment.purpose || "Trip"}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                          h1 { color: #7B0099; font-size: 24px; margin-bottom: 5px; }
                          h2 { font-size: 16px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                          .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                          .label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                          .value { font-size: 14px; font-weight: bold; }
                          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; }
                          th { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; }
                        </style>
                      </head>
                      <body>
                        <h1>${viewFormAssignment.project || viewFormAssignment.purpose || "Outstation Trip"}</h1>
                        <p style="color: #666; margin-top: 0;">Outstation Assignment Details</p>
                        
                        <h2>Trip Information</h2>
                        <div class="info-grid">
                          <div class="info-box" style="grid-column: span 2;">
                            <div class="label">Destination</div>
                            <div class="value">${viewFormAssignment.destination}</div>
                          </div>
                          <div class="info-box">
                            <div class="label">Status</div>
                            <div class="value">${viewFormAssignment.status}</div>
                          </div>
                          <div class="info-box">
                            <div class="label">Total Days</div>
                            <div class="value">${viewFormAssignment.total_days || 0} Days (${fmtDate(viewFormAssignment.start_date)} - ${fmtDate(viewFormAssignment.end_date)})</div>
                          </div>
                        </div>

                        <h2>Employee Assigned</h2>
                        <table>
                          <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Branch</th>
                            <th>Status</th>
                          </tr>
                          <tr>
                            <td style="font-weight: bold;">${viewFormAssignment.full_name}</td>
                            <td>${viewFormAssignment.department || '-'}</td>
                            <td>${viewFormAssignment.branch || '-'}</td>
                            <td>${viewFormAssignment.status}</td>
                          </tr>
                        </table>
                        
                        <div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center;">
                          Generated from Rayhar Employee Portal
                        </div>
                      </body>
                    </html>
                  `;
                  printWindow.document.write(html);
                  printWindow.document.close();
                  setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                }} className="rounded-xl font-black text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50">
                  Export to PDF
                </Button>
                <Button variant="outline" onClick={() => setViewFormAssignment(null)} className="rounded-xl font-black text-[11px]">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
"""

content = content.replace("    </div>\n  );\n}", modal_html + "\n  );\n}")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
