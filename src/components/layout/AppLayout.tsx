import AppSidebar from "./AppSidebar";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
// Pastikan nama fail tepat: watercolor-bg.png
import watercolorBg from "@/assets/watercolor-bg.png";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [resolvedRole, setResolvedRole] = useState("employee");

  useEffect(() => {
    const dashboardUserId = user?.user_id || user?.id;
    if (!dashboardUserId) return;

    const fetchRole = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/user-details/${dashboardUserId}`);
        const data = await response.json();

        if (response.ok && data.success && data.role) {
          setResolvedRole(String(data.role));
        }
      } catch (error) {
        console.error("Role resolve error:", error);
      }
    };

    void fetchRole();
  }, [user?.id, user?.user_id]);

  useEffect(() => {
    const dashboardUserId = user?.user_id || user?.id;
    if (!dashboardUserId) return;

    const fetchPendingApprovals = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/dashboard-stats?userId=${dashboardUserId}&role=${resolvedRole}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          setPendingApprovals(
            Number(data.stats?.pendingApprovals ?? data.stats?.pendingLeaves ?? 0)
          );
        }
      } catch (error) {
        console.error("Quick Management sync error:", error);
      }
    };

    void fetchPendingApprovals();
    const interval = setInterval(fetchPendingApprovals, 10000);

    return () => clearInterval(interval);
  }, [resolvedRole, user?.id, user?.user_id]);

  const today = new Date();
  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth();
  const monthName = today.toLocaleString("en-US", { month: "long" });
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      <AppSidebar />
      
      <main 
        className="flex-1 overflow-x-hidden relative"
        style={{
          backgroundImage: `url(${watercolorBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-background/40 dark:bg-background/80 pointer-events-none" />
        <div className="relative p-6 lg:p-10 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="flex flex-col lg:grid lg:grid-cols-10 gap-8">
            
            {/* Ruang Kerja Utama (70%) */}
            <div className="lg:col-span-7 space-y-8">
              {children}
            </div>

            {/* Panel Sisi (30%) */}
            <aside className="hidden lg:block lg:col-span-3 space-y-6">
              
              {/* Kad Pengurusan Pantas */}
              <div className="bg-[#601b8a] p-8 rounded-[25px] shadow-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <h3 className="text-sm font-black text-white/90 dark:text-purple-100 uppercase tracking-widest mb-4">
                  Quick Management
                </h3>
                <div className="space-y-3">
                  <div
                    className="p-4 rounded-[18px] bg-white/10 dark:bg-black/20 border border-white/10 dark:border-white/5 flex items-center justify-between hover:bg-white/20 dark:hover:bg-black/30 transition-all cursor-pointer"
                    onClick={() => navigate("/leave/admin")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate("/leave/admin");
                      }
                    }}
                  >
                    <span className="text-sm font-bold text-white/90 dark:text-purple-50">Pending Approvals</span>
                    <span className="bg-[#00897B] text-white text-[10px] px-2.5 py-1 rounded-full font-black">
                      {pendingApprovals}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kad Cuti - Efek Kaca (Glassmorphism) sangat sesuai dengan PNG watercolor */}
              <div className="bg-card/80 dark:bg-card/40 backdrop-blur-md p-6 rounded-[25px] shadow-xl border border-white/40 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Calendar
                  </h3>
                  <span className="text-xs font-black text-[#601b8a] dark:text-purple-400">
                    {monthName} {calendarYear}
                  </span>
                </div>
                <div className="mb-5 rounded-[20px] bg-white/45 dark:bg-black/20 p-3 border border-white/30 dark:border-white/5">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekdays.map((day, index) => (
                      <span key={`${day}-${index}`} className="text-center text-[10px] font-black text-muted-foreground/60">
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const isToday = day === today.getDate();
                      const isHoliday = calendarMonth === 3 && day === 22;

                      return (
                        <div
                          key={index}
                          className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold ${
                            !day
                              ? "text-transparent"
                              : isToday
                                ? "bg-[#601b8a] text-white shadow-lg shadow-purple-900/20"
                                : isHoliday
                                  ? "bg-[#C2185B] text-white"
                                  : "text-foreground/80 hover:bg-white/60 dark:hover:bg-white/10"
                          }`}
                        >
                          {day || "."}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                  Upcoming Holidays
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-white/40 dark:bg-white/5 rounded-[20px] border border-white/20 dark:border-white/5">
                    <div className="bg-[#C2185B] text-white p-2 rounded-xl font-bold text-center min-w-[50px] shadow-lg">
                      <span className="block text-[10px] uppercase opacity-80">Apr</span>
                      <span className="text-lg leading-none font-black">22</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Hari Raya Aidilfitri</p>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Public Holiday</p>
                    </div>
                  </div>
                </div>
              </div>

            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
