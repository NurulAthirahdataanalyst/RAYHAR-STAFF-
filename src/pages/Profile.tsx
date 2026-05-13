import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Building2, ShieldCheck, Calendar, Phone, MapPin } from "lucide-react";

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-500/10 rounded-xl text-[#601b8a] dark:text-purple-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">My Profile</h1>
          <p className="text-sm text-muted-foreground font-medium italic">Manage and view your personal account information</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Profile Info Card */}
        <Card className="w-full lg:w-1/3 border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] bg-card/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6">
            <div className="mx-auto w-28 h-28 rounded-[32px] bg-gradient-to-br from-[#601b8a] to-[#a855f7] flex items-center justify-center text-white text-5xl font-black shadow-2xl mb-6 border-4 border-white/50 dark:border-slate-800/50">
              {(userName || "U")[0].toUpperCase()}
            </div>
            <CardTitle className="text-2xl font-black text-foreground tracking-tight">
              {userName || "User"}
            </CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="secondary" className="text-[10px] uppercase font-black px-3 py-1 bg-[#601b8a]/10 text-[#601b8a] border-none">
                {resolvedRole?.replace('_', ' ') || "Employee"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pb-10">
            <div className="pt-6 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-muted/30">
                  <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50 mb-1">Branch</p>
                  <p className="text-sm font-black text-foreground">{userBranch || "HQ"}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30">
                  <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50 mb-1">Status</p>
                  <Badge className="bg-emerald-500 text-white font-black text-[9px] h-5">Active</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="flex-1 border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] bg-card/80 backdrop-blur-md rounded-[32px]">
          <CardHeader className="border-b border-border/50 pb-6 px-8">
            <CardTitle className="text-lg font-black text-foreground flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-[#601b8a] dark:text-purple-400">
                <User className="w-5 h-5" />
              </div>
              Account Information Detail
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 p-8">
            {profileItems.map((item, idx) => (
              <div key={idx} className="space-y-1.5 p-5 rounded-2xl bg-muted/20 border border-border/40 transition-all hover:border-[#601b8a]/30 hover:bg-muted/30 group">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-[#601b8a] transition-colors" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{item.label}</p>
                </div>
                <p className="text-base font-black text-foreground pl-6">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
