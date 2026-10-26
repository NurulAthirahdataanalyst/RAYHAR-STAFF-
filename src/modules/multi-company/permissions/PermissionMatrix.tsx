import React from 'react';
import { PERMISSION_MODULES, PermissionDefinition } from './permission.constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface PermissionMatrixProps {
  selectedKeys: string[];
  onChange: (newKeys: string[]) => void;
  disabled?: boolean;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  selectedKeys,
  onChange,
  disabled = false
}) => {
  const handleToggle = (key: string) => {
    if (disabled) return;
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter(k => k !== key));
    } else {
      onChange([...selectedKeys, key]);
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
    }
  };

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
      {Object.entries(PERMISSION_MODULES).map(([category, perms]) => {
        const catKeys = perms.map(p => p.key);
        const allSelected = catKeys.every(k => selectedKeys.includes(k));
        const someSelected = catKeys.some(k => selectedKeys.includes(k)) && !allSelected;

        return (
          <div 
            key={category} 
            className="rounded-xl border border-border dark:border-neutral-800 bg-card dark:bg-card/90 overflow-hidden shadow-xs"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800">
              <span className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200">
                {category}
              </span>
              <button
                type="button"
                onClick={() => handleSelectAllCategory(category)}
                disabled={disabled}
                className="text-[10px] font-bold text-[#942392] dark:text-[#f885d5] hover:underline"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Checklist items */}
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {perms.map(p => {
                const isChecked = selectedKeys.includes(p.key);
                return (
                  <div
                    key={p.key}
                    onClick={() => handleToggle(p.key)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-[#942392]/5 border-[#942392]/30 dark:bg-[#942392]/10'
                        : 'border-border/40 hover:bg-muted/40 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={disabled}
                      className="mt-0.5 data-[state=checked]:bg-[#942392] data-[state=checked]:border-[#942392]"
                    />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-foreground dark:text-neutral-200 leading-tight">
                        {p.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground dark:text-neutral-400 mt-0.5 leading-snug">
                        {p.description}
                      </span>
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
