import { Clock, BarChart3, Download, Construction } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

export default function AttendanceReports() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader />

        {/* Coming Soon Banner */}
        <div className="mt-6 rounded-2xl overflow-hidden border border-border shadow-sm bg-card">
          <div className="h-2 bg-gradient-to-r from-[#7B0099] via-[#a855f7] to-[#7B0099]" />
          <div className="p-10 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shadow-inner">
              <Construction className="w-10 h-10 text-[#7B0099]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground mb-2">Attendance Reports</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Generate detailed attendance reports for your team. Export monthly summaries,
                track punctuality, and identify patterns in absenteeism.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-[#7B0099] text-xs font-bold uppercase tracking-widest">
              <Construction className="w-3.5 h-3.5" /> Coming Soon
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { icon: Clock, title: "Monthly Summary", desc: "Full month attendance summary per employee with totals." },
            { icon: BarChart3, title: "Punctuality Report", desc: "Late arrival frequencies and on-time percentage breakdowns." },
            { icon: Download, title: "Export to Excel", desc: "Download reports in Excel or PDF format for record keeping." },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 opacity-60">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-[#7B0099]" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
