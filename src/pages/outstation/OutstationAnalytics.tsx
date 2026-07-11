import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/api";
import { Loader2, Calendar, MapPin } from "lucide-react";

function formatShortDate(dStr: string) {
  if (!dStr) return "—";
  return new Date(dStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function OutstationAnalytics() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation`);
      const data = await res.json();
      if (data.success) setAssignments(data.assignments || []);
    } catch (e) {
      console.error('fetch assignments', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAssignments();

    // SSE: listen for presence/company_leave/outstation updates and refresh
    const es = new EventSource(`${API_BASE_URL}/api/presence/stream`);
    es.onmessage = (ev) => {
      try { const payload = JSON.parse(ev.data); if (payload && (payload.type === 'refresh' || payload.type === 'company_leave' || payload.type === 'clock-in' || payload.type === 'clock-out' || payload.type === 'presence_update')) { void fetchAssignments(); } }
      catch (e) { void fetchAssignments(); }
    };
    es.onerror = (err) => { console.error('SSE error', err); };
    return () => es.close();
  }, [fetchAssignments]);

  // Group into event rows by project/purpose (Event Name)
  const events = useMemo(() => {
    const groups: Record<string, any> = {};
    for (const a of assignments) {
      const eventName = (a.project && a.project !== '-') ? a.project : (a.purpose && a.purpose !== '-') ? a.purpose : 'General';
      const key = `${eventName}::${a.destination}::${a.start_date}::${a.end_date}`;
      if (!groups[key]) {
        groups[key] = { eventName, destination: a.destination, purpose: a.purpose || a.project || '', start_date: a.start_date, end_date: a.end_date, status: a.status, count: 0 };
      }
      groups[key].count = (groups[key].count || 0) + 1;
      // Keep latest status
      groups[key].status = a.status || groups[key].status;
    }
    return Object.values(groups).sort((a,b) => (b.start_date || '').localeCompare(a.start_date || ''));
  }, [assignments]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 dark:text-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Outstation Analytics</h2>
          <div className="flex items-center gap-2">
            <Button onClick={() => void fetchAssignments()} className="h-9">Refresh</Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="px-4 py-3 border-b"> 
            <CardTitle className="text-lg font-bold">Recent Outstation</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-purple-700" /></div>
            ) : events.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No recent outstations found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/80">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Event Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Destination</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Purpose</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {events.map((e, i) => (
                      <tr key={i} className="hover:bg-white/50">
                        <td className="px-4 py-3 font-semibold text-sm">{e.eventName}</td>
                        <td className="px-4 py-3 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-600" />{e.destination}</td>
                        <td className="px-4 py-3 text-sm">{e.purpose}</td>
                        <td className="px-4 py-3 text-sm">{formatShortDate(e.start_date)} - {formatShortDate(e.end_date)}</td>
                        <td className="px-4 py-3 text-sm">{e.status}</td>
                        <td className="px-4 py-3 text-sm">{e.count} Staff</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

