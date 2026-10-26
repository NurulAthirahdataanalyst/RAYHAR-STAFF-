import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Camera, Save, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';

export const Tab7_AttendanceConfig: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);

  const [lateThreshold, setLateThreshold] = useState(10);
  const [earlyCheckout, setEarlyCheckout] = useState(0);
  const [minHours, setMinHours] = useState(8.0);
  const [otEnabled, setOtEnabled] = useState(false);
  const [gpsRequired, setGpsRequired] = useState(true);
  const [geofenceEnforce, setGeofenceEnforce] = useState<'strict' | 'relaxed' | 'disabled'>('strict');
  const [faceVerify, setFaceVerify] = useState(false);
  const [ruleVersion, setRuleVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeCompany) {
      setSelectedCompanyId(activeCompany.id);
    } else if (companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [activeCompany, companies]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await multiCompanyApi.getAttendanceSettings(selectedCompanyId);
        if (res) {
          setLateThreshold(res.late_threshold_minutes || 10);
          setEarlyCheckout(res.early_checkout_minutes || 0);
          setMinHours(res.min_working_hours || 8.0);
          setOtEnabled(Boolean(res.overtime_enabled));
          setGpsRequired(res.gps_required !== false);
          setGeofenceEnforce(res.geofence_enforcement || 'strict');
          setFaceVerify(Boolean(res.face_verification_required));
          setRuleVersion(res.calculation_rule_version || 1);
        }
      } catch (err) {
        console.error('Error loading attendance settings:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchSettings();
  }, [selectedCompanyId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await multiCompanyApi.saveAttendanceSettings(selectedCompanyId, {
        late_threshold_minutes: Number(lateThreshold),
        early_checkout_minutes: Number(earlyCheckout),
        min_working_hours: Number(minHours),
        overtime_enabled: otEnabled,
        gps_required: gpsRequired,
        geofence_enforcement: geofenceEnforce,
        face_verification_required: faceVerify
      });
      toast.success("Attendance configurations updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save attendance settings");
    } finally {
      setSaving(false);
    }
  };

  const currentCompany = companies.find(c => c.id === selectedCompanyId) || activeCompany;

  return (
    <div className="space-y-6">
      {/* Top Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#942392]" />
            <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
              Attendance Policy Scope:
            </span>
          </div>
          <Select 
            value={selectedCompanyId ? selectedCompanyId.toString() : ""} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-64 text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-black text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company...">
                {currentCompany ? `${currentCompany.company_name} (${currentCompany.company_type === 'main' ? 'Main' : 'Sub'})` : 'Select company...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                  {c.company_name} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-[#942392]" />
          <span>Rule Version: <strong className="text-black dark:text-white">v{ruleVersion}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Time Parameters */}
        <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#942392]" />
              Time Boundaries & Overtime Rules
            </h4>
            <p className="text-[11px] text-muted-foreground">Thresholds for calculating lateness and minimum shift completion.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Late Arrival Window</Label>
                <span className="text-[10px] text-muted-foreground block">Grace period before mark as Late</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(Number(e.target.value))}
                  className="w-20 text-xs h-8 text-center font-black text-black dark:text-white"
                />
                <span className="text-xs font-bold text-muted-foreground">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Early Checkout Threshold</Label>
                <span className="text-[10px] text-muted-foreground block">Permissible early departure allowance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={earlyCheckout}
                  onChange={(e) => setEarlyCheckout(Number(e.target.value))}
                  className="w-20 text-xs h-8 text-center font-black text-black dark:text-white"
                />
                <span className="text-xs font-bold text-muted-foreground">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Minimum Daily Working Hours</Label>
                <span className="text-[10px] text-muted-foreground block">Hours required for full-day attendance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  step="0.5"
                  value={minHours}
                  onChange={(e) => setMinHours(Number(e.target.value))}
                  className="w-20 text-xs h-8 text-center font-black text-black dark:text-white"
                />
                <span className="text-xs font-bold text-muted-foreground">hrs</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Overtime (OT) Automatic Calculation</Label>
                <span className="text-[10px] text-muted-foreground block">Track hours logged beyond schedule end time</span>
              </div>
              <Switch checked={otEnabled} onCheckedChange={setOtEnabled} className="data-[state=checked]:bg-[#942392]" />
            </div>
          </div>
        </Card>

        {/* Card 2: GPS Geofencing & Biometrics */}
        <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#942392]" />
              GPS Geofencing & Biometric Validation
            </h4>
            <p className="text-[11px] text-muted-foreground">Enforce physical branch boundary checks and camera capture.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Require GPS Location Capture</Label>
                <span className="text-[10px] text-muted-foreground block">Mandatory location permission on device</span>
              </div>
              <Switch checked={gpsRequired} onCheckedChange={setGpsRequired} className="data-[state=checked]:bg-[#942392]" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Geofence Enforcement Strictness</Label>
              <Select value={geofenceEnforce} onValueChange={(val: any) => setGeofenceEnforce(val)}>
                <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-black text-black dark:text-white">
                  <SelectValue placeholder="Strictness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict" className="text-xs font-bold">
                    Strict (Reject clock-in if outside radius threshold)
                  </SelectItem>
                  <SelectItem value="relaxed" className="text-xs">
                    Relaxed (Allow check-in but flag with warning badge)
                  </SelectItem>
                  <SelectItem value="disabled" className="text-xs text-rose-500 font-bold">
                    Disabled (Allow anywhere check-in)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#942392]" />
                  Biometric Face Snapshot Verification
                </Label>
                <span className="text-[10px] text-muted-foreground block">Take selfie verification upon check-in</span>
              </div>
              <Switch checked={faceVerify} onCheckedChange={setFaceVerify} className="data-[state=checked]:bg-[#942392]" />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-6 rounded-xl"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Attendance Rules
        </Button>
      </div>
    </div>
  );
};
