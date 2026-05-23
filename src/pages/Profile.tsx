import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Building2, ShieldCheck, Calendar, MapPin, Lock } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const { role: resolvedRole, userName, userBranch, userDepartment, userId } = useRole();
  const email = user?.email || ""; 

  if (!user) return null;

  const profileItems = [
    { label: "Full Name", value: userName || "N/A", icon: User },
    { label: "Email Address", value: email || "N/A", icon: Mail },
    { label: "User ID", value: userId || "N/A", icon: ShieldCheck },
    { label: "Branch", value: userBranch || "Rayhar HQ", icon: Building2 },
    { label: "Department", value: userDepartment || "N/A", icon: MapPin },
    { label: "Status", value: "Active", icon: Calendar },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-xl text-primary">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-responsive-xl font-black text-foreground tracking-tight uppercase">My Profile</h1>
          <p className="text-responsive-sm text-muted-foreground font-medium italic">Manage and view your personal account information</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* Left Column (Profile Info & Security Card) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 sm:gap-6">
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
                  {resolvedRole?.replace('_', ' ') || "Employee"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pb-8 sm:pb-10">
              <div className="pt-4 sm:pt-6 border-t border-border/50">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
                  <div className="p-3 sm:p-4 rounded-2xl bg-muted/30">
                    <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50 mb-1">Branch</p>
                    <p className="text-xs sm:text-sm font-black text-foreground truncate">{userBranch || "HQ"}</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-muted/30">
                    <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50 mb-1">Status</p>
                    <Badge className="bg-emerald-500 text-white font-black text-[9px] h-5">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security & Password Reset Card */}
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-full -mr-8 -mt-8 blur-2xl animate-pulse" />
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight">Security Settings</h2>
            </div>
            
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed mb-5 relative z-10">
              Need to change or forgot your password? Reset your password securely via our official Telegram bot. This preserves your complete privacy—even the HR department cannot see your new password.
            </p>

            <button
              type="button"
              onClick={() => {
                toast.success("🔒 Secure Password Reset Initiated", {
                  description: "Redirecting you to our official Telegram bot to reset your password. The HR team will not have access to your new password, preserving your privacy.",
                  duration: 4000
                });
                const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "RayharStaffPortal_bot";
                setTimeout(() => {
                  window.open(`https://t.me/${botUsername}?start=${userId}`, "_blank");
                }, 1500);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-purple-900/15 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] touch-target relative z-10"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-.99.53-1.41.52-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.74 3.88-1.69 6.47-2.8 7.77-3.32 3.7-1.47 4.47-1.73 4.97-1.74.11 0 .36.03.52.16.14.11.18.26.2.37.02.13.02.26.01.39z"/>
              </svg>
              Forgot / Reset Password
            </button>
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
          <CardContent className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 p-4 sm:p-6 md:p-8">
            {profileItems.map((item, idx) => (
              <div key={idx} className="space-y-1.5 p-3 sm:p-4 md:p-5 rounded-2xl bg-muted/20 border border-border/40 transition-all hover:border-primary/30 hover:bg-muted/30 group">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary dark:group-hover:text-purple-400 transition-colors" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{item.label}</p>
                </div>
                <p className="text-sm sm:text-base font-black text-foreground pl-5 sm:pl-6 truncate">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
