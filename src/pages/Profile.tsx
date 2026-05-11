import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Building2, ShieldCheck, Calendar, Phone, MapPin } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  const profileItems = [
    { label: "Full Name", value: user.full_name || user.name || "N/A", icon: User },
    { label: "Email Address", value: user.email, icon: Mail },
    { label: "User ID", value: user.user_id || "N/A", icon: ShieldCheck },
    { label: "Branch", value: user.branch || "Rayhar HQ", icon: Building2 },
    { label: "Department", value: user.department || "N/A", icon: MapPin },
    { label: "Status", value: user.status || "Active", icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile Info Card */}
        <Card className="w-full md:w-1/3 border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[30px] overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-24 h-24 rounded-full bg-[#601b8a] flex items-center justify-center text-white text-4xl font-black shadow-xl mb-4 border-4 border-white dark:border-slate-800">
              {(user.full_name || user.name || "U")[0].toUpperCase()}
            </div>
            <CardTitle className="text-xl font-black text-foreground">
              {user.full_name || user.name || "User"}
            </CardTitle>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              {user.role?.replace('_', ' ') || "Employee"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 rounded-lg px-3 py-1">
                {user.branch || "HQ"}
              </Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 rounded-lg px-3 py-1">
                {user.status || "Active"}
              </Badge>
            </div>
            
            <div className="pt-6 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Branch</p>
                  <p className="text-sm font-bold text-foreground">{user.branch || "HQ"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Role</p>
                  <p className="text-sm font-bold text-foreground">Staff</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="flex-1 border-white/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[30px]">
          <CardHeader>
            <CardTitle className="text-lg font-black text-foreground flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-[#601b8a] dark:text-purple-400">
                <User className="w-5 h-5" />
              </div>
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {profileItems.map((item, idx) => (
              <div key={idx} className="space-y-1.5 p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-border/40 transition-all hover:border-purple-500/30 group">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{item.label}</p>
                </div>
                <p className="text-sm font-bold text-foreground pl-5">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
