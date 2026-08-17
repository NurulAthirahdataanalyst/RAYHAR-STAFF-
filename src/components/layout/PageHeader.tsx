import { useLocation } from "react-router-dom";
import { getPageTitleInfo } from "@/utils/pageTitles";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface PageHeaderProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

export default function PageHeader({ title, description, icon }: PageHeaderProps) {
  const location = useLocation();
  const { user } = useAuth();
  const role = (user?.role || localStorage.getItem('user_role') || '').toLowerCase();
  const pageInfo = getPageTitleInfo(location.pathname, role);
  
  const displayTitle = title || pageInfo.title;
  const displaySubtitle = description || pageInfo.subtitle;
  const DisplayIcon = icon || pageInfo.icon;

  return (
    <div className="animate-in fade-in duration-500 mb-4 bg-gradient-to-r from-[#800A7A] via-[#7B0099] to-[#510066] rounded-xl p-4 sm:p-5 shadow-md relative overflow-hidden">
      <div className="absolute inset-0 bg-white/[0.03] pointer-events-none" />
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex items-center gap-3">
          {DisplayIcon && (
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs shrink-0 border border-white/10">
              <DisplayIcon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">{displayTitle}</h1>
            {displaySubtitle && (
              <p className="text-xs sm:text-sm text-purple-100 italic mt-0.5 font-medium">
                {displaySubtitle}
              </p>
            )}
          </div>
        </div>
        <div id="page-header-actions" className="flex flex-wrap items-center justify-end gap-3 w-full empty:hidden"></div>
      </div>
    </div>
  );
}
