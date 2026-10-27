import React from 'react';
import { PERMISSION_MODULES, PermissionDefinition } from './permission.constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCompany } from '../contexts/CompanyContext';

interface PermissionMatrixProps {
  selectedKeys: string[];
  onChange: (newKeys: string[]) => void;
  selectedLevels?: Record<string, 'view' | 'edit'>;
  onLevelsChange?: (newLevels: Record<string, 'view' | 'edit'>) => void;
  disabled?: boolean;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  selectedKeys,
  onChange,
  selectedLevels = {},
  onLevelsChange,
  disabled = false
}) => {
  const { isModuleEnabled } = useCompany();

  const handleToggle = (key: string) => {
    if (disabled) return;
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter(k => k !== key));
    } else {
      onChange([...selectedKeys, key]);
      if (onLevelsChange) {
        onLevelsChange({
          ...selectedLevels,
          [key]: selectedLevels[key] || 'edit'
        });
      }
    }
  };

  const handleSetLevel = (e: React.MouseEvent, key: string, level: 'view' | 'edit') => {
    e.stopPropagation();
    if (disabled) return;
    if (!selectedKeys.includes(key)) {
      onChange([...selectedKeys, key]);
    }
    if (onLevelsChange) {
      onLevelsChange({
        ...selectedLevels,
        [key]: level
      });
    }
  };

  const handleSelectAllCategory = (category: string) => {
    if (disabled) return;
    const catKeys = PERMISSION_MODULES[category].map(p => p.key);
    const allSelected = catKeys.every(k => selectedKeys.includes(k));

    if (allSelected) {
      onChange(selectedKeys.filter(k => !catKeys.includes(k)));
    } else {
      const merged = Array.from(new Set([...selectedKeys, ...catKeys]));
      onChange(merged);
      if (onLevelsChange) {
        const nextLevels = { ...selectedLevels };
        catKeys.forEach(k => {
          if (!nextLevels[k]) nextLevels[k] = 'edit';
        });
        onLevelsChange(nextLevels);
      }
    }
  };

  return (
    <div className="space-y-3">
      {Object.entries(PERMISSION_MODULES).map(([category, perms]) => {
        // Filter out categories disabled for active company
        if (!isModuleEnabled(category)) {
          return null;
        }

        const catKeys = perms.map(p => p.key);
        const allSelected = catKeys.every(k => selectedKeys.includes(k));
        const someSelected = catKeys.some(k => selectedKeys.includes(k)) && !allSelected;

        return (
          <div 
            key={category} 
            className="rounded-xl border border-border dark:border-neutral-800 bg-card dark:bg-card/90 overflow-hidden shadow-xs"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800">
              <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                {category}
              </span>
              <button
                type="button"
                onClick={() => handleSelectAllCategory(category)}
                disabled={disabled}
                className="text-xs font-bold text-[#942392] dark:text-[#f885d5] hover:underline"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Checklist items */}
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {perms.map(p => {
                const isChecked = selectedKeys.includes(p.key);
                const currentLevel = selectedLevels[p.key] || 'edit';

                return (
                  <div
                    key={p.key}
                    onClick={() => handleToggle(p.key)}
                    className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-[#942392]/5 border-[#942392]/30 dark:bg-[#942392]/10'
                        : 'border-border/40 hover:bg-muted/40 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Checkbox
                        checked={isChecked}
                        disabled={disabled}
                        className="mt-0.5 data-[state=checked]:bg-[#942392] data-[state=checked]:border-[#942392]"
                      />
                      <div className="flex flex-col text-left min-w-0">
                        <span className={`text-xs font-bold leading-tight truncate ${
                          isChecked ? 'text-black dark:text-white' : 'text-muted-foreground'
                        }`}>
                          {p.label}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                          {p.description}
                        </span>
                      </div>
                    </div>

                    {/* Segmented View | Edit Toggle */}
                    <div className="inline-flex items-center p-0.5 rounded-full bg-muted/80 dark:bg-neutral-800 border border-border/60 shrink-0">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={(e) => handleSetLevel(e, p.key, 'view')}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                          isChecked && currentLevel === 'view'
                            ? 'bg-[#942392] text-white shadow-2xs'
                            : isChecked
                            ? 'text-muted-foreground hover:text-black dark:hover:text-white'
                            : 'text-muted-foreground/40'
                        }`}
                        title="View access"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={(e) => handleSetLevel(e, p.key, 'edit')}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                          isChecked && currentLevel === 'edit'
                            ? 'bg-[#942392] text-white shadow-2xs'
                            : isChecked
                            ? 'text-muted-foreground hover:text-black dark:hover:text-white'
                            : 'text-muted-foreground/40'
                        }`}
                        title="Edit access"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
