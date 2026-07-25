import { useLocation } from "react-router-dom";
import { getPageTitleInfo } from "@/utils/pageTitles";

export default function PageHeader() {
  const location = useLocation();
  const { title, subtitle } = getPageTitleInfo(location.pathname);

  // For /analytics, the subtitle needs dynamic month/year, but for now we render a default
  // Wait, EmployeeAnalytics will render its own header! We won't use PageHeader for /analytics.

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold opacity-70 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
