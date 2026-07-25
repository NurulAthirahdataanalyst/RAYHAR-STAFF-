import os

filepath = r"c:\Users\HP\ATTENDANCE_SYSTEM\src\components\shared\StatCard.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isAnalyticsStyle to StatCardProps
content = content.replace(
    "  valueClassName?: string;",
    "  valueClassName?: string;\n  isAnalyticsStyle?: boolean;"
)

# 2. Add isAnalyticsStyle to StatCard parameters
content = content.replace(
    "  valueClassName\n}: StatCardProps) {",
    "  valueClassName,\n  isAnalyticsStyle = false\n}: StatCardProps) {"
)

# 3. Add Analytics Style Render Block right before `return (`
analytics_block = """
  // Render for Analytics Style
  if (isAnalyticsStyle) {
    const bgColors: Record<string, string> = {
      default: "bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-100",
      maroon: "bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-100",
      gold: "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-100",
      success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-100",
      warning: "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-100",
      purple: "bg-[#7B0099]/10 border-[#7B0099]/20 text-[#7B0099] dark:text-indigo-100",
    };
    const iconColors: Record<string, string> = {
      default: "text-blue-600 dark:text-blue-400",
      maroon: "text-rose-600 dark:text-rose-400",
      gold: "text-amber-600 dark:text-amber-400",
      success: "text-emerald-600 dark:text-emerald-400",
      warning: "text-amber-600 dark:text-amber-400",
      purple: "text-[#7B0099] dark:text-indigo-400",
    };
    
    const analyticsStyle = bgColors[variant] || bgColors.default;
    const iColor = iconColors[variant] || iconColors.default;

    return (
      <div onClick={onClick} className={`rounded-[20px] border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden p-5 h-full min-h-[130px] flex flex-col ${analyticsStyle} ${clickableStyle}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${iColor}`} />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 capitalize">{title}</span>
          </div>
        </div>
        
        <div className="flex items-baseline gap-2 mb-1 mt-1 min-w-0">
          <p className={`${valueClassName ? valueClassName : `font-black ${String(value).length > 12 ? 'text-xl' : String(value).length > 8 ? 'text-2xl' : 'text-3xl'}`} tracking-tight leading-tight whitespace-pre-wrap break-words text-foreground`}>
            {value}
          </p>
        </div>
        
        {(subtitle || trend) && (
          <div className="mt-auto pt-2">
            {trend && (
              <span className={`inline-block mr-1 text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            )}
            {subtitle && (
              <p className="text-[10px] font-medium font-mono text-slate-500 truncate">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    );
  }

"""

content = content.replace("  return (\n    <div onClick={onClick} className={`rounded-md", analytics_block + "  return (\n    <div onClick={onClick} className={`rounded-md")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("StatCard patched")
