import { FileSpreadsheet, FileText, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportDropdownProps {
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  className?: string;
}

export function ExportDropdown({ onExportCSV, onExportPDF, className = "" }: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`h-9 flex items-center gap-2 px-3.5 py-2 border-border/80 shadow-sm font-medium text-xs text-muted-foreground hover:text-foreground bg-background hover:bg-muted/40 transition-colors ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
          <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl p-1.5 border border-border shadow-md">
        {onExportCSV && (
          <DropdownMenuItem 
            onClick={onExportCSV} 
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-foreground cursor-pointer focus:bg-muted/60 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            <span>Export CSV</span>
          </DropdownMenuItem>
        )}
        {onExportPDF && (
          <DropdownMenuItem 
            onClick={onExportPDF} 
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-foreground cursor-pointer focus:bg-muted/60 transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>Print PDF</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
