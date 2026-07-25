import { useLocation, Link } from "react-router-dom";
import { getPageTitleInfo } from "@/utils/pageTitles";
import { ChevronRight, Home } from "lucide-react";
import React from "react";

export interface PageHeaderProps {
  title?: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function PageHeader({ title, description, breadcrumbs }: PageHeaderProps) {
  const location = useLocation();
  const pageInfo = getPageTitleInfo(location.pathname);
  
  const displayTitle = title || pageInfo.title;
  const displaySubtitle = description || pageInfo.subtitle;

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500 pb-2">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-1 sm:space-x-2">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mx-1" />}
                  {crumb.href ? (
                    <Link
                      to={crumb.href}
                      className="text-[12px] font-bold text-muted-foreground hover:text-[#7B0099] uppercase transition-colors flex items-center gap-1.5"
                    >
                      {index === 0 && <Home className="w-3.5 h-3.5" />}
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[12px] font-black text-foreground uppercase flex items-center gap-1.5">
                      {index === 0 && <Home className="w-3.5 h-3.5" />}
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{displayTitle}</h1>
          {displaySubtitle && (
            <p className="text-xs text-muted-foreground tracking-wider font-semibold opacity-70 mt-1 capitalize">
              {displaySubtitle}
            </p>
          )}
        </div>
        <div id="page-header-actions" className="flex flex-wrap items-center gap-3 w-full sm:w-auto"></div>
      </div>
    </div>
  );
}
