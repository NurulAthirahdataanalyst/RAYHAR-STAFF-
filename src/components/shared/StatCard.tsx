import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "maroon" | "gold" | "success" | "gauge" | "warning";
  progress?: number; 
}

const variantStyles = {
  default: "bg-card dark:bg-card border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
  maroon: "bg-[#7B0099] text-white border-none shadow-xl shadow-purple-900/20",
  gold: "bg-amber-50 dark:bg-amber-950/30 border-none text-amber-700 dark:text-amber-400 shadow-sm",
  success: "bg-card dark:bg-card border-none shadow-sm border-l-4 border-l-emerald-500",
  gauge: "bg-card dark:bg-card border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
  warning: "bg-card dark:bg-card border-none shadow-sm border-l-4 border-l-amber-500",
};

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = "default",
  progress = 0 
}: StatCardProps) {
  
  const currentStyle = variantStyles[variant] || variantStyles.default;

  // Render for Circular Gauge (Attendance Rate)
  if (variant === "gauge") {
    return (
      <div className={`rounded-[20px] p-4 sm:p-6 flex items-center justify-between transition-all duration-300 hover:shadow-md ${currentStyle}`}>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 font-medium truncate">{subtitle}</p>}
        </div>
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 ml-2">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-muted/50 dark:text-muted" />
            <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="5" fill="transparent" 
              strokeDasharray={175.9}
              strokeDashoffset={175.9 - (progress / 100) * 175.9}
              className="text-[#7B0099] dark:text-purple-400 transition-all duration-1000 ease-out" 
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[11px] font-black text-foreground">{progress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[20px] p-4 sm:p-6 transition-all duration-300 hover:translate-y-[-4px] ${currentStyle}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-[0.15em] truncate ${
            variant === 'maroon' ? 'text-white/80' : 'text-muted-foreground'
          }`}>
            {title}
          </p>
          
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${
            variant === 'maroon' ? 'text-white' : 'text-foreground'
          }`}>
            {value}
          </p>

          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {trend && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  variant === 'maroon' ? 'bg-white/20 text-white' : 
                  trend.positive ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {trend.positive ? "↑" : "↓"} {trend.value}
                </span>
              )}
              {subtitle && (
                <p className={`text-[11px] font-bold truncate ${
                  variant === 'maroon' ? 'text-white/70' : 'text-muted-foreground'
                }`}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`p-2.5 sm:p-3 rounded-2xl transition-colors duration-300 shrink-0 ml-2 ${
          variant === 'maroon' ? 'bg-white/15' : 
          variant === 'gold' ? 'bg-amber-100 dark:bg-amber-900/20' : 
          variant === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30' :
          variant === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/50 dark:bg-muted'
        }`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
            variant === 'maroon' ? 'text-white' : 
            variant === 'gold' ? 'text-amber-600 dark:text-amber-400' : 
            variant === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
            variant === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground/70'
          }`} />
        </div>
      </div>
    </div>
  );
}