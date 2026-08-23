import { X, Download } from "lucide-react";
import { EntitlementHistoryLog } from "@/lib/entitlementHistory";
import { getBadge } from "./EntitlementActivityCard";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EntitlementDetailModal({ log, onClose }: { log: EntitlementHistoryLog; onClose: () => void }) {
  const badge = getBadge(log.action_type);
  const isPositive = log.adjustment >= 0;
  const [isExporting, setIsExporting] = useState(false);

  const saveAsPDF = async () => {
    setIsExporting(true);
    try {
      const el = document.getElementById("entitlement-record-content");
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`Entitlement_Record_${log.history_id}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={onClose} />
        {/* Modal */}
        <div className="relative w-full max-w-md max-h-[90vh] bg-white dark:bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto">
          {/* Modal header */}
          <div className="flex items-center justify-between p-5 border-b border-[#7B0099] bg-[#7B0099]">
            <div>
              <p className="text-[10px] font-bold text-white uppercase tracking-wider">Leave Entitlement Record</p>
              <p className="text-xs font-black text-white mt-0.5">{log.history_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveAsPDF}
                disabled={isExporting}
                className="h-8 px-2 text-xs bg-white text-[#7B0099] border-white hover:bg-white/90 hover:text-[#7B0099]"
              >
                <Download className="w-3 h-3 mr-1" />
                PDF
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
          <div id="entitlement-record-content" className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-card">
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
      </div>
    </>
  );
}
