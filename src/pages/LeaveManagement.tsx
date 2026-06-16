import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlaneTakeoff, Calculator, Plus, Send, Info, History, Paperclip, Trash2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { API_BASE_URL } from "../config/api";
import {
  getLeaveRequests,
  getLeaveFormFileName,
  getUsedLeaveDays,
  saveLeaveRequest,
  type LeaveType,
  type CutiGantiRow,
} from "@/lib/leaveStorage";

export default function LeaveManagement() {
  const navigate = useNavigate();
  const { userId, userName, userBranch } = useRole();
  const [currentStep, setCurrentStep] = useState(0); // 0: Arahan, 1: Profil, 2: Cuti, 3: Waris
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    namaPenuh: "",
    noKadPengenalan: "",
    tarikhPermohonan: new Date().toISOString().split('T')[0],
    cawangan: "",
    tarikhMula: "",
    tarikhAkhir: "",
    bilanganHari: 0,
    tujuanCuti: "",
    jenisCuti: "",
    lampiranMc: null as File | null,
    // Tambahan untuk pengiraan cuti tahunan
    bakiTerdahulu: 14,
    mohon: 0,
    bakiAkhir: 14,
    // Maklumat Waris
    warisNama: "",
    warisPhone: "",
    warisAlamat: "",
    warisHubungan: "",
    // Tambahan Cuti Ganti & Cuti Tanpa Gaji
    cutiGantiTarikh: "",
    cutiGantiHari: "",
    cutiGantiJam: 0,
    cutiGantiRows: [
      { tarikh: "", hari: "Cuti Minggu", jam: 8 }
    ] as CutiGantiRow[],
    cutiTanpaGajiPhone: "",
    cutiTanpaGajiSignature: false
  });

  const addCutiGantiRow = () => {
    setFormData(prev => ({
      ...prev,
      cutiGantiRows: [...prev.cutiGantiRows, { tarikh: "", hari: "Cuti Minggu", jam: 8 }]
    }));
  };

  const removeCutiGantiRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cutiGantiRows: prev.cutiGantiRows.filter((_, idx) => idx !== index)
    }));
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      namaPenuh: prev.namaPenuh || userName.toUpperCase(),
      cawangan: prev.cawangan || userBranch,
    }));
  }, [userName, userBranch]);

  // Automatik kira bilangan hari & baki cuti
  useEffect(() => {
    if (formData.tarikhMula && formData.tarikhAkhir) {
      const d1 = new Date(formData.tarikhMula);
      const d2 = new Date(formData.tarikhAkhir);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const realDays = diffDays > 0 ? diffDays : 0;
      setFormData(prev => ({
        ...prev,
        bilanganHari: realDays,
        mohon: realDays,
        bakiAkhir: prev.bakiTerdahulu - realDays
      }));
    }
  }, [formData.tarikhMula, formData.tarikhAkhir]);

  const handleNext = () => {
    // Basic validation untuk setiap step
    if (currentStep === 1 && (!formData.namaPenuh || !formData.cawangan)) {
      toast.error("Sila isi maklumat wajib");
      return;
    }
    if (currentStep === 2 && (!formData.tarikhMula || !formData.jenisCuti)) {
      toast.error("Sila lengkapkan butiran cuti");
      return;
    }
    if (currentStep === 2) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(formData.tarikhMula);
      start.setHours(0, 0, 0, 0);
      if (start.getTime() < today.getTime()) {
        toast.error("Tarikh mula cuti mestilah hari ini atau tarikh akan datang sahaja.");
        return;
      }
    }
    if (currentStep === 2 && formData.bilanganHari <= 0) {
      toast.error("Tarikh akhir mesti sama atau selepas tarikh mula");
      return;
    }
    if (currentStep === 2 && (formData.jenisCuti === "Annual/Emergency Leave" || formData.jenisCuti === "Cuti Tahunan" || formData.jenisCuti === "Sick Leave" || formData.jenisCuti === "Cuti Sakit") && formData.bakiAkhir < 0) {
      toast.error("Baki Cuti tidak mencukupi");
      return;
    }
    if (currentStep === 2 && (formData.jenisCuti === "Sick Leave" || formData.jenisCuti === "Cuti Sakit") && !formData.lampiranMc) {
      toast.error("Sila lampirkan fail MC untuk Sick Leave");
      return;
    }
    if (currentStep === 2 && (formData.jenisCuti === "Replacement Leave" || formData.jenisCuti === "Cuti Ganti")) {
      const invalidRow = formData.cutiGantiRows.some(row => !row.tarikh || !row.hari || row.jam <= 0);
      if (invalidRow) {
        toast.error("Sila lengkapkan semua butiran baris Cuti Ganti");
        return;
      }
    }
    if (currentStep === 2 && (formData.jenisCuti === "Unpaid Leave" || formData.jenisCuti === "Cuti Tanpa Gaji") && (!formData.cutiTanpaGajiPhone || !formData.cutiTanpaGajiSignature)) {
      toast.error("Sila lengkapkan butiran Cuti Tanpa Gaji dan tandatangan pengesahan");
      return;
    }

    if (currentStep < 3) setCurrentStep(currentStep + 1);
    else void handleSubmit();
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Tidak dapat mengenal pasti pengguna. Sila log masuk semula.");
      return;
    }

    setLoading(true);
    try {
      const appliedAt = new Date().toISOString();
      const leaveType = formData.jenisCuti as LeaveType;

      const serializedGanti = (formData.jenisCuti === "Replacement Leave" || formData.jenisCuti === "Cuti Ganti")
        ? `\n\n[CUTI_GANTI_DATA:${JSON.stringify(formData.cutiGantiRows)}]`
        : "";

      const payload = new FormData();
      payload.append("user_id", userId);
      payload.append("leave_type", leaveType);
      payload.append("start_date", formData.tarikhMula);
      payload.append("end_date", formData.tarikhAkhir);
      payload.append("days", String(formData.bilanganHari));
      payload.append("reason", formData.tujuanCuti + serializedGanti);
      payload.append("waris_nama", formData.warisNama);
      payload.append("waris_phone", formData.warisPhone);
      payload.append("waris_alamat", formData.warisAlamat);
      payload.append("waris_hubungan", formData.warisHubungan);

      if ((leaveType === "Sick Leave" || leaveType === "Cuti Sakit") && formData.lampiranMc) {
        payload.append("lampiranMc", formData.lampiranMc);
      }
      if (leaveType === "Replacement Leave" || leaveType === "Cuti Ganti") {
        const firstRow = formData.cutiGantiRows[0] || { tarikh: "", hari: "", jam: 0 };
        payload.append("cuti_ganti_tarikh", firstRow.tarikh);
        payload.append("cuti_ganti_hari", firstRow.hari);
        payload.append("cuti_ganti_jam", String(firstRow.jam));
      }
      if (leaveType === "Unpaid Leave" || leaveType === "Cuti Tanpa Gaji") {
        payload.append("cuti_tanpa_gaji_phone", formData.cutiTanpaGajiPhone);
        payload.append("cuti_tanpa_gaji_signature", formData.cutiTanpaGajiSignature ? "true" : "false");
      }

      const response = await fetch(`${API_BASE_URL}/api/leave-requests`, {
        method: "POST",
        body: payload,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Permohonan tidak dapat dihantar");
      }

      saveLeaveRequest({
        id: String(data.leaveRequest?.leave_id || crypto.randomUUID()),
        userId: userId,
        type: leaveType,
        from: formData.tarikhMula,
        to: formData.tarikhAkhir,
        days: formData.bilanganHari,
        status: data.leaveRequest?.status || "Pending HOD",
        reason: formData.tujuanCuti + serializedGanti,
        appliedAt,
        formFileName: getLeaveFormFileName(appliedAt, leaveType, formData.namaPenuh),
        attachmentName: formData.lampiranMc?.name,
        waris_nama: formData.warisNama,
        waris_phone: formData.warisPhone,
        waris_alamat: formData.warisAlamat,
        waris_hubungan: formData.warisHubungan
      });

      toast.success("Permohonan Berjaya Dihantar!", {
        description: "Status permohonan akan dikemaskini dalam dashboard anda."
      });
      navigate("/leave");
    } catch (error) {
      console.error("Leave submit error:", error);
      toast.error("Permohonan gagal dihantar", {
        description: error instanceof Error ? error.message : "Sila cuba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = ["PROFIL KAKITANGAN", "MAKLUMAT CUTI", "MAKLUMAT WARIS"];

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header Rayhar Style */}
      <header className="text-center space-y-2 mb-6 sm:mb-10 pt-4 sm:pt-6">
        <h1 className="text-4xl sm:text-5xl font-black text-[#7B0099] tracking-tighter italic decoration-4 decoration-primary/20">
          RAYHAR GROUP
        </h1>
        <div className="h-1 sm:h-1.5 w-16 sm:w-24 bg-[#7c1b8a] mx-auto rounded-full mb-3 sm:mb-4"></div>
        <h2 className="text-lg sm:text-2xl font-black text-[#7B0099] tracking-wide uppercase px-4">
          Portal Permohonan Cuti
        </h2>
      </header>

      {/* STEP 0: ARAHAN (FRONT PAGE) */}
      {currentStep === 0 && (
        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardContent className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8">
            <div className="bg-[#7B0099]/10 w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] flex items-center justify-center mx-auto rotate-12 transition-transform hover:rotate-0 duration-300">
              <PlaneTakeoff className="w-10 h-10 sm:w-12 sm:h-12 text-[#7B0099]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight">Sila Baca Arahan</h3>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground italic">Pastikan anda mematuhi polisi syarikat sebelum memohon.</p>
            </div>

            <div className="text-left bg-muted/30 p-5 sm:p-6 rounded-[24px] border border-border/50 max-w-sm mx-auto">
              <ul className="space-y-4 text-[11px] sm:text-xs font-bold text-foreground/70 uppercase tracking-widest">
                <li className="flex items-start gap-3">
                  <span className="bg-[#7B0099] text-white text-[9px] rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">1</span>
                  <span>Mohon sekurang-kurangnya <strong className="text-[#7B0099]">7 HARI</strong> awal.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#7B0099] text-white text-[9px] rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">2</span>
                  <span>Pastikan <strong className="text-[#7B0099]">BAKI CUTI</strong> mencukupi sebelum memohon.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#7B0099] text-white text-[9px] rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">3</span>
                  <span>Lampiran hanya diperlukan untuk <strong className="text-[#7B0099]">SICK LEAVE</strong>.</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => setCurrentStep(1)}
              className="w-full sm:w-auto px-12 py-7 bg-[#7B0099] text-white text-xs sm:text-sm font-black uppercase tracking-[0.2em] rounded-[20px] shadow-xl shadow-[#7B0099]/20 hover:bg-[#5e0080] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Mula Permohonan <Plus className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEPS 1-3 */}
      {currentStep > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {/* Step Progress Bar */}
          <div className="flex justify-between items-center px-2 sm:px-4 mb-4">
            {steps.map((label, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black transition-all duration-500 ${currentStep >= idx + 1 ? 'bg-[#7B0099] text-white scale-110 shadow-lg shadow-[#7B0099]/30' : 'bg-muted text-muted-foreground'}`}>
                  {idx + 1}
                </div>
                <span className={`text-[8px] sm:text-[9px] mt-2 font-black text-center uppercase tracking-widest ${currentStep >= idx + 1 ? 'text-[#7B0099]' : 'text-muted-foreground opacity-50'}`}>
                  {label.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#7B0099] to-[#a855f7] text-white p-6 sm:p-8">
              <CardTitle className="flex items-center gap-3 text-base sm:text-lg font-black uppercase tracking-widest">
                <div className="bg-white/20 p-2 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                {steps[currentStep - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">

              {/* SECTION 1: PROFIL KAKITANGAN */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-in slide-in-from-right duration-500">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nama Penuh *</Label>
                    <Input
                      placeholder="NAMA SEPERTI DALAM IC"
                      className="h-12 sm:h-14 border-border/50 bg-muted/30 focus:border-[#7B0099] focus:ring-[#7B0099] rounded-2xl font-bold transition-all"
                      value={formData.namaPenuh}
                      onChange={e => setFormData({ ...formData, namaPenuh: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">No Kad Pengenalan *</Label>
                      <Input
                        placeholder="CONTOH: 900101115566"
                        value={formData.noKadPengenalan}
                        className="h-12 sm:h-14 border-border/50 bg-muted/30 rounded-2xl font-bold"
                        onChange={e => setFormData({ ...formData, noKadPengenalan: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Tarikh Permohonan</Label>
                      <Input
                        type="date"
                        value={formData.tarikhPermohonan}
                        readOnly
                        className="h-12 sm:h-14 border-border/50 bg-muted/20 rounded-2xl font-bold opacity-60"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Cawangan *</Label>
                    <Select value={formData.cawangan} onValueChange={(val) => setFormData({ ...formData, cawangan: val })}>
                      <SelectTrigger className="h-12 sm:h-14 border-border/50 bg-muted/30 rounded-2xl font-bold">
                        <SelectValue placeholder="-- Pilih Cawangan --" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="HQ">Rayhar Travels HQ (Terengganu)</SelectItem>
                        <SelectItem value="KMM">Kemaman</SelectItem>
                        <SelectItem value="TGG">Kuala Terengganu</SelectItem>
                        <SelectItem value="CNH">Cheneh</SelectItem>
                        <SelectItem value="KBG">Kuala Berang</SelectItem>
                        <SelectItem value="DGN">Dungun</SelectItem>
                        <SelectItem value="JTH">Jertih</SelectItem>
                        <SelectItem value="KBR">Kota Baru</SelectItem>
                        <SelectItem value="RMP">Rompin</SelectItem>
                        <SelectItem value="MZM">Muadzam Shah</SelectItem>
                        <SelectItem value="SHA">Shah Alam</SelectItem>
                        <SelectItem value="BBB">Bandar Baru Bangi</SelectItem>
                        <SelectItem value="KUL">Kuala Lumpur</SelectItem>
                        <SelectItem value="IPH">Ipoh</SelectItem>
                        <SelectItem value="MJG">Manjung</SelectItem>
                        <SelectItem value="MLK">Melaka</SelectItem>
                        <SelectItem value="KKS">Kuala Kangsar</SelectItem>
                        <SelectItem value="TWU">Tawau</SelectItem>
                        <SelectItem value="SNS">Seremban</SelectItem>
                        <SelectItem value="AOR">Alor Setar</SelectItem>
                        <SelectItem value="BTM">Bertam</SelectItem>
                        <SelectItem value="BTP">Batu Pahatr</SelectItem>
                        <SelectItem value="JB">Johor Bharu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* SECTION 2: BUTIRAN CUTI */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Tarikh Mula *</Label>
                      <Input 
                        type="date" 
                        value={formData.tarikhMula} 
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setFormData({ ...formData, tarikhMula: e.target.value })} 
                        className="h-12 sm:h-14 border-border/50 bg-muted/30 rounded-2xl font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Tarikh Akhir *</Label>
                      <Input 
                        type="date" 
                        value={formData.tarikhAkhir} 
                        min={formData.tarikhMula || new Date().toISOString().split('T')[0]}
                        onChange={e => setFormData({ ...formData, tarikhAkhir: e.target.value })} 
                        className="h-12 sm:h-14 border-border/50 bg-muted/30 rounded-2xl font-bold" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-[#7B0099]/5 rounded-3xl border-2 border-[#7B0099]/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#7B0099]">Bilangan Hari</span>
                    <span className="text-3xl sm:text-4xl font-black text-[#7B0099] tracking-tighter">{formData.bilanganHari} <span className="text-sm">HARI</span></span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Jenis Cuti *</Label>
                    <Select
                      onValueChange={(val) => {
                        const jenisCuti = val as LeaveType;
                        const usedAnnualLeave = getUsedLeaveDays(
                          getLeaveRequests(),
                          "Annual/Emergency Leave",
                          userId || undefined
                        );
                        
                        // Quota applies to both Annual/Emergency Leave and Sick Leave
                        const isAnnualOrSick = jenisCuti === "Annual/Emergency Leave" || jenisCuti === "Sick Leave";
                        const bakiTerdahulu = isAnnualOrSick ? 14 - usedAnnualLeave : 14;

                        setFormData({
                          ...formData,
                          jenisCuti,
                          bakiTerdahulu,
                          bakiAkhir: bakiTerdahulu - formData.bilanganHari,
                          lampiranMc: (jenisCuti === "Sick Leave" || jenisCuti === "Cuti Sakit") ? formData.lampiranMc : null,
                        });
                      }}
                    >
                      <SelectTrigger className="h-12 sm:h-14 border-border/50 bg-muted/30 rounded-2xl font-bold">
                        <SelectValue placeholder="-- Select Leave Type --" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="Annual/Emergency Leave">Annual/Emergency Leave</SelectItem>
                        <SelectItem value="Replacement Leave">Replacement Leave</SelectItem>
                        <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                        <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pengiraan Cuti Tahunan */}
                  {(formData.jenisCuti === "Annual/Emergency Leave" || formData.jenisCuti === "Cuti Tahunan" || formData.jenisCuti === "Sick Leave" || formData.jenisCuti === "Cuti Sakit") && (
                    <div className="p-5 rounded-[24px] bg-amber-500/10 border border-amber-500/20 space-y-4 animate-in fade-in zoom-in-95">
                      <h4 className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-black text-[10px] uppercase tracking-widest">
                        <Calculator className="w-4 h-4" /> Annual/Emergency Leave Quota Calculator
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1 text-center">
                          <p className="text-[8px] uppercase font-black text-amber-700 dark:text-amber-400 opacity-90">Baki Layak</p>
                          <div className="bg-white dark:bg-slate-900 border border-amber-200/50 dark:border-amber-900/50 text-slate-900 dark:text-slate-100 h-10 flex items-center justify-center rounded-xl font-black text-sm shadow-sm">{formData.bakiTerdahulu}</div>
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-[8px] uppercase font-black text-amber-700 dark:text-amber-400 opacity-90">Mohon</p>
                          <div className="bg-white dark:bg-slate-900 border border-amber-200/50 dark:border-amber-900/50 text-slate-900 dark:text-slate-100 h-10 flex items-center justify-center rounded-xl font-black text-sm shadow-sm">{formData.mohon}</div>
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-[8px] uppercase font-black text-amber-700 dark:text-amber-400 opacity-90">Baki Akhir</p>
                          <div className={`h-10 flex items-center justify-center rounded-xl font-black text-sm text-white ${formData.bakiAkhir < 0 ? 'bg-rose-500 shadow-lg shadow-rose-500/20' : 'bg-[#7B0099] shadow-lg shadow-purple-900/20'}`}>
                            {formData.bakiAkhir}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(formData.jenisCuti === "Sick Leave" || formData.jenisCuti === "Cuti Sakit") && (
                    <div className="space-y-3 rounded-[24px] border border-[#7B0099]/20 bg-[#7B0099]/5 p-5 animate-in fade-in zoom-in-95">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#7B0099]">
                        <Paperclip className="h-4 w-4" />
                        Lampiran MC *
                      </Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="h-14 bg-card border-dashed border-2 border-[#7B0099]/30 rounded-2xl file:mr-4 file:rounded-xl file:border-0 file:bg-[#7B0099] file:px-4 file:py-2 file:text-[10px] file:font-black file:uppercase file:text-white cursor-pointer"
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            lampiranMc: event.target.files?.[0] ?? null,
                          })
                        }
                      />
                      <p className="text-[10px] font-bold text-muted-foreground italic px-1">
                        Format diterima: PDF, JPG, PNG sahaja.
                      </p>
                    </div>
                  )}

                  {(formData.jenisCuti === "Replacement Leave" || formData.jenisCuti === "Cuti Ganti") && (
                    <div className="space-y-4 rounded-[24px] border border-[#7B0099]/20 bg-[#7B0099]/5 p-5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <h4 className="text-purple-700 font-black text-[10px] uppercase tracking-widest">Butiran Cuti Ganti</h4>
                        <Button
                          type="button"
                          size="sm"
                          onClick={addCutiGantiRow}
                          className="h-8 rounded-xl bg-[#7B0099] hover:bg-[#5e0080] text-white gap-1 text-[10px] font-black uppercase tracking-widest px-3 shadow-md shadow-[#7B0099]/20 transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Baris
                        </Button>
                      </div>

                      <div className="space-y-4 divide-y divide-[#7B0099]/10">
                        {formData.cutiGantiRows.map((row, idx) => (
                          <div key={idx} className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${idx > 0 ? 'pt-4' : ''}`}>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-[#7B0099]/70">Tarikh Cuti {idx + 1} *</Label>
                              <Input
                                type="date"
                                value={row.tarikh}
                                onChange={e => {
                                  const newRows = [...formData.cutiGantiRows];
                                  newRows[idx].tarikh = e.target.value;
                                  setFormData({ ...formData, cutiGantiRows: newRows });
                                }}
                                className="h-12 bg-card rounded-xl font-bold"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-[#7B0099]/70">Jenis/Hari Ganti {idx + 1} *</Label>
                              <Input
                                placeholder="Cuti Minggu"
                                value={row.hari}
                                onChange={e => {
                                  const newRows = [...formData.cutiGantiRows];
                                  newRows[idx].hari = e.target.value;
                                  setFormData({ ...formData, cutiGantiRows: newRows });
                                }}
                                className="h-12 bg-card rounded-xl font-bold"
                              />
                            </div>
                            <div className="space-y-2 relative pr-10">
                              <Label className="text-[9px] font-black uppercase text-[#7B0099]/70">Jam Ganti {idx + 1} *</Label>
                              <Input
                                type="number"
                                value={row.jam}
                                onChange={e => {
                                  const newRows = [...formData.cutiGantiRows];
                                  newRows[idx].jam = parseInt(e.target.value) || 0;
                                  setFormData({ ...formData, cutiGantiRows: newRows });
                                }}
                                className="h-12 bg-card rounded-xl font-bold"
                              />
                              {formData.cutiGantiRows.length > 1 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeCutiGantiRow(idx)}
                                  className="absolute right-0 bottom-0 h-12 w-8 rounded-xl p-0 flex items-center justify-center shadow-sm hover:bg-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-white" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Sebab / Tujuan *</Label>
                    <Textarea
                      placeholder="CONTOH: URUSAN KELUARGA / KECEMASAN..."
                      className="min-h-[120px] border-border/50 bg-muted/30 rounded-[20px] p-4 text-sm font-bold transition-all"
                      value={formData.tujuanCuti}
                      onChange={e => setFormData({ ...formData, tujuanCuti: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: WARIS */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in slide-in-from-right duration-500">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nama Waris / Kecemasan *</Label>
                    <Input
                      value={formData.warisNama}
                      className="h-12 sm:h-14 border-border/50 bg-muted/30 rounded-2xl font-bold"
                      onChange={e => setFormData({ ...formData, warisNama: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">No Telefon Waris *</Label>
                      <Input
                        value={formData.warisPhone}
                        className="h-12 sm:h-14 border-border/50 bg-muted/30 rounded-2xl font-bold"
                        onChange={e => setFormData({ ...formData, warisPhone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Hubungan *</Label>
                      <Input
                        placeholder="CONTOH: ISTERI / AYAH"
                        value={formData.warisHubungan}
                        className="h-12 sm:h-14 border-border/50 bg-muted/30 rounded-2xl font-bold"
                        onChange={e => setFormData({ ...formData, warisHubungan: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Alamat Waris *</Label>
                    <Textarea
                      value={formData.warisAlamat}
                      className="min-h-[100px] border-border/50 bg-muted/30 rounded-2xl p-4 font-bold"
                      onChange={e => setFormData({ ...formData, warisAlamat: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex gap-3 items-start">
                    <Info className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-rose-800 leading-relaxed uppercase tracking-tight">
                      DENGAN MENEKAN BUTANG <strong>HANTAR</strong>, SAYA MENGESAHKAN BAHAWA MAKLUMAT YANG DIBERIKAN ADALAH BENAR.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigasi Butang */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/50">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 h-12 sm:h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Kembali
                </Button>
                <Button
                  type="button"
                  className="flex-[2] h-12 sm:h-14 rounded-2xl gap-2 bg-[#7B0099] font-black text-[10px] uppercase tracking-widest text-white shadow-lg shadow-[#7B0099]/20 hover:bg-[#5e0080] active:scale-95 transition-all"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {currentStep === 3 ? (
                    loading ? "MENGHANTAR..." : <><Send className="w-4 h-4" /> Hantar Permohonan</>
                  ) : (
                    "Seterusnya"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
