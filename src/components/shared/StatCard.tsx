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
}

const variantStyles = {
  default: "bg-white border border-slate-200 text-slate-800",
  maroon: "bg-rose-50 border border-rose-200 text-rose-800",
  gold: "bg-white border border-slate-200 text-slate-800",
  success: "bg-white border border-slate-200 text-slate-800",
  gauge: "bg-white border border-slate-200 text-slate-800",
  warning: "bg-amber-50 border border-amber-200 text-amber-800",
  purple: "bg-white border border-slate-200 text-slate-800",
};

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = "default",
  progress = 0,
  onClick
}: StatCardProps) {
  
  const currentStyle = variantStyles[variant] || variantStyles.default;
  const clickableStyle = onClick ? "cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md" : "";

  // Render for Circular Gauge (Attendance Rate)
  if (variant === "gauge") {
    return (
      <div onClick={onClick} className={`rounded-md p-4 flex items-start justify-between h-full min-h-[130px] ${currentStyle} ${clickableStyle}`}>
        <div className="min-w-0 flex flex-col h-full justify-between">
          <div className="min-h-[28px] mb-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-normal break-words leading-tight">{title}</p>
          </div>
          <div className="mt-auto">
            <p className="text-[28px] font-black text-slate-800 tracking-tight leading-none">{value}</p>
            {subtitle && <p className="text-[10px] text-slate-500 mt-1 font-medium font-mono truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0 ml-2">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100" />
            <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="5" fill="transparent" 
              strokeDasharray={175.9}
              strokeDashoffset={175.9 - (progress / 100) * 175.9}
              className="text-[#3b0764] transition-all duration-1000 ease-out" 
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-black text-slate-800">{progress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className={`rounded-md p-4 h-full min-h-[130px] flex flex-col ${currentStyle} ${clickableStyle}`}>
      <div className="flex items-start justify-between gap-2 mb-3 min-h-[28px]">
        <p className={`text-[10px] font-bold uppercase tracking-widest break-words leading-snug w-[75%] ${
          variant === 'maroon' ? 'text-rose-700' : 
          variant === 'warning' ? 'text-amber-700' : 'text-slate-500'
        }`}>
          {title}
        </p>
        
        <div className="shrink-0 flex items-center justify-center">
          <Icon className={`w-[18px] h-[18px] ${
            variant === 'maroon' ? 'text-rose-600' : 
            variant === 'warning' ? 'text-amber-600' : 
            variant === 'purple' ? 'text-[#3b0764]' : 
            variant === 'success' ? 'text-[#3b0764]' :
            'text-slate-600'
          }`} />
        </div>
      </div>

      <div>
        <p className={`text-[28px] font-black tracking-tight leading-tight ${
          variant === 'maroon' ? 'text-rose-700' : 
          variant === 'warning' ? 'text-amber-700' : 'text-slate-800'
        }`}>
          {value}
        </p>

        {(subtitle || trend) && (
          <div className="mt-1">
            {trend && (
              <span className={`inline-block mr-1 text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            )}
            {subtitle && (
              <p className={`text-[10px] font-medium font-mono truncate ${
                variant === 'maroon' ? 'text-rose-500' : 
                variant === 'warning' ? 'text-amber-600' : 'text-slate-500'
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
