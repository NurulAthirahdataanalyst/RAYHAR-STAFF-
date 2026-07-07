import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "maroon" | "gold" | "success" | "gauge" | "warning" | "purple";
  progress?: number; 
}

const variantStyles = {
  default: "bg-white dark:bg-card border border-slate-200 text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
  maroon: "bg-white dark:bg-card border border-slate-200 text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
  gold: "bg-white dark:bg-card border border-slate-200 text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
  success: "bg-white dark:bg-card border border-slate-200 text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
  gauge: "bg-white dark:bg-card border border-slate-200 text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
  warning: "bg-white dark:bg-card border border-slate-200 text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
  purple: "bg-white dark:bg-card border border-slate-200 text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
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
      <div className={`rounded-[16px] p-4 flex items-center justify-between transition-all duration-300 hover:shadow-md h-[120px] ${currentStyle}`}>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-normal break-words leading-tight">{title}</p>
          <p className="mt-1.5 text-[32px] font-black text-foreground tracking-tight leading-none">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-1 font-semibold truncate">{subtitle}</p>}
        </div>
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0 ml-2">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-muted/20 dark:text-muted" />
            <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="5" fill="transparent" 
              strokeDasharray={175.9}
              strokeDashoffset={175.9 - (progress / 100) * 175.9}
              className="text-[#7B0099] dark:text-purple-400 transition-all duration-1000 ease-out" 
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-black text-foreground">{progress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[16px] p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md h-[120px] flex flex-col justify-between ${currentStyle}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-normal break-words leading-tight">
            {title}
          </p>
          
          <p className="text-[32px] font-black tracking-tight text-foreground leading-none mt-1">
            {value}
          </p>

          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {trend && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {trend.positive ? "↑" : "↓"} {trend.value}
                </span>
              )}
              {subtitle && (
                <p className="text-[11px] font-medium text-slate-500 truncate leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 shrink-0 ml-2 ${
          variant === 'maroon' ? 'bg-rose-50 text-rose-600' : 
          variant === 'gold' ? 'bg-amber-50 text-amber-600' : 
          variant === 'success' ? 'bg-emerald-50 text-emerald-600' :
          variant === 'warning' ? 'bg-amber-50 text-amber-600' : 
          variant === 'purple' ? 'bg-[#7B0099]/10 text-[#7B0099]' : 'bg-slate-50 text-slate-500'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
