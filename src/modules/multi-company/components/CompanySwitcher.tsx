import React, { useState, useMemo } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole, normalizeRole } from '@/contexts/RoleContext';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Search, 
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { resolveCompanyLogoUrl } from '../utils/companyLogo';

interface CompanySwitcherProps {
  variant?: 'header' | 'default';
  className?: string;
}

export const CompanySwitcher: React.FC<CompanySwitcherProps> = ({ 
  variant = 'header',
  className = ''
}) => {
  const { activeCompany, companies, setActiveCompanyId, isParentGroupAdmin, userActiveRole, userCompanies } = useCompany();
  const { user } = useAuth();
  const { role: contextRole, scopeType } = useRole();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const activeCompanyName = activeCompany?.company_name || 'Rayhar Travels';
  const isMain = activeCompany?.id === 1 || activeCompany?.company_type === 'main';

  // Determine if current user has HR role or Parent Group Data authorization scope
  const resolvedRole = normalizeRole(contextRole || user?.role);
  const isHR = resolvedRole === 'hr_admin' || resolvedRole === 'admin';
  const isParentScope = (st?: string | null) => {
    if (!st) return false;
    const s = String(st).trim().toLowerCase();
    return s.includes('parent group') || s === 'parent group data' || s === 'parent group access';
  };
  const cachedScope = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem("presence_cached_scope_type") || "") : "";

  const isAssureLeader = resolvedRole === 'assure_leader' || (resolvedRole && resolvedRole.includes('assure'));
  const hasParentGroupScope = 
    !isAssureLeader && (
      isHR || 
      isParentGroupAdmin ||
      isParentScope(user?.scope_type) ||
      isParentScope(userActiveRole?.scope_type) ||
      isParentScope(scopeType) ||
      isParentScope(cachedScope) ||
      userCompanies.some(uc => isParentScope(uc.scope_type)) ||
      resolvedRole === 'managing_director' ||
      resolvedRole === 'operation_manager'
    );

  const canSwitchCompany = hasParentGroupScope;

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => 
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  const handleSelectCompany = (id: number, name: string) => {
    if (!canSwitchCompany) {
      toast.error('Only HR roles or roles with Parent Group Data authorization scope can switch companies.');
      return;
    }
    const targetComp = companies.find(c => c.id === id);
    if (targetComp?.status === 'inactive' && !isHR) {
      toast.error(`${name} is currently inactive.`);
      return;
    }
    setActiveCompanyId(id);
    setOpen(false);
    toast.success(`Switched active context to ${name}`);
  };

  const isHeader = variant === 'header';

  // If role does not have authorization scope for Parent Group Data, render static indicator without switching capability
  if (!canSwitchCompany) {
    return (
      <div
        className={
          isHeader
            ? `flex items-center gap-2 px-3 py-1.5 rounded-xl text-white font-semibold text-xs border border-white/15 bg-white/5 select-none cursor-default shadow-xs ${className}`
            : `flex items-center gap-2 px-3 py-1.5 bg-background dark:bg-card border border-border dark:border-neutral-800 rounded-lg text-foreground dark:text-neutral-100 select-none cursor-default shadow-xs ${className}`
        }
        title={`Current Entity: ${activeCompanyName} (Assigned)`}
      >
        <div className={
          isHeader
            ? "w-5 h-5 rounded-md bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30 font-black text-[10px]"
            : "w-5 h-5 rounded-md bg-[#942392]/10 dark:bg-[#942392]/20 text-[#942392] flex items-center justify-center shrink-0 border border-[#942392]/20 font-black text-[10px]"
        }>
          {activeCompanyName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col text-left">
          <span className={
            isHeader
              ? "text-[11px] font-black uppercase tracking-tight text-white max-w-[120px] sm:max-w-[160px] truncate leading-tight"
              : "text-[11px] font-black uppercase tracking-tight text-foreground dark:text-neutral-100 max-w-[120px] sm:max-w-[160px] truncate leading-tight"
          }>
            {activeCompanyName}
          </span>
          <span className={
            isHeader
              ? "text-[9px] text-purple-200/80 font-medium leading-none mt-0.5"
              : "text-[9px] text-muted-foreground dark:text-neutral-400 font-medium leading-none mt-0.5"
          }>
            {isMain ? 'Main Company' : 'Subsidiary'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={
            isHeader
              ? `flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-all text-white font-semibold text-xs border border-white/20 bg-white/5 active:scale-95 cursor-pointer shadow-xs ${className}`
              : `flex items-center gap-2 px-3 py-1.5 bg-background dark:bg-card hover:bg-muted/70 dark:hover:bg-neutral-800 border border-border dark:border-neutral-800 rounded-lg transition-all shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-[#942392] cursor-pointer ${className}`
          }
          title="Switch active company context"
        >
          <div className={
            isHeader
              ? "w-5 h-5 rounded-md bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30 font-black text-[10px]"
              : "w-5 h-5 rounded-md bg-[#942392]/10 dark:bg-[#942392]/20 text-[#942392] flex items-center justify-center shrink-0 border border-[#942392]/20 font-black text-[10px]"
          }>
            {activeCompanyName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col text-left">
            <span className={
              isHeader
                ? "text-[11px] font-black uppercase tracking-tight text-white max-w-[120px] sm:max-w-[160px] truncate leading-tight"
                : "text-[11px] font-black uppercase tracking-tight text-foreground dark:text-neutral-100 max-w-[120px] sm:max-w-[160px] truncate leading-tight"
            }>
              {activeCompanyName}
            </span>
            <span className={
              isHeader
                ? "text-[9px] text-purple-200/80 font-medium leading-none mt-0.5"
                : "text-[9px] text-muted-foreground dark:text-neutral-400 font-medium leading-none mt-0.5"
            }>
              {isMain ? 'Main Company' : 'Subsidiary'}
            </span>
          </div>
          <ChevronDown className={
            isHeader 
              ? "w-3.5 h-3.5 text-white/70" 
              : "w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200"
          } />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="start" 
        className="w-72 bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95 z-50 text-foreground"
      >
        <DropdownMenuLabel className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground dark:text-neutral-400">
              Select Active Company
            </span>
            {isParentGroupAdmin && (
              <Badge variant="outline" className="text-[9px] bg-[#942392]/10 text-[#942392] border-[#942392]/30 font-bold px-1.5 py-0">
                Group Admin
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>

        {/* Search Input */}
        <div className="px-1.5 pb-1">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/60 dark:bg-neutral-800/80 rounded-md border border-border/50">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-[11px] text-foreground dark:text-white placeholder:text-muted-foreground focus:outline-hidden w-full outline-none"
            />
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/40 dark:bg-neutral-800" />

        {/* Company List */}
        <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
          {filteredCompanies.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No entities found
            </div>
          ) : (
            filteredCompanies.map((c) => {
              const isSelected = activeCompany?.id === c.id;
              const isCompMain = c.id === 1 || c.company_type === 'main';

              return (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => handleSelectCompany(c.id, c.company_name)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#942392]/10 dark:bg-[#942392]/20 text-[#942392] dark:text-purple-300 font-bold'
                      : 'hover:bg-muted/80 dark:hover:bg-neutral-800 text-foreground dark:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-muted dark:bg-neutral-800 p-0.5 flex items-center justify-center shrink-0 border border-border/40">
                      {c.logo_url && resolveCompanyLogoUrl(c.logo_url) ? (
                        <img src={resolveCompanyLogoUrl(c.logo_url)!} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-3 h-3 text-[#942392]" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs truncate tracking-tight">{c.company_name}</span>
                        {c.status === 'inactive' && (
                          <span className="text-[8px] uppercase tracking-wider font-bold px-1 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground dark:text-neutral-400 font-medium">
                        {isCompMain ? 'Parent Entity' : 'Subsidiary Entity'}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#942392] shrink-0" />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        {/* Footer Admin Action */}
        {isParentGroupAdmin && (
          <>
            <DropdownMenuSeparator className="bg-border/40 dark:bg-neutral-800" />
            <DropdownMenuItem
              onClick={() => {
                setOpen(false);
                navigate('/organization/entities');
              }}
              className="flex items-center gap-2 px-2.5 py-2 text-xs text-[#942392] dark:text-purple-300 hover:bg-[#942392]/10 rounded-lg cursor-pointer font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Entity</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CompanySwitcher;
