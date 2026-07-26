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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{displayTitle}</h1>
          {displaySubtitle && (
            <p className="text-xs text-muted-foreground tracking-wide font-normal italic opacity-80 mt-1">
              {displaySubtitle}
            </p>
          )}
        </div>
        <div id="page-header-actions" className="flex flex-wrap items-center gap-3 w-full sm:w-auto"></div>
      </div>
    </div>
  );
}
