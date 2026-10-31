/**
 * Malaysian MyKad (NRIC) and Mobile Phone formatting and parsing utility.
 * Follows the standard Malaysian National Registration Department (JPN) format:
 * YYMMDD-SS-####
 */

export interface ParsedMyKad {
  isValid: boolean;
  rawDigits: string;
  formatted: string;
  dob: string | null;          // ISO string: "1990-01-01"
  formattedDob: string | null; // Display string: "01 January 1990"
  age: number | null;
  gender: 'Male' | 'Female' | null;
  stateCode: string | null;
}

export function formatMyKad(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

export function parseMyKad(val: string): ParsedMyKad {
  const emptyResult: ParsedMyKad = {
    isValid: false,
    rawDigits: '',
    formatted: '',
    dob: null,
    formattedDob: null,
    age: null,
    gender: null,
    stateCode: null
  };

  if (!val) return emptyResult;
  const digits = val.replace(/\D/g, '');
  const formatted = formatMyKad(digits);

  if (digits.length < 6) {
    return { ...emptyResult, rawDigits: digits, formatted };
  }

  const yy = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);

  // Validate basic date ranges
  if (isNaN(yy) || isNaN(mm) || isNaN(dd) || mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return { ...emptyResult, rawDigits: digits, formatted };
  }

  // Century heuristic: 
  // Malaysian convention: 00-30 = 2000s, 31-99 = 1900s
  const currentYear = new Date().getFullYear();
  const year = yy > 30 ? 1900 + yy : 2000 + yy;

  const birthDate = new Date(year, mm - 1, dd);
  // Verify date validity (e.g. Feb 30th is invalid)
  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== (mm - 1) || birthDate.getDate() !== dd) {
    return { ...emptyResult, rawDigits: digits, formatted };
  }

  // Age calculation: Current year − Birth year, then subtract 1 if birthday hasn't occurred yet this year
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (mm - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dd)) {
    age--;
  }

  // Gender calculation: 12th digit (last digit of MyKad)
  // Odd = Male (1, 3, 5, 7, 9)
  // Even = Female (0, 2, 4, 6, 8)
  let gender: 'Male' | 'Female' | null = null;
  if (digits.length >= 12) {
    const lastDigit = parseInt(digits[11], 10);
    gender = (lastDigit % 2 !== 0) ? 'Male' : 'Female';
  } else if (digits.length >= 7) {
    // If partially typed up to last digit
    const lastDigit = parseInt(digits[digits.length - 1], 10);
    if (!isNaN(lastDigit)) {
      gender = (lastDigit % 2 !== 0) ? 'Male' : 'Female';
    }
  }

  const stateCode = digits.length >= 8 ? digits.slice(6, 8) : null;
  const isoDob = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const formattedDob = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(birthDate);

  return {
    isValid: digits.length === 12,
    rawDigits: digits,
    formatted,
    dob: isoDob,
    formattedDob,
    age: Math.max(0, age),
    gender,
    stateCode
  };
}

export function formatMalaysianPhone(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.startsWith('011')) {
    if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return digits;
  }
  if (digits.startsWith('01')) {
    if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return digits;
  }
  return digits;
}

/**
 * Formats a date string or Date object into standard "DD Month YYYY" format.
 * (e.g. "04 November 2026", "15 January 2025")
 * Safely parses date-only strings (YYYY-MM-DD) to prevent timezone date shifting.
 */
export function formatDisplayDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return "-";
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed || trimmed === "—" || trimmed === "-") return "-";
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch && !trimmed.includes("T") && !trimmed.includes(" ")) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const monthIndex = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      const d = new Date(year, monthIndex, day);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
