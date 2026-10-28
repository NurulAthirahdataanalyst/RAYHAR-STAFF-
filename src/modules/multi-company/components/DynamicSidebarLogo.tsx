import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import rayharDefaultLogo from '@/assets/rayhar-logo.png';
import { Building2 } from 'lucide-react';
import { resolveCompanyLogoUrl } from '../utils/companyLogo';

interface DynamicSidebarLogoProps {
  isCollapsed?: boolean;
  variant?: 'sidebar' | 'header' | 'plain';
  className?: string;
}

export const DynamicSidebarLogo: React.FC<DynamicSidebarLogoProps> = ({ 
  isCollapsed = false,
  variant = 'sidebar',
  className = ''
}) => {
  const { activeCompany } = useCompany();
  const [imgError, setImgError] = useState(false);

  // Reset img error state if company logo changes
  React.useEffect(() => {
    setImgError(false);
  }, [activeCompany?.logo_url, activeCompany?.id]);

  const companyName = activeCompany?.company_name || 'Rayhar Travels';
  const resolvedLogo = resolveCompanyLogoUrl(activeCompany?.logo_url);
  const logoSrc = (!imgError && resolvedLogo) ? resolvedLogo : rayharDefaultLogo;
  const isMainCompany = activeCompany?.company_type === 'main' || !activeCompany?.parent_company_id;

  if (isCollapsed) {
    return (
      <div className={`flex items-center justify-center w-full py-1 ${className}`} title={companyName}>
        {imgError ? (
          <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center font-black text-xs border border-white/25 shadow-xs">
            {companyName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20">
            <img
              src={logoSrc}
              alt={companyName}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  const isLightText = variant === 'sidebar' || variant === 'header';

  return (
    <div className={`flex items-center gap-2.5 px-2 py-1 select-none transition-all ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-white/15 dark:bg-neutral-800/60 p-1 flex items-center justify-center shrink-0 border border-white/20 shadow-xs overflow-hidden">
        {imgError ? (
          <div className="w-full h-full rounded-lg bg-white/20 text-white flex items-center justify-center font-black text-xs">
            {companyName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <img
            src={logoSrc}
            alt={companyName}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1 text-left">
        <span className={`font-black text-xs truncate tracking-tight uppercase leading-tight ${
          isLightText ? 'text-white' : 'text-foreground dark:text-neutral-100'
        }`}>
          {companyName}
        </span>
        <span className={`text-[9px] font-bold flex items-center gap-1 mt-0.5 ${
          isLightText ? 'text-purple-200/90' : 'text-muted-foreground dark:text-neutral-400'
        }`}>
          <Building2 className={`w-2.5 h-2.5 shrink-0 ${isLightText ? 'text-purple-200' : 'text-[#942392]'}`} />
          <span className="truncate">{isMainCompany ? 'Parent Entity' : 'Subsidiary'}</span>
        </span>
      </div>
    </div>
  );
};

export default DynamicSidebarLogo;
