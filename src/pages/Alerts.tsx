import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchAlerts();
    const es = new EventSource(`${API_BASE_URL}/api/alerts/stream`);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data || '{}');
        if (payload && payload.alert) {
          setAlerts((prev) => {
            const idx = prev.findIndex(a => a.id === payload.alert.id);
            if (idx >= 0) {
              const copy = [...prev]; copy[idx] = payload.alert; return copy;
            }
            return [payload.alert, ...prev];
          });
        }
      } catch (e) { console.error(e); }
    };
    es.onerror = (e) => {
      console.error('Alerts SSE error', e);
      try { es.close(); } catch (e) {}
    };
    return () => { try { es.close(); } catch (e) {} };
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts?limit=200`);
      const j = await res.json();
      if (j && j.success) setAlerts(j.alerts || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const ack = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/${id}/ack`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': user?.role || '' } });
      const j = await res.json();
      if (j && j.success) {
        setAlerts((s) => s.map(a => a.id === j.alert.id ? j.alert : a));
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-3">Alerts</h2>
      <div className="overflow-auto border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Payload</TableHead>
              <TableHead>Ack</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((a) => (
              <TableRow key={a.id} className={a.acknowledged ? 'opacity-60' : ''}>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.type}</TableCell>
                <TableCell>{a.user_id}</TableCell>
                <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                <TableCell><pre className="whitespace-pre-wrap text-xs">{typeof a.payload === 'string' ? a.payload : JSON.stringify(a.payload)}</pre></TableCell>
                <TableCell>
                  {a.acknowledged ? 'Acknowledged' : (
                    <Button size="sm" onClick={() => ack(a.id)}>Acknowledge</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
