import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TableScrollTopButton } from '@/components/shared/TableScrollTopButton';

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  tableRef?: React.RefObject<HTMLElement | null>;
  showPageSize?: boolean;
  showTotal?: boolean;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
  tableRef,
  showPageSize = true,
  showTotal = true,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const fromIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <>
      <div className={`flex flex-col sm:flex-row items-center ${(!showTotal && !showPageSize) ? 'justify-end' : 'justify-between'} p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50 ${className}`}>
        {(showTotal || showPageSize) && (
          <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest flex-wrap">
            {showTotal && (
              <span>
                TOTAL SHOWING {fromIndex} TO {toIndex} OF {totalItems} ENTRIES
              </span>
            )}
            {showPageSize && (
              <div className="flex items-center gap-2">
                <span>Show</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    onPageSizeChange(Number(val));
                    onPageChange(1);
                  }}
                >
              <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[65px] bg-card">
                <SelectValue placeholder={String(pageSize)}>{pageSize}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}
        </div>
      )}

        <div className="flex items-center gap-1.5">
          <Button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 rounded-md border-gray-200 dark:border-slate-800 bg-card text-foreground hover:bg-[#942392] hover:text-white hover:border-[#942392] focus:bg-[#942392] focus:text-white disabled:opacity-40 transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">
                  ...
                </span>
              );
            }
            const pageNum = page as number;
            const isActive = currentPage === pageNum;
            return (
              <Button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`h-7 min-w-[28px] px-2 rounded-md text-[11px] font-bold ${
                  isActive
                    ? 'bg-[#942392] hover:bg-[#5e0080] text-white border-[#942392]'
                    : 'border-gray-200 dark:border-slate-800 bg-card text-foreground'
                }`}
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 rounded-md border-gray-200 dark:border-slate-800 bg-card text-foreground hover:bg-[#942392] hover:text-white hover:border-[#942392] focus:bg-[#942392] focus:text-white disabled:opacity-40 transition-colors"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <TableScrollTopButton entriesPerPage={pageSize} threshold={50} tableRef={tableRef} />
    </>
  );
};

// ── CUSTOM DATE PICKER (Purple Theme matching Attendance page) ──
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  displayFormat?: "DD/MM/YYYY" | "DD MMM YYYY";
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select Date",
  className,
  displayFormat = "DD/MM/YYYY",
}) => {
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parts = value.split("-");
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(value);
  }, [value]);

  const formattedText = React.useMemo(() => {
    if (!parsedDate || isNaN(parsedDate.getTime())) return placeholder;
    if (displayFormat === "DD MMM YYYY") {
      return parsedDate
        .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        .toUpperCase();
    }
    const d = String(parsedDate.getDate()).padStart(2, "0");
    const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const y = parsedDate.getFullYear();
    return `${d}/${m}/${y}`;
  }, [parsedDate, displayFormat, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between px-3 py-2 bg-background border border-border rounded-xl text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#942392] focus:ring-1 focus:ring-[#942392] transition-all cursor-pointer h-10 gap-2 font-semibold select-none",
            className
          )}
        >
          <span className={cn("truncate", !parsedDate ? "text-muted-foreground font-normal normal-case" : "font-semibold uppercase tracking-wide")}>
            {formattedText}
          </span>
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 overflow-hidden border-none shadow-2xl rounded-xl bg-card z-[200]" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={(d) => {
            if (d) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              onChange(`${year}-${month}-${day}`);
              setOpen(false);
            } else {
              onChange("");
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

// ── CUSTOM TIME PICKER (Re-exported from ui/custom-time-picker) ──
export { CustomTimePicker, type CustomTimePickerProps } from "@/components/ui/custom-time-picker";