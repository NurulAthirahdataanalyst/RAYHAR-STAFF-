import { API_BASE_URL } from '@/config/api';

/**
 * Resolves any company logo URL into a safe, absolute displayable image URL.
 * Handles:
 * 1. Direct CDN / remote URLs (e.g. Supabase Storage: https://...supabase.co/...)
 * 2. Vite bundled local assets (e.g. /assets/rayhar-logo.png)
 * 3. Relative backend uploads (e.g. /uploads/company-logos/...) -> mapped to Supabase CDN or API_BASE_URL
 * 4. Blob URLs from local file upload preview
 */
export function resolveCompanyLogoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Direct HTTP, HTTPS, or Blob URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. Local Vite frontend asset (e.g. /assets/rayhar-logo.png)
  if (trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  // 3. Backend uploads path (/uploads/...)
  if (trimmed.startsWith('/uploads/')) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvpebtompjcjfvuzeumo.supabase.co';
    const subpath = trimmed.replace(/^\/uploads\//, '');
    return `${supabaseUrl}/storage/v1/object/public/mc-attachments/${subpath}`;
  }

  return trimmed;
}
