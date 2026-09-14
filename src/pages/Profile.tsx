import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { User, Mail, Building2, ShieldCheck, Calendar, MapPin, Lock, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";
import { supabase } from "@/integrations/supabase/client";

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
          {/* Profile Info Card */}
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
            <CardHeader className="text-center pt-8 sm:pt-10 pb-4 sm:pb-6">
              <div className="mx-auto w-20 h-20 sm:w-28 sm:h-28 rounded-[20px] sm:rounded-[32px] bg-gradient-to-br from-primary to-[#a855f7] flex items-center justify-center text-white text-3xl sm:text-5xl font-black shadow-2xl mb-4 sm:mb-6 border-4 border-white/50 dark:border-slate-800/50">
                {(userName || "U")[0].toUpperCase()}
              </div>
              <CardTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {userName || "User"}
              </CardTitle>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="text-[10px] uppercase font-black px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-purple-400 border-none">
                  {resolvedRole?.replace(/_/g, ' ') || "Employee"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-6 sm:pb-8">
              <div className="pt-4 sm:pt-6 border-t border-border/50">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
                  <div className="p-3 sm:p-4 rounded-2xl bg-muted/30">
                    <p className="text-[10px] font-black uppercase text-slate-950 dark:text-slate-50 mb-1">Branch</p>
                    <p className="text-xs sm:text-sm font-black text-foreground break-words">{getFullBranchName(userBranch || "HQ")}</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-muted/30">
                    <p className="text-[10px] font-black uppercase text-slate-950 dark:text-slate-50 mb-1">Status</p>
                    <Badge className="bg-emerald-500 text-white font-black text-[9px] h-5">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
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
    </div>
  );
};

export default Profile;
