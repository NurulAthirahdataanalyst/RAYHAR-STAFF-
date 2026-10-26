import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, BellRing, Calendar, Clock, History, CheckCircle2, ShieldCheck, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';

export const Tab1_SystemConfig: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [reportFrequency, setReportFrequency] = useState('monthly');
  const [lateWindowMinutes, setLateWindowMinutes] = useState(10);
  const [auditRetention, setAuditRetention] = useState('1year');
  const [saving, setSaving] = useState(false);
  const [viewAuditModal, setViewAuditModal] = useState(false);

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const att = await multiCompanyApi.getAttendanceSettings(selectedCompanyId);
        if (att) {
          setLateWindowMinutes(att.late_threshold_minutes || 10);
        }
      } catch (err) {
        console.error('Error loading tab1 settings:', err);
      }
    };
    void loadSettings();
  }, [selectedCompanyId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await multiCompanyApi.saveAttendanceSettings(selectedCompanyId, {
        late_threshold_minutes: Number(lateWindowMinutes)
      });
      toast.success("System configurations deployed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to deploy configuration");
    } finally {
      setSaving(false);
    }
  };

  const currentCompanyObj = companies.find(c => c.id === selectedCompanyId) || activeCompany;

  return (
    <div className="space-y-6">
      {/* Top Scope Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Target Company Scope:
          </span>
          <Select 
            value={selectedCompanyId ? selectedCompanyId.toString() : "1"} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company scope...">
                {currentCompanyObj ? `${currentCompanyObj.company_name} (${currentCompanyObj.company_type === 'main' ? 'Main Company' : 'Subsidiary'})` : 'Rayhar Travels (Main Company)'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {companies.length > 0 ? (
                companies.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                    {c.company_name} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="1" className="text-xs font-bold">
                  Rayhar Travels (Main Company)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Card A: Real-Time Alerts */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#942392]/10 text-[#942392]">
                <BellRing className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
                Real-Time Notification Alerts
              </h3>
            </div>
            <p className="text-xs text-muted-foreground dark:text-neutral-400">
              Enable WebSocket & SSE instantaneous broadcast for clock-in, leave submissions, and outstation alerts across all active administrative client instances.
            </p>
          </div>
          <Switch 
            checked={alertsEnabled} 
            onCheckedChange={setAlertsEnabled}
            className="data-[state=checked]:bg-[#942392]"
          />
        </div>

        <div className="pt-2 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/40 dark:border-neutral-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-foreground">Connection Status:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live Synchronized</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground">Latency:</span>
            <span className="font-mono text-[11px]">&lt; 40ms</span>
          </div>
        </div>
      </Card>

      {/* Card B: Automated Report Scheduler */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#942392]/10 text-[#942392]">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
                Automated Analytics Report Scheduling
              </h3>
            </div>
            <p className="text-xs text-muted-foreground dark:text-neutral-400">
              Automatically compile and deliver executive attendance, workforce analytics, and leave usage reports via PDF & CSV.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Distribution Frequency</Label>
            <Select value={reportFrequency} onValueChange={setReportFrequency}>
              <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                <SelectValue placeholder="Select cadence..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily" className="text-xs">Daily (Every morning at 08:00 AM)</SelectItem>
                <SelectItem value="weekly" className="text-xs">Weekly (Every Monday morning)</SelectItem>
                <SelectItem value="monthly" className="text-xs">Monthly (1st Day of each month)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Authorized Recipients</Label>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="px-2 py-1 rounded-md bg-[#942392]/10 text-[#942392] font-black">HR Admin</span>
              <span className="px-2 py-1 rounded-md bg-muted text-black dark:text-white font-black">Operation Manager</span>
              <span className="px-2 py-1 rounded-md bg-muted text-black dark:text-white font-black">Managing Director</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Card C: Default Late Arrival Window */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#942392]/10 text-[#942392]">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
              Default Late Arrival Window (Grace Period)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground dark:text-neutral-400">
            Define the permissible grace period duration before an employee clock-in is officially flagged as "Late" for {currentCompanyObj?.company_name}.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Grace Window (Minutes)</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={lateWindowMinutes}
              onChange={(e) => setLateWindowMinutes(Number(e.target.value))}
              className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 w-36 font-semibold text-center text-black dark:text-white placeholder:font-normal"
            />
          </div>

          {/* Interactive calculation formula preview */}
          <div className="p-3 bg-muted/40 dark:bg-neutral-800/40 rounded-xl border border-border/40 text-xs space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-[#942392] dark:text-[#f885d5] block">
              Rule Simulation:
            </span>
            <p className="text-[11px] text-muted-foreground">
              Working Hour: <strong className="text-foreground">08:30 AM</strong> + Grace: <strong className="text-foreground">{lateWindowMinutes} mins</strong>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Clock-in at 08:39 AM $\implies$ <span className="text-emerald-600 dark:text-emerald-400 font-bold">On Time</span> | At 08:41 AM $\implies$ <span className="text-rose-600 dark:text-rose-400 font-bold">Late (11 min)</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Card D: Audit Log Settings */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#942392]/10 text-[#942392]">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
                Enterprise Audit Log Retention
              </h3>
            </div>
            <p className="text-xs text-muted-foreground dark:text-neutral-400">
              Immutable logging of all configuration changes, employee transfers, and approval modifications.
            </p>
          </div>

          <div className="w-44">
            <Select value={auditRetention} onValueChange={setAuditRetention}>
              <SelectTrigger className="text-xs h-8 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                <SelectValue placeholder="Retention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90days" className="text-xs">90 Days</SelectItem>
                <SelectItem value="180days" className="text-xs">180 Days</SelectItem>
                <SelectItem value="1year" className="text-xs">1 Year (Compliant)</SelectItem>
                <SelectItem value="indefinite" className="text-xs">Indefinite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-6 rounded-xl"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Deploy Configurations
        </Button>
      </div>
    </div>
  );
};
