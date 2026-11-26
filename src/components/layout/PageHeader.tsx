import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPageTitleInfo } from "@/utils/pageTitles";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export interface PageHeaderMetaValues {
  title?: string;
  description?: string | null;
  icon?: LucideIcon;
}

const PageHeaderMetaValueContext = createContext<PageHeaderMetaValues>({});
const PageHeaderMetaSetterContext = createContext<
  React.Dispatch<React.SetStateAction<PageHeaderMetaValues>> | null
>(null);

function isSameMeta(a: PageHeaderMetaValues, b: PageHeaderMetaValues): boolean {
  return a.title === b.title && a.description === b.description && a.icon === b.icon;
}

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [meta, setMetaState] = useState<PageHeaderMetaValues>({});

  const setMeta = useMemo<React.Dispatch<React.SetStateAction<PageHeaderMetaValues>>>(
    () => (updater) => {
      setMetaState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        return isSameMeta(prev, next) ? prev : next;
      });
    },
    []
  );

  const prevPathnameRef = useRef(location.pathname);

  // Clear per-page overrides automatically when navigating to a different route
  useLayoutEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      setMeta({});
    }
  }, [location.pathname, setMeta]);

  return (
    <PageHeaderMetaSetterContext.Provider value={setMeta}>
      <PageHeaderMetaValueContext.Provider value={meta}>
        {children}
      </PageHeaderMetaValueContext.Provider>
    </PageHeaderMetaSetterContext.Provider>
  );
}

/**
 * Declarative helper allowing child pages to customize the shared PageHeader's
 * title, description, or icon without duplicating the header layout.
 */
export function PageHeaderMeta({ title, description, icon }: PageHeaderMetaValues) {
  const setMeta = useContext(PageHeaderMetaSetterContext);

  useLayoutEffect(() => {
    if (!setMeta) return;
    setMeta({ title, description, icon });
    return () => {
      setMeta({});
    };
  }, [setMeta, title, description, icon]);

  return null;
}

export interface PageHeaderProps {
  title?: string;
  description?: string | null;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  sticky?: boolean;
  showSeparator?: boolean;
  isScrolled?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  toolbar,
  sticky = true,
  showSeparator = true,
  isScrolled: isScrolledProp,
  className,
}: PageHeaderProps) {
  const location = useLocation();
  const { user } = useAuth();
  const meta = useContext(PageHeaderMetaValueContext);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [internalScrolled, setInternalScrolled] = useState(false);

  const role = (user?.role || (typeof window !== "undefined" ? localStorage.getItem("user_role") : "") || "").toLowerCase();
  const pageInfo = getPageTitleInfo(location.pathname, role, location.search);

  const displayTitle = title ?? meta.title ?? pageInfo.title;
  const displaySubtitle =
    description !== undefined
      ? description
      : meta.description !== undefined
        ? meta.description
        : pageInfo.subtitle;
  const DisplayIcon = icon ?? meta.icon ?? pageInfo.icon;

  // Fallback scroll tracking if `isScrolled` is not controlled by AppLayout
  useEffect(() => {
    if (!sticky || isScrolledProp !== undefined) return;

    const mainEl = headerRef.current?.closest("main") ?? document.querySelector("main");
    const checkScroll = () => {
      const top = mainEl ? mainEl.scrollTop : window.scrollY || document.documentElement.scrollTop || 0;
      setInternalScrolled(top > 4);
    };

    checkScroll();
    const target: EventTarget = mainEl || window;
    target.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", checkScroll);
    };
  }, [sticky, isScrolledProp, location.pathname]);

  // Publish exact header height so sticky sub-sidebars (e.g. Settings tabs) dock cleanly below the separator
  useEffect(() => {
    const el = headerRef.current;
    if (!el || !sticky) {
      document.documentElement.style.setProperty("--page-header-height", "0px");
      return;
    }

    const updateHeight = () => {
      const h = el.offsetHeight || 0;
      document.documentElement.style.setProperty("--page-header-height", `${h}px`);
      const mainEl = el.closest("main") as HTMLElement | null;
      if (mainEl) {
        mainEl.style.setProperty("--page-header-height", `${h}px`);
      }
    };

    updateHeight();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(updateHeight);
      ro.observe(el);
      return () => {
        ro.disconnect();
      };
    }
  }, [sticky, location.pathname, displayTitle, displaySubtitle]);

  const effectiveScrolled = isScrolledProp ?? internalScrolled;

  // Legacy non-sticky layout used only for excluded pages (e.g. Leave Application)
  if (!sticky && !showSeparator) {
    return (
      <div ref={headerRef} className={cn("space-y-4 sm:space-y-5 pb-2", className)}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {DisplayIcon && (
              <div className="w-10 h-10 rounded-xl bg-[#942392] text-white flex items-center justify-center shadow-xs shrink-0">
                <DisplayIcon className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{displayTitle}</h1>
              {displaySubtitle && (
                <p className="text-xs sm:text-sm text-foreground italic mt-0.5">
                  {displaySubtitle}
                </p>
              )}
            </div>
          </div>
          <div id="page-header-actions" className="flex flex-wrap items-center justify-end gap-3 w-full empty:hidden">
            {actions}
          </div>
          <div id="page-header-toolbar" className="w-full empty:hidden">
            {toolbar}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={headerRef}
      data-sticky-page-header="true"
      data-scrolled={effectiveScrolled ? "true" : "false"}
      className={cn(
        sticky && "sticky top-[var(--app-topbar-height,0px)] z-20 bg-background -mx-4 px-4 sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 pt-4 sm:pt-4 lg:pt-5",
        !sticky && "pt-1",
        "mb-4 sm:mb-5 transition-shadow duration-200 print:static print:shadow-none",
        sticky && effectiveScrolled && "shadow-[0_6px_16px_-6px_rgba(15,23,42,0.09)] dark:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <div className="pb-3.5 sm:pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {DisplayIcon && (
              <div className="w-10 h-10 rounded-xl bg-[#942392] text-white flex items-center justify-center shadow-xs shrink-0">
                <DisplayIcon className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight leading-tight">
                {displayTitle}
              </h1>
              {displaySubtitle && (
                <p className="text-xs sm:text-sm text-foreground/85 italic mt-0.5 leading-snug">
                  {displaySubtitle}
                </p>
              )}
            </div>
          </div>

          <div
            id="page-header-actions"
            className="flex flex-wrap items-center justify-start lg:justify-end gap-2.5 shrink-0 empty:hidden"
          >
            {actions}
          </div>
        </div>

        <div id="page-header-toolbar" className="w-full pt-3 empty:hidden">
          {toolbar}
        </div>
      </div>

      {showSeparator && (
        <div
          role="separator"
          aria-orientation="horizontal"
          className="w-full h-px bg-slate-300/85 dark:bg-white/12"
        />
      )}
    </div>
  );
}

export default PageHeader;
