export const branchMap: Record<string, string> = {
  HQ: 'Rayhar HQ',
  AOR: 'Alor Setar',
  BTP: 'Batu Pahat',
  BTM: 'Bertam',
  CNH: 'Cheneh',
  DGN: 'Dungun',
  IPH: 'Ipoh',
  JHB: 'Johor Bahru',
  JB: 'Johor Bahru',
  KBG: 'Kubang Kerian',
  KBR: 'Kota Bharu',
  KKS: 'Kuala Kangsar',
  KMM: 'Kemaman',
  KTG: 'Kuala Terengganu',
  TGG: 'Kuala Terengganu',
  MJG: 'Manjung',
  MLK: 'Melaka',
  MZM: 'Muadzam Shah',
  RMP: 'Rompin',
  SNS: 'Seremban',
  SPJ: 'Sungai Petani',
  TWU: 'Tawau',
  JTH: 'Jertih',
  RAYRENT: 'Rayhar Rent'
};

/**
 * Converts any string into Proper Case (Title Case), preserving acronyms like HQ.
 * e.g. "rayhar rent" -> "Rayhar Rent"
 * e.g. "alor setar" -> "Alor Setar"
 * e.g. "rayhar hq" -> "Rayhar HQ"
 */
export const toProperCase = (str: string | undefined | null): string => {
  if (!str) return '';
  const trimmed = String(str).trim();
  if (!trimmed) return '';

  // Acronym preserves
  if (trimmed.toUpperCase() === 'HQ') return 'HQ';
  if (trimmed.toUpperCase() === 'JB') return 'JB';
  if (trimmed.toUpperCase() === 'KL') return 'KL';

  return trimmed
    .split(/\s+/)
    .map(word => {
      const upper = word.toUpperCase();
      if (upper === 'HQ') return 'HQ';
      if (upper === 'KL') return 'KL';
      if (upper === 'JB') return 'JB';
      if (upper === 'SDN' || upper === 'SDN.') return 'Sdn';
      if (upper === 'BHD' || upper === 'BHD.') return 'Bhd';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Formats branch display with code and name in Proper Case.
 */
export const formatBranchName = (branchCode: string): string => {
  if (!branchCode) return '-';
  const code = branchCode.toUpperCase().trim();
  if (code === 'HQ') return 'HQ';
  const name = branchMap[code];
  if (name) {
    return `${code} - ${toProperCase(name)}`;
  }
  return toProperCase(branchCode);
};

/**
 * Returns the branch's clean proper-case name.
 */
export const formatBranchDisplayName = (branch: { code?: string; name?: string } | string): string => {
  if (!branch) return '';
  if (typeof branch === 'string') {
    const code = branch.toUpperCase().trim();
    if (branchMap[code]) return toProperCase(branchMap[code]);
    return toProperCase(branch);
  }
  if (branch.name && branch.name.trim()) {
    return toProperCase(branch.name);
  }
  if (branch.code && branchMap[branch.code.toUpperCase().trim()]) {
    return toProperCase(branchMap[branch.code.toUpperCase().trim()]);
  }
  return toProperCase(branch.code || '');
};

// ==========================================
// HIGH-SPEED FAST COORDINATES & GEOCODING UTILS
// ==========================================

export function parseCoordinates(input: string): { lat: string; lon: string; numLat: number; numLng: number } | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // 1. Google Maps URL pattern: @lat,lng or ?q=lat,lng
  const urlMatch = raw.match(/[@?&]q?=([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lng = parseFloat(urlMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: lat.toFixed(6), lon: lng.toFixed(6), numLat: lat, numLng: lng };
    }
  }

  // 2. Clean standard punctuation and direction indicators
  const clean = raw
    .replace(/[°'"]/g, '')
    .replace(/;/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  // 3. Pattern: "lat, lng" or "lat lng" (handles optional N/S/E/W)
  const match = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*[NS]?\s*[, ]\s*([+-]?\d+(?:\.\d+)?)\s*[EW]?$/i);
  if (match) {
    let lat = parseFloat(match[1]);
    let lng = parseFloat(match[2]);
    if (/S/i.test(clean) && lat > 0) lat = -lat;
    if (/W/i.test(clean) && lng > 0) lng = -lng;
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: lat.toFixed(6), lon: lng.toFixed(6), numLat: lat, numLng: lng };
    }
  }

  // 4. Extract first two valid floats if comma/space separated
  const floatMatches = raw.match(/[-+]?[0-9]+\.?[0-9]*/g);
  if (floatMatches && floatMatches.length >= 2) {
    const lat = parseFloat(floatMatches[0]);
    const lng = parseFloat(floatMatches[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: lat.toFixed(6), lon: lng.toFixed(6), numLat: lat, numLng: lng };
    }
  }

  return null;
}

const geocodeCache = new Map<string, { lat: string; lon: string; display_name?: string }>();

export async function smartGeocode(address: string): Promise<{ lat: string; lon: string; display_name?: string } | null> {
  const trimmed = String(address || '').trim();
  if (!trimmed) return null;

  // Instant check: is it already coordinates? (0ms)
  const parsed = parseCoordinates(trimmed);
  if (parsed) {
    return { lat: parsed.lat, lon: parsed.lon, display_name: `${parsed.lat}, ${parsed.lon}` };
  }

  // Check in-memory cache
  const cacheKey = trimmed.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  const queryNominatim = async (query: string) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s fast timeout
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=my&limit=1&accept-language=en`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!r.ok) return null;
      const data = await r.json();
      return data && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  };

  // Strip lot/unit numbers
  const stripped = trimmed
    .replace(/\b(LOT|PT|NO\.?|UNIT|BLOK|BLK|KM|KILOMETER)\s*[\d\w-]+[,\s]*/gi, '')
    .replace(/^[,\s]+/, '')
    .trim();

  // Strategy 1: Cleaned address or full address
  let result = await queryNominatim((stripped || trimmed) + ", Malaysia");
  if (!result && stripped !== trimmed) {
    result = await queryNominatim(trimmed + ", Malaysia");
  }

  // Strategy 2: Town/city last 2 segments
  if (!result) {
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      result = await queryNominatim(parts.slice(-2).join(', ') + ", Malaysia");
    }
  }

  if (result) {
    const res = { lat: String(result.lat), lon: String(result.lon), display_name: result.display_name };
    geocodeCache.set(cacheKey, res);
    return res;
  }

  return null;
}

const reverseGeocodeCache = new Map<string, string>();

export async function fastReverseGeocode(lat: number, lon: number): Promise<string> {
  const roundedLat = lat.toFixed(5);
  const roundedLon = lon.toFixed(5);
  const key = `${roundedLat},${roundedLon}`;
  if (reverseGeocodeCache.has(key)) {
    return reverseGeocodeCache.get(key)!;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return `${roundedLat}, ${roundedLon}`;
    const data = await res.json();
    const name = data?.display_name || `${roundedLat}, ${roundedLon}`;
    reverseGeocodeCache.set(key, name);
    return name;
  } catch {
    return `${roundedLat}, ${roundedLon}`;
  }
}

