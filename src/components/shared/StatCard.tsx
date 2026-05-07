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
  default: "bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
  maroon: "bg-[#800000] text-white border-none shadow-xl shadow-maroon-900/20",
  gold: "bg-[#FFF9E6] border-none text-[#B8860B] shadow-sm",
  success: "bg-white border-none shadow-sm border-l-4 border-l-emerald-500",
  gauge: "bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
  warning: "bg-white border-none shadow-sm border-l-4 border-l-amber-500",
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
      <div className={`rounded-[20px] p-6 flex items-center justify-between transition-all duration-300 hover:shadow-md ${currentStyle}`}>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">{title}</p>
          <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
        </div>
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100" />
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" 
              strokeDasharray={175.9}
              strokeDashoffset={175.9 - (progress / 100) * 175.9}
              className="text-[#800000] transition-all duration-1000 ease-out" 
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[11px] font-black text-slate-700">{progress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[20px] p-6 transition-all duration-300 hover:translate-y-[-4px] ${currentStyle}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
            variant === 'maroon' ? 'text-white/80' : 'text-slate-400'
          }`}>
            {title}
          </p>
          
          <p className={`text-3xl font-black tracking-tight ${
            variant === 'maroon' ? 'text-white' : 'text-slate-800'
          }`}>
            {value}
          </p>

          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-1">
              {trend && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  variant === 'maroon' ? 'bg-white/20 text-white' : 
                  trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {trend.positive ? "↑" : "↓"} {trend.value}
                </span>
              )}
              {subtitle && (
                <p className={`text-[11px] font-bold ${
                  variant === 'maroon' ? 'text-white/70' : 'text-slate-400'
                }`}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`p-3 rounded-2xl transition-colors duration-300 ${
          variant === 'maroon' ? 'bg-white/15' : 
          variant === 'gold' ? 'bg-[#F1C40F]/10' : 
          variant === 'success' ? 'bg-emerald-50' :
          variant === 'warning' ? 'bg-amber-50' : 'bg-slate-50'
        }`}>
          <Icon className={`w-6 h-6 ${
            variant === 'maroon' ? 'text-white' : 
            variant === 'gold' ? 'text-[#B8860B]' : 
            variant === 'success' ? 'text-emerald-600' :
            variant === 'warning' ? 'text-amber-600' : 'text-slate-600'
          }`} />
        </div>
      </div>
    </div>
  );
}