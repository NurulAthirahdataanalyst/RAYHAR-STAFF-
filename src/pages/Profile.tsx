import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { User, Mail, Building2, ShieldCheck, Calendar, MapPin, Lock, Loader2, ArrowLeft, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar, getSavedAvatar } from "@/utils/avatarUtils";
import { AvatarPickerModal } from "@/components/profile/AvatarPickerModal";

const getFullBranchName = (code: string) => {
  const branchNames: Record<string, string> = {
    "HQ": "Rayhar HQ",
    "KMM": "Kemaman",
    "TGG": "Kuala Terengganu",
    "CNH": "Cheneh",
    "KBG": "Kuala Berang",
    "DGN": "Dungun",
    "JTH": "Jertih",
    "KBR": "Kota Baru",
    "RMP": "Rompin",
    "MZM": "Muadzam Shah",
    "SHA": "Shah Alam",
    "BBB": "Bandar Baru Bangi",
    "KUL": "Kuala Lumpur",
    "IPH": "Ipoh",
    "MJG": "Manjung",
    "MLK": "Melaka",
    "KKS": "Kuala Kangsar",
    "TWU": "Tawau",
    "SNS": "Seremban",
    "AOR": "Alor Setar",
    "BTM": "Bertam",
    "BTP": "Batu Pahat",
    "JB": "Johor Bharu"
  };
  const cleanCode = (code || "").trim().toUpperCase();
  if (!cleanCode) return "N/A";
  const name = branchNames[cleanCode];
  if (name) {
    return `${name.toUpperCase()} (${cleanCode})`;
  }
  return cleanCode;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role: resolvedRole, userName, userBranch, userDepartment, userId } = useRole();
  const email = user?.email || ""; 

  const [showResetBox, setShowResetBox] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarId, setAvatarId] = useState<string>(() => getSavedAvatar(userId || user?.id));

  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      if (e?.detail) setAvatarId(e.detail);
      else setAvatarId(getSavedAvatar(userId || user?.id));
    };
    window.addEventListener("avatarChanged", handleAvatarUpdate);
    return () => window.removeEventListener("avatarChanged", handleAvatarUpdate);
  }, [userId, user?.id]);

  const handlePasswordReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = resetEmail.trim() || email;
    if (!targetEmail) {
      toast.error("Please enter your email to proceed.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    try {
      // 1. Supabase Auth reset
      try {
        await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      } catch (sbErr) {
        console.warn("Supabase auth reset warning:", sbErr);
      }

      // 2. Backend reset
      try {
        await fetch(`${API_BASE_URL}/api/request-password-reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail }),
        });
      } catch (apiErr) {
        console.warn("Backend reset API warning:", apiErr);
      }

      toast.success("If an account exists with this email address, a password reset link has been sent. Please check your inbox.");
      setShowResetBox(false);
      setResetEmail("");
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast.success("If an account exists with this email address, a password reset link has been sent. Please check your inbox.");
      setShowResetBox(false);
      setResetEmail("");
    } finally {
      setResetLoading(false);
    }
  };

  if (!user) return null;

  const profileItems = [
    { label: "Full Name", value: userName || "N/A", icon: User },
    { label: "Email Address", value: email || "N/A", icon: Mail },
    { label: "User ID", value: userId || "N/A", icon: ShieldCheck },
    { label: "Branch", value: getFullBranchName(userBranch || "HQ"), icon: Building2 },
    { label: "Department", value: userDepartment || "N/A", icon: MapPin },
    { label: "Status", value: "Active", icon: Calendar },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {/* Back to Dashboard */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="mb-1 gap-2 px-0 text-[#942392] hover:bg-transparent hover:text-[#5e0080] transition-colors touch-target no-global-hover cursor-pointer"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Back to Dashboard
          </span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 items-start">
        {/* Left Column (Profile Info & Security Card) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-3 sm:gap-4">
          {/* Profile Info Card - Modern Sky Banner with Overlapping Avatar & Rainbow Ring (like Screenshot 1) */}
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-card/90 backdrop-blur-md rounded-[32px] overflow-hidden transition-all">
            {/* 1. Sky Banner with soft clouds and '+' button */}
            <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-gradient-to-b from-[#8fc1e8] via-[#b6d6ee] to-[#e4eff8] dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
              {/* Soft decorative cloud elements */}
              <div className="absolute inset-0 pointer-events-none opacity-50">
                <div className="absolute -left-6 bottom-0 w-36 h-20 bg-white rounded-full blur-xs" />
                <div className="absolute left-14 bottom-4 w-44 h-24 bg-white/90 rounded-full blur-sm" />
                <div className="absolute right-2 bottom-0 w-44 h-22 bg-white rounded-full blur-xs" />
                <div className="absolute right-16 top-2 w-32 h-16 bg-white/70 rounded-full blur-sm" />
              </div>

              {/* Circular plus (+) button in top right of banner */}
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-md backdrop-blur-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/50 dark:border-slate-700 hover:bg-white z-10 group"
                title="Change Avatar"
              >
                <Plus className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* 2. Overlapping Avatar with Rainbow Ring */}
            <div className="relative -mt-14 sm:-mt-16 flex justify-center mb-2.5">
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                className="relative group cursor-pointer outline-none"
                title="Click to change profile avatar"
              >
                {/* Rainbow Gradient Ring (like Instagram/Story border in Screenshot 1) */}
                <div className="p-[3.5px] rounded-full bg-gradient-to-tr from-[#ec4899] via-[#a855f7] via-[#3b82f6] via-[#10b981] to-[#eab308] shadow-2xl group-hover:scale-105 transition-transform duration-300">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-card p-1 overflow-hidden flex items-center justify-center border-2 border-white dark:border-slate-900">
                    <UserAvatar avatarId={avatarId} name={userName} className="w-full h-full" />
                  </div>
                </div>

                {/* Edit badge */}
                <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#942392] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform border-2 border-white dark:border-slate-900">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* 3. User Details */}
            <div className="text-center px-4 space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {userName || "User"}
              </h2>
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <Badge variant="secondary" className="text-[10px] uppercase font-black px-3 py-1 bg-[#942392]/10 text-[#942392] dark:bg-[#942392]/20 dark:text-purple-300 border-none">
                  {resolvedRole?.replace(/_/g, ' ') || "Employee"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium pt-0.5">
                {userDepartment ? `${userDepartment} · ` : ""}{getFullBranchName(userBranch || "HQ")}
              </p>
            </div>

            {/* 4. Stats Summary Pill Box (matching Screenshot 1) */}
            <div className="mt-4 mx-4 p-3.5 rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/50">
              <div className="grid grid-cols-3 divide-x divide-border/60 text-center">
                <div className="px-1.5">
                  <p className="text-xs sm:text-sm font-black text-foreground truncate">{userBranch || "HQ"}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Branch</p>
                </div>
                <div className="px-1.5">
                  <p className="text-xs sm:text-sm font-black text-foreground truncate">{userId || "E001"}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">User ID</p>
                </div>
                <div className="px-1.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">Active</p>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Status</p>
                </div>
              </div>
            </div>

            {/* 5. Change Avatar Button */}
            <div className="mt-3.5 px-4 pb-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAvatarModalOpen(true)}
                className="w-full rounded-xl text-xs font-bold border-[#942392]/30 text-[#942392] hover:bg-[#942392]/10 dark:text-purple-300 dark:border-purple-500/30 transition-colors h-9 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 mr-2 text-[#942392] dark:text-purple-300" />
                Change Profile Avatar
              </Button>
            </div>
          </Card>

          {/* Security & Password Reset Card */}
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-md -mr-8 -mt-8 blur-2xl animate-pulse" />
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Security Settings</h2>
            </div>
            
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed mb-4 relative z-10">
              Need to change or forgot your password? Request a secure password reset link directly to your registered email address.
            </p>

            {/* Email Reset Box */}
            <div className="flex flex-col gap-3 p-3 rounded-[16px] bg-[#FBF0FF] dark:bg-[#942392]/10 border border-[#942392]/15 text-xs shadow-sm relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold">
                  <svg className="w-4 h-4 text-[#942392]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/>
                    <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>
                  </svg>
                  <button
                    type="button"
                    onClick={() => setShowResetBox(!showResetBox)}
                    className="hover:underline text-left cursor-pointer transition-all text-slate-600 dark:text-slate-300 font-bold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetBox(!showResetBox)}
                  className="text-[#942392] dark:text-purple-400 font-black hover:underline cursor-pointer transition-colors"
                >
                  Reset via Email
                </button>
              </div>

              {showResetBox && (
                <div className="pt-2 border-t border-[#942392]/10 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-2 font-medium">
                    Enter your email to receive a secure password reset link.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="h-8 text-xs !bg-white dark:!bg-slate-900 !text-slate-900 dark:!text-slate-100 border-[#942392]/30 placeholder:!text-slate-400 placeholder:!text-gray-400 placeholder:!font-normal focus-visible:!ring-[#942392]"
                    />
                    <Button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={resetLoading}
                      className="h-8 bg-[#942392] hover:bg-[#5e0080] text-white text-xs font-bold rounded-md px-3 flex items-center justify-center shrink-0"
                    >
                      {resetLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Send Link"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Details Card */}
        <Card className="flex-1 border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] w-full">
          <CardHeader className="border-b border-border/50 pb-4 sm:pb-6 px-4 sm:px-8">
            <CardTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-responsive-base">Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:gap-4 md:gap-4 grid-cols-1 sm:grid-cols-2 p-4 sm:p-5 md:p-6">
            {profileItems.map((item, idx) => (
              <div key={idx} className="space-y-1.5 p-3 sm:p-4 md:p-5 rounded-2xl bg-muted/20 border border-border/40 transition-all hover:border-primary/30 hover:bg-muted/30 group">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground group-hover:text-primary dark:group-hover:text-purple-400 transition-colors" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60">{item.label}</p>
                </div>
                <p className="text-sm sm:text-base font-black text-foreground pl-5 sm:pl-6 break-words">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Avatar Selection Modal */}
      <AvatarPickerModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        currentAvatarId={avatarId}
        userName={userName || "User"}
        userId={userId || user?.id}
        onAvatarSaved={(newId) => setAvatarId(newId)}
      />
    </div>
  );
};

export default Profile;
