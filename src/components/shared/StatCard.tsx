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
  default: "bg-card dark:bg-card border-none shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
  maroon: "bg-card dark:bg-card border-none border-l-4 border-l-rose-500 text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
  gold: "bg-card dark:bg-card border-none border-l-4 border-l-amber-500 text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
  success: "bg-card dark:bg-card border-none border-l-4 border-l-emerald-500 text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
  gauge: "bg-card dark:bg-card border-none shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
  warning: "bg-card dark:bg-card border-none border-l-4 border-l-amber-500 text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
  purple: "bg-card dark:bg-card border-none border-l-4 border-l-purple-500 text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
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
      <div className={`rounded-[16px] p-4 sm:p-6 flex items-center justify-between transition-all duration-300 hover:shadow-md ${currentStyle}`}>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1 whitespace-normal break-words leading-tight">{title}</p>
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
    <div className={`rounded-[16px] p-4 sm:p-6 transition-all duration-300 hover:translate-y-[-4px] ${currentStyle}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground whitespace-normal break-words leading-tight">
            {title}
          </p>
          
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {value}
          </p>

          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {trend && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  trend.positive ? 'bg-emerald-55 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {trend.positive ? "↑" : "↓"} {trend.value}
                </span>
              )}
              {subtitle && (
                <p className="text-[11px] font-bold truncate text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`p-2.5 sm:p-3 rounded-xl transition-colors duration-300 shrink-0 ml-2 ${
          variant === 'maroon' ? 'bg-rose-50 dark:bg-rose-950/30' : 
          variant === 'gold' ? 'bg-amber-100 dark:bg-amber-900/20' : 
          variant === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30' :
          variant === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30' : 
          variant === 'purple' ? 'bg-purple-50 dark:bg-purple-950/30' : 'bg-muted/50 dark:bg-muted'
        }`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
            variant === 'maroon' ? 'text-rose-600 dark:text-rose-400' : 
            variant === 'gold' ? 'text-amber-600 dark:text-amber-400' : 
            variant === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
            variant === 'warning' ? 'text-amber-600 dark:text-amber-400' : 
            variant === 'purple' ? 'text-purple-600 dark:text-purple-400' : 'text-foreground/70'
          }`} />
        </div>
      </div>
    </div>
  );
}