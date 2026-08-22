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
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500 pb-2">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {DisplayIcon && (
            <div className="w-10 h-10 rounded-xl bg-[#7B0099] text-white flex items-center justify-center shadow-xs shrink-0">
              <DisplayIcon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{displayTitle}</h1>
            {displaySubtitle && (
              <p className="text-xs sm:text-sm text-foreground italic mt-0.5">
                {displaySubtitle}
              </p>
            )}
          </div>
        </div>
        <div id="page-header-actions" className="flex flex-wrap items-center justify-end gap-3 w-full"></div>
      </div>
    </div>
  );
}
