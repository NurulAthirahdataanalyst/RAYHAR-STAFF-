import React, { useState, useRef } from 'react';
import { Upload, X, Check, Image as ImageIcon, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { multiCompanyApi } from '../services/multiCompanyApi';

interface CompanyLogoUploaderProps {
  companyId: number;
  companyName: string;
  currentLogoUrl?: string | null;
  onLogoUpdated: (newUrl: string | null) => void;
}

export const CompanyLogoUploader: React.FC<CompanyLogoUploaderProps> = ({
  companyId,
  companyName,
  currentLogoUrl,
  onLogoUpdated
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File exceeds maximum 2MB size limit');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file format. Please upload PNG, JPG, SVG, or WebP');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const newUrl = await multiCompanyApi.uploadLogo(companyId, selectedFile);
      toast.success(`Logo updated successfully for ${companyName}!`);
      onLogoUpdated(newUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setUploading(true);
      await multiCompanyApi.resetLogo(companyId);
      toast.info(`Restored standard brand emblem for ${companyName}`);
      onLogoUpdated(companyId === 1 ? '/assets/rayhar-logo.png' : null);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset logo');
    } finally {
      setUploading(false);
    }
  };

  const activeDisplayLogo = previewUrl || currentLogoUrl || '/assets/rayhar-logo.png';

  return (
    <div className="p-4 bg-muted/40 dark:bg-neutral-900/60 rounded-xl border border-border dark:border-neutral-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#942392]" />
            Official Company Logo
          </h4>
          <p className="text-[11px] text-muted-foreground dark:text-neutral-400 mt-0.5">
            Displayed at the top of the sidebar and top navigation when this company is active
          </p>
        </div>

        {currentLogoUrl && (
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={uploading}
            className="text-[10px] font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 self-start sm:self-auto transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Revert to Default
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Preview Container */}
        <div className="w-40 h-16 rounded-xl bg-white dark:bg-neutral-800 p-2 flex items-center justify-center border border-border dark:border-neutral-700 shadow-xs shrink-0 overflow-hidden relative group">
          <img
            src={activeDisplayLogo}
            alt="Company Logo Preview"
            className="w-full h-full object-contain"
          />
          {selectedFile && (
            <div className="absolute inset-0 bg-[#942392]/80 text-white flex items-center justify-center text-[10px] font-black uppercase">
              New Preview
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2 w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-bold border-[#942392]/30 hover:bg-[#942392]/10 text-foreground dark:text-neutral-200"
            >
              <Upload className="w-3.5 h-3.5 mr-1 text-[#942392]" />
              {selectedFile ? 'Change Selected File' : 'Choose Logo Image'}
            </Button>

            {selectedFile && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-[#942392] hover:bg-[#800A7A] text-white font-bold text-xs shadow-xs"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  )}
                  Apply & Replace Logo
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={uploading}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
              </>
            )}
          </div>

          <span className="text-[10px] text-muted-foreground dark:text-neutral-500 block">
            Recommended: PNG or SVG with transparent background, ratio 4:1 (e.g. 240×60px). Max 2MB.
          </span>
        </div>
      </div>
    </div>
  );
};
