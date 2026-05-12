import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlaneTakeoff, Calculator, Plus, Send, Info, History, Paperclip } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import {
  getLeaveRequests,
  getLeaveFormFileName,
  getUsedLeaveDays,
  saveLeaveRequest,
  type LeaveType,
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
    cutiTanpaGajiPhone: "",
    cutiTanpaGajiSignature: false
  });

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
    if (currentStep === 2 && formData.bilanganHari <= 0) {
      toast.error("Tarikh akhir mesti sama atau selepas tarikh mula");
      return;
    }
    if (currentStep === 2 && formData.jenisCuti === "Cuti Tahunan" && formData.bakiAkhir < 0) {
      toast.error("Baki Cuti Tahunan tidak mencukupi");
      return;
    }
    if (currentStep === 2 && formData.jenisCuti === "Cuti Sakit" && !formData.lampiranMc) {
      toast.error("Sila lampirkan fail MC untuk Cuti Sakit");
      return;
    }
    if (currentStep === 2 && formData.jenisCuti === "Cuti Ganti" && (!formData.cutiGantiTarikh || !formData.cutiGantiHari || formData.cutiGantiJam <= 0)) {
      toast.error("Sila lengkapkan butiran Cuti Ganti");
      return;
    }
    if (currentStep === 2 && formData.jenisCuti === "Cuti Tanpa Gaji" && (!formData.cutiTanpaGajiPhone || !formData.cutiTanpaGajiSignature)) {
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

      const payload = new FormData();
      payload.append("employee_id", userId);
      payload.append("leave_type", leaveType);
      payload.append("start_date", formData.tarikhMula);
      payload.append("end_date", formData.tarikhAkhir);
      payload.append("days", String(formData.bilanganHari));
      payload.append("reason", formData.tujuanCuti);
      payload.append("waris_nama", formData.warisNama);
      payload.append("waris_phone", formData.warisPhone);
      payload.append("waris_alamat", formData.warisAlamat);
      payload.append("waris_hubungan", formData.warisHubungan);

      if (leaveType === "Cuti Sakit" && formData.lampiranMc) {
        payload.append("lampiranMc", formData.lampiranMc);
      }
      if (leaveType === "Cuti Ganti") {
        payload.append("cuti_ganti_tarikh", formData.cutiGantiTarikh);
        payload.append("cuti_ganti_hari", formData.cutiGantiHari);
        payload.append("cuti_ganti_jam", String(formData.cutiGantiJam));
      }
      if (leaveType === "Cuti Tanpa Gaji") {
        payload.append("cuti_tanpa_gaji_phone", formData.cutiTanpaGajiPhone);
        payload.append("cuti_tanpa_gaji_signature", formData.cutiTanpaGajiSignature ? "true" : "false");
      }

      const response = await fetch("https://rayhar-staff-production.up.railway.app/api/leave-requests", {
        method: "POST",
        body: payload,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Permohonan tidak dapat dihantar");
      }

      saveLeaveRequest({
        id: String(data.leaveRequest?.leave_id || crypto.randomUUID()),
        employeeId: userId,
        type: leaveType,
        from: formData.tarikhMula,
        to: formData.tarikhAkhir,
        days: formData.bilanganHari,
        status: "Pending HOD",
        reason: formData.tujuanCuti,
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
    <div className="max-w-3xl rounded-full mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header Rayhar Style */}
      <header className="text-center space-y-2 mb-10 pt-6">
        <h1 className="text-5xl font-black text-[#601b8a] tracking-tighter italic italic decoration-4 decoration-primary/20">
          RAYHAR GROUP
        </h1>
        <div className="h-1.5 w-24 bg-[#7c1b8a] mx-auto rounded-full mb-4"></div>
        <h2 className="text-2xl font-bold text-[#601b8a] tracking-wide uppercase">
          Portal Permohonan Cuti
        </h2>
      </header>

      {/* STEP 0: ARAHAN (FRONT PAGE) */}
      {currentStep === 0 && (
        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-10 text-center space-y-8">
            <div className="bg-purple-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto rotate-12 transition-transform hover:rotate-0 duration-300">
              <PlaneTakeoff className="w-12 h-12 text-[#601b8a]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-800">Sila Baca Arahan</h3>
              <p className="text-sm text-muted-foreground">Pastikan anda mematuhi polisi syarikat sebelum memohon.</p>
            </div>

            <div className="text-left bg-slate-50 p-6 rounded-2xl border border-slate-100 max-w-sm mx-auto">
              <ul className="space-y-4 text-sm font-medium text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="bg-[#601b8a] text-white text-[10px] rounded-full px-1.5 py-0.5 mt-1">1</span>
                  <span>Mohon sekurang-kurangnya <strong>7 hari</strong> awal.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#601b8a] text-white text-[10px] rounded-full px-1.5 py-0.5 mt-1">2</span>
                  <span>Pastikan baki cuti mencukupi sebelum memohon.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#601b8a] text-white text-[10px] rounded-full px-1.5 py-0.5 mt-1">3</span>
                  <span>Lampiran hanya diperlukan untuk <strong>Cuti Sakit (MC)</strong>.</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => setCurrentStep(1)}
              size="lg"
              className="w-full md:w-auto px-16 py-7 bg-[#601b8a] text-lg rounded-2xl shadow-xl shadow-purple-900/20 hover:bg-[#4b1470] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Mula Permohonan <Plus className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEPS 1-3 */}
      {currentStep > 0 && (
        <div className="space-y-6">
          {/* Step Progress Bar */}
          <div className="flex justify-between items-center px-4 mb-4">
            {steps.map((label, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep >= idx + 1 ? 'bg-[#601b8a] text-white scale-110 shadow-lg shadow-primary/30' : 'bg-slate-200 text-slate-500'}`}>
                  {idx + 1}
                </div>
                <span className={`text-[10px] mt-2 font-bold text-center uppercase tracking-tighter ${currentStep >= idx + 1 ? 'text-[#601b8a]' : 'text-slate-400'}`}>
                  {label.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          <Card className="border-none shadow-2xl overflow-hidden rounded-3xl">
            <CardHeader className="bg-[#601b8a] text-white p-6">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="bg-white/15 p-2 rounded-lg text-white">
                  <History className="w-5 h-5" />
                </span>
                {steps[currentStep - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6 bg-white">

              {/* SECTION 1: PROFIL KAKITANGAN */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-in slide-in-from-right duration-500">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Nama Penuh *</Label>
                    <Input
                      placeholder="NAMA SEPERTI DALAM IC"
                      className="h-12 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      value={formData.namaPenuh}
                      onChange={e => setFormData({ ...formData, namaPenuh: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">No Kad Pengenalan *</Label>
                      <Input placeholder="Contoh: 900101115566" value={formData.noKadPengenalan} onChange={e => setFormData({ ...formData, noKadPengenalan: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Tarikh Permohonan</Label>
                      <Input type="date" value={formData.tarikhPermohonan} readOnly className="bg-slate-50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Cawangan *</Label>
                    <Select value={formData.cawangan} onValueChange={(val) => setFormData({ ...formData, cawangan: val })}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="-- Pilih Cawangan --" />
                      </SelectTrigger>
                      <SelectContent>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">Tarikh Mula *</Label>
                      <Input type="date" value={formData.tarikhMula} onChange={e => setFormData({ ...formData, tarikhMula: e.target.value })} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Tarikh Akhir *</Label>
                      <Input type="date" value={formData.tarikhAkhir} onChange={e => setFormData({ ...formData, tarikhAkhir: e.target.value })} className="h-12" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border-2 border-purple-100">
                    <span className="font-bold text-slate-700">Bilangan Hari:</span>
                    <span className="text-3xl font-black text-[#601b8a] tracking-tighter">{formData.bilanganHari} HARI</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">Jenis Cuti *</Label>
                    <Select
                      onValueChange={(val) => {
                        const jenisCuti = val as LeaveType;
                        const usedAnnualLeave = getUsedLeaveDays(
                          getLeaveRequests(),
                          "Cuti Tahunan",
                          userId || undefined
                        );
                        const bakiTerdahulu = jenisCuti === "Cuti Tahunan" ? 14 - usedAnnualLeave : 14;

                        setFormData({
                          ...formData,
                          jenisCuti,
                          bakiTerdahulu,
                          bakiAkhir: bakiTerdahulu - formData.bilanganHari,
                          lampiranMc: jenisCuti === "Cuti Sakit" ? formData.lampiranMc : null,
                        });
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="-- Pilih Jenis Cuti --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cuti Tahunan">Cuti Tahunan</SelectItem>
                        <SelectItem value="Cuti Ganti">Cuti Ganti</SelectItem>
                        <SelectItem value="Cuti Tanpa Gaji">Cuti Tanpa Gaji</SelectItem>
                        <SelectItem value="Cuti Sakit">Cuti Sakit (MC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pengiraan Cuti Tahunan (Dinamik) */}
                  {formData.jenisCuti === "Cuti Tahunan" && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-4 animate-in fade-in zoom-in-95">
                      <h4 className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                        <Calculator className="w-4 h-4" /> Pengiraan Cuti Tahunan
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-amber-600">Baki Layak</Label>
                          <Input readOnly value={formData.bakiTerdahulu} className="bg-white h-9 text-center font-bold" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-amber-600">Mohon</Label>
                          <Input readOnly value={formData.mohon} className="bg-white h-9 text-center font-bold" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-amber-600">Baki Akhir</Label>
                          <Input
                            readOnly
                            value={formData.bakiAkhir}
                            className={`h-9 text-center font-bold text-white ${formData.bakiAkhir < 0 ? 'bg-red-500' : 'bg-[#601b8a]'}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.jenisCuti === "Cuti Sakit" && (
                    <div className="space-y-2 rounded-2xl border border-purple-100 bg-purple-50 p-4 animate-in fade-in zoom-in-95">
                      <Label className="flex items-center gap-2 text-slate-700">
                        <Paperclip className="h-4 w-4 text-[#601b8a]" />
                        Lampiran MC *
                      </Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="h-12 bg-white file:mr-4 file:rounded-lg file:border-0 file:bg-[#601b8a] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            lampiranMc: event.target.files?.[0] ?? null,
                          })
                        }
                      />
                      <p className="text-xs font-medium text-slate-500">
                        Terima fail PDF, JPG, JPEG atau PNG sahaja.
                      </p>
                    </div>
                  )}

                  {formData.jenisCuti === "Cuti Ganti" && (
                    <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 animate-in fade-in zoom-in-95">
                      <h4 className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                        Butiran Cuti Ganti
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-blue-600">Tarikh Cuti *</Label>
                          <Input type="date" value={formData.cutiGantiTarikh} onChange={e => setFormData({ ...formData, cutiGantiTarikh: e.target.value })} className="h-12 bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-blue-600">Tarikh/Hari Cuti Ganti *</Label>
                          <Input placeholder="Cuti Minggu/Peristiwa" value={formData.cutiGantiHari} onChange={e => setFormData({ ...formData, cutiGantiHari: e.target.value })} className="h-12 bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-blue-600">Jam Ganti *</Label>
                          <Input type="number" placeholder="0" value={formData.cutiGantiJam} onChange={e => setFormData({ ...formData, cutiGantiJam: parseInt(e.target.value) || 0 })} className="h-12 bg-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.jenisCuti === "Cuti Tanpa Gaji" && (
                    <div className="space-y-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 animate-in fade-in zoom-in-95">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-rose-600">No. Tel H/P *</Label>
                        <Input placeholder="Contoh: 012-3456789" value={formData.cutiTanpaGajiPhone} onChange={e => setFormData({ ...formData, cutiTanpaGajiPhone: e.target.value })} className="h-12 bg-white" />
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <input
                          type="checkbox"
                          id="signature"
                          className="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                          checked={formData.cutiTanpaGajiSignature}
                          onChange={e => setFormData({ ...formData, cutiTanpaGajiSignature: e.target.checked })}
                        />
                        <Label htmlFor="signature" className="text-sm font-semibold text-rose-800 cursor-pointer">
                          Tandatangan Kakitangan (Pengesahan Elektronik) *
                        </Label>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-slate-700">Tujuan / Sebab *</Label>
                    <Textarea
                      placeholder="Contoh: Urusan keluarga di kampung"
                      className="min-h-[100px] border-slate-200"
                      value={formData.tujuanCuti}
                      onChange={e => setFormData({ ...formData, tujuanCuti: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: WARIS */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in slide-in-from-right duration-500">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Nama Waris / Kecemasan *</Label>
                    <Input value={formData.warisNama} onChange={e => setFormData({ ...formData, warisNama: e.target.value })} className="h-12" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">No Telefon Waris *</Label>
                      <Input value={formData.warisPhone} onChange={e => setFormData({ ...formData, warisPhone: e.target.value })} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Hubungan *</Label>
                      <Input placeholder="Contoh: Isteri / Ayah" value={formData.warisHubungan} onChange={e => setFormData({ ...formData, warisHubungan: e.target.value })} className="h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Alamat Waris *</Label>
                    <Textarea value={formData.warisAlamat} onChange={e => setFormData({ ...formData, warisAlamat: e.target.value })} className="min-h-[80px]" />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl flex gap-3 text-xs text-slate-500 items-start">
                    <Info className="w-5 h-5 text-[#601b8a] shrink-0" />
                    <p>Dengan menekan butang <strong>Hantar</strong>, saya mengesahkan bahawa maklumat yang diberikan adalah benar dan saya bertanggungjawab sepenuhnya ke atas permohonan ini.</p>
                  </div>
                </div>
              )}

              {/* Navigasi Butang */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Kembali
                </Button>
                <Button
                  type="button"
                  className="flex-[2] h-12 rounded-xl gap-2 bg-[#601b8a] font-bold text-white shadow-lg shadow-purple-900/20 hover:bg-[#4b1470]"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {currentStep === 3 ? (
                    loading ? "MENGHANTAR..." : <><Send className="w-4 h-4" /> HANTAR PERMOHONAN</>
                  ) : (
                    "SETERUSNYA"
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
