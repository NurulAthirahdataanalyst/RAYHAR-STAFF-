import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "maroon" | "gold" | "success" | "gauge" | "warning" | "purple";
  progress?: number; 
  onClick?: () => void;
  valueClassName?: string;
}

const variantStyles = {
  default: "bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-purple-300 transition-colors hover:bg-slate-50 dark:bg-slate-900/50",
  maroon: "bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-purple-300 transition-colors hover:bg-slate-50 dark:bg-slate-900/50",
  gold: "bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-purple-300 transition-colors hover:bg-slate-50 dark:bg-slate-900/50",
  success: "bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-purple-300 transition-colors hover:bg-slate-50 dark:bg-slate-900/50",
  gauge: "bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-purple-300 transition-colors hover:bg-slate-50 dark:bg-slate-900/50",
  warning: "bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-purple-300 transition-colors hover:bg-slate-50 dark:bg-slate-900/50",
  purple: "bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-purple-300 transition-colors hover:bg-slate-50 dark:bg-slate-900/50",
};

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = "default",
  progress = 0,
  onClick,
  valueClassName
}: StatCardProps) {
  
  const currentStyle = variantStyles[variant] || variantStyles.default;
  const clickableStyle = onClick ? "cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md" : "";

  // Render for Circular Gauge (Attendance Rate)
  if (variant === "gauge") {
    return (
      <div onClick={onClick} className={`rounded-md p-4 flex items-start justify-between h-full min-h-[130px] ${currentStyle} ${clickableStyle}`}>
        <div className="min-w-0 flex flex-col">
          <div className="min-h-[28px] mb-3">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-normal break-words leading-tight">{title}</p>
          </div>
          <div>
            <p className="text-[28px] font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight whitespace-pre-wrap break-words">{value}</p>
            {subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium font-mono truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0 ml-2">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100 dark:text-slate-700" />
            <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="5" fill="transparent" 
              strokeDasharray={175.9}
              strokeDashoffset={175.9 - (progress / 100) * 175.9}
              className="text-[#7B0099] dark:text-indigo-400 transition-all duration-1000 ease-out" 
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-black text-slate-800 dark:text-slate-100">{progress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className={`rounded-md p-4 h-full min-h-[130px] flex flex-col ${currentStyle} ${clickableStyle}`}>
      <div className="flex items-start justify-between gap-2 mb-3 min-h-[28px]">
        <p className={`text-[10px] font-bold uppercase tracking-widest break-words leading-snug w-[75%] ${
          variant === 'maroon' ? 'text-rose-700 dark:text-rose-300' : 
          variant === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
        }`}>
          {title}
        </p>
        
        <div className="shrink-0 flex items-center justify-center">
          <Icon className={`w-[18px] h-[18px] ${
            variant === 'maroon' ? 'text-rose-600 dark:text-rose-400' : 
            variant === 'warning' ? 'text-amber-600 dark:text-amber-400' : 
            variant === 'purple' ? 'text-[#7B0099] dark:text-indigo-400' : 
            variant === 'success' ? 'text-[#7B0099] dark:text-indigo-400' :
            'text-slate-600 dark:text-slate-400'
          }`} />
        </div>
      </div>

      <div className="min-w-0">
        <p className={`${valueClassName ? valueClassName : `font-black ${String(value).length > 12 ? 'text-lg' : String(value).length > 8 ? 'text-xl' : 'text-[28px]'}`} tracking-tight leading-tight whitespace-pre-wrap break-words ${
          variant === 'maroon' ? 'text-rose-700 dark:text-rose-300' : 
          variant === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'
        }`}>
          {value}
        </p>

        {(subtitle || trend) && (
          <div className="mt-1">
            {trend && (
              <span className={`inline-block mr-1 text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                trend.positive ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
              }`}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            )}
            {subtitle && (
              <p className={`text-[10px] font-medium font-mono truncate ${
                variant === 'maroon' ? 'text-rose-500 dark:text-rose-400' : 
                variant === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
