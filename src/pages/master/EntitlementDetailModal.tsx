import { X, Download } from "lucide-react";
import { EntitlementHistoryLog } from "@/lib/entitlementHistory";
import { getBadge } from "./EntitlementActivityCard";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

export function EntitlementDetailModal({ log, onClose }: { log: EntitlementHistoryLog; onClose: () => void }) {
  const badge = getBadge(log.action_type);
  const isPositive = log.adjustment >= 0;
  const saveAsPDF = async () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const isPositive = log.adjustment >= 0;
    const html = `
      <html>
        <head>
          <title>Leave Entitlement Record - ${log.history_id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #942392; font-size: 24px; margin-bottom: 5px; text-transform: uppercase; }
            h2 { font-size: 16px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; color: #666; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
            .label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .value { font-size: 14px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; }
            th { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; width: 30%; }
            .balance-box { display: flex; align-items: center; justify-content: space-around; background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px; text-align: center; }
            .balance-val { font-size: 24px; font-weight: bold; }
            .adjustment { font-size: 20px; font-weight: bold; color: ${isPositive ? '#059669' : '#e11d48'}; }
            .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Leave Entitlement Record</h1>
          <p style="color: #666; margin-top: 0;">${log.history_id}</p>
          
          <div class="balance-box">
            <div>
              <div class="label">Previous Balance</div>
              <div class="balance-val">${log.previous_balance} <span style="font-size:12px; font-weight:normal;">Days</span></div>
            </div>
            <div class="adjustment">
              ${isPositive ? '+' : ''}${log.adjustment} Days
            </div>
            <div>
              <div class="label">New Balance</div>
              <div class="balance-val">${log.new_balance} <span style="font-size:12px; font-weight:normal;">Days</span></div>
            </div>
          </div>

          <h2>Record Details</h2>
          <table>
            <tr><th>Reference ID</th><td>${log.reference_id}</td></tr>
            <tr><th>Employee</th><td>${log.employee_name} (${log.employee_id || '-'})</td></tr>
            <tr><th>Department / Branch</th><td>${log.department || '-'} / ${log.branch || '-'}</td></tr>
            <tr><th>Leave Type</th><td>${log.leave_type}</td></tr>
            <tr><th>Action Type</th><td>${log.action_type}</td></tr>
            <tr><th>Reason</th><td>${log.reason || '-'}</td></tr>
            <tr><th>Remarks</th><td>${log.remarks || '-'}</td></tr>
          </table>

          <h2>Audit Trail</h2>
          <table>
            <tr><th>Performed By</th><td>${log.performed_by}</td></tr>
            <tr><th>Role</th><td>${log.performed_role || '-'}</td></tr>
            <tr><th>Source Module</th><td>${log.source_module || '-'}</td></tr>
            <tr><th>Date & Time</th><td>${log.date} ${log.time}</td></tr>
          </table>

          <div class="footer">
            🔒 This audit record is immutable and cannot be edited or deleted.
          </div>
          
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={onClose} />
      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-[#942392] bg-[#942392]">
            <div>
              <p className="text-[10px] font-bold text-white uppercase tracking-wider">Leave Entitlement Record</p>
              <p className="text-xs font-black text-white mt-0.5">{log.history_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveAsPDF}
                className="h-8 px-2 text-xs bg-white text-[#942392] border-white hover:bg-white/90 hover:text-[#942392]"
              >
                <Download className="w-3 h-3 mr-1" />
                Print / PDF
              </Button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-white hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal body (will be captured for PDF) */}
          <div id="entitlement-record-content" className="flex-1 overflow-y-auto p-5 space-y-5 bg-card">
            {/* Action badge */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${badge.bg} ${badge.text} ${badge.border}`}>
                {badge.label}
              </span>
              <span className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? '+' : ''}{log.adjustment} Days
              </span>
            </div>

            {/* Balance flow */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/50">
              <div className="text-center flex-1">
                <p className="text-[10px] text-foreground font-semibold uppercase">Previous</p>
                <p className="text-xl font-black text-slate-700 dark:text-slate-200">{log.previous_balance}</p>
                <p className="text-[9px] text-foreground">Days</p>
              </div>
              <div className="text-center px-2">
                <p className={`text-lg font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isPositive ? '+' : ''}{log.adjustment}
                </p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] text-foreground font-semibold uppercase">New Balance</p>
                <p className="text-xl font-black text-foreground">{log.new_balance}</p>
                <p className="text-[9px] text-foreground">Days</p>
              </div>
            </div>

            {/* Details grid */}
            {[
              { label: 'History ID',     value: log.history_id },
              { label: 'Reference ID',   value: log.reference_id },
              { label: 'Employee',       value: log.employee_name },
              { label: 'Employee ID',    value: log.employee_id || '—' },
              { label: 'Branch',         value: log.branch || '—' },
              { label: 'Department',     value: log.department || '—' },
              { label: 'Leave Type',     value: log.leave_type },
              { label: 'Action Type',    value: log.action_type },
              { label: 'Reason',         value: log.reason || '—' },
              { label: 'Remarks',        value: log.remarks || '—' },
              { label: 'Performed By',   value: log.performed_by },
              { label: 'Role',           value: log.performed_role || '—' },
              { label: 'Source Module',  value: log.source_module || '—' },
              { label: 'Date',           value: `${log.date}  ${log.time}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5 border-b border-border/30 pb-3">
                <p className="text-[10px] text-foreground font-bold uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-foreground break-all">{value}</p>
              </div>
            ))}
            
            <div className="pt-2 text-[10px] text-foreground text-center">
              🔒 This audit record is immutable and cannot be edited or deleted.
            </div>
          </div>
        </div>
      </div>,
    document.body
  );
}
