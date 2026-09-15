import React from "react";

export interface AvatarOption {
  id: string;
  name: string;
  gender?: "female" | "male" | "neutral";
  render: (size?: number | string) => React.ReactNode;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: "glasses-boy",
    name: "Noah (Round Glasses & Brown Hair)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#E2E8F0" />
        {/* Torso */}
        <path d="M20 95 C25 68, 75 68, 80 95 Z" fill="#64748B" />
        <path d="M38 72 L62 72 L58 90 L42 90 Z" fill="#475569" />
        {/* Crossbody Strap */}
        <path d="M30 72 L70 95" stroke="#C2410C" strokeWidth="4" strokeLinecap="round" />
        {/* Neck */}
        <rect x="43" y="58" width="14" height="15" rx="4" fill="#F8C4A5" />
        {/* Head */}
        <ellipse cx="50" cy="46" rx="23" ry="22" fill="#FBD5BD" />
        {/* Ears */}
        <circle cx="26" cy="48" r="6" fill="#F8C4A5" />
        <circle cx="74" cy="48" r="6" fill="#F8C4A5" />
        {/* Hair */}
        <path d="M26 38 C25 18, 75 18, 74 38 C72 24, 60 22, 50 24 C40 22, 28 24, 26 38 Z" fill="#6B3A1C" />
        <path d="M32 30 Q40 22 52 30 Q60 22 68 30 Q58 35 50 32 Q42 35 32 30 Z" fill="#522C14" />
        {/* Cheeks */}
        <circle cx="36" cy="52" r="4.5" fill="#F87171" opacity="0.35" />
        <circle cx="64" cy="52" r="4.5" fill="#F87171" opacity="0.35" />
        {/* Glasses */}
        <circle cx="38" cy="45" r="9.5" fill="none" stroke="#0F172A" strokeWidth="3" />
        <circle cx="62" cy="45" r="9.5" fill="none" stroke="#0F172A" strokeWidth="3" />
        <line x1="47.5" y1="45" x2="52.5" y2="45" stroke="#0F172A" strokeWidth="3" />
        {/* Eyes */}
        <circle cx="38" cy="45" r="2.8" fill="#0F172A" />
        <circle cx="62" cy="45" r="2.8" fill="#0F172A" />
        <circle cx="39" cy="44" r="0.9" fill="#FFFFFF" />
        <circle cx="63" cy="44" r="0.9" fill="#FFFFFF" />
        {/* Nose */}
        <circle cx="50" cy="51" r="2.2" fill="#E29A78" />
        {/* Mouth */}
        <path d="M46 58 Q50 61 54 58" stroke="#A35232" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "hijab-pink",
    name: "Nurul (Pink Hijab)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#7C3AED" />
        {/* Hijab Back/Shoulders */}
        <path d="M20 95 C18 68, 82 68, 80 95 Z" fill="#F472B6" />
        <path d="M26 65 C32 82, 68 82, 74 65 C80 78, 82 92, 82 96 L18 96 C18 92, 20 78, 26 65 Z" fill="#EC4899" />
        {/* Hijab Drape & Wrap */}
        <path d="M26 48 C24 24, 76 24, 74 48 C74 72, 64 78, 50 78 C36 78, 26 72, 26 48 Z" fill="#FBCFE8" />
        <path d="M28 46 C27 26, 73 26, 72 46 C72 66, 62 74, 50 74 C38 74, 28 66, 28 46 Z" fill="#F472B6" />
        {/* Inner Cap */}
        <path d="M36 34 C42 30, 58 30, 64 34 L64 42 C58 38, 42 38, 36 42 Z" fill="#DB2777" />
        {/* Face */}
        <ellipse cx="50" cy="49" rx="14" ry="17" fill="#8D5B4C" />
        {/* Eyebrows */}
        <path d="M40 40 Q44 38 47 40" stroke="#3E2419" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M53 40 Q56 38 60 40" stroke="#3E2419" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <ellipse cx="43" cy="45" rx="2.5" ry="3" fill="#1C1917" />
        <ellipse cx="57" cy="45" rx="2.5" ry="3" fill="#1C1917" />
        <circle cx="44" cy="44" r="0.9" fill="#FFFFFF" />
        <circle cx="58" cy="44" r="0.9" fill="#FFFFFF" />
        {/* Smile & Nose */}
        <path d="M50 47 L50 51" stroke="#6D4337" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M45 56 Q50 60 55 56" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* Hijab folds */}
        <path d="M42 66 Q50 74 65 67" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "hijab-teal",
    name: "Siti (Teal Hijab)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#0D9488" />
        {/* Hijab Shoulders */}
        <path d="M20 95 C18 68, 82 68, 80 95 Z" fill="#14B8A6" />
        {/* Hijab Head wrap */}
        <path d="M26 48 C24 24, 76 24, 74 48 C74 72, 64 78, 50 78 C36 78, 26 72, 26 48 Z" fill="#2DD4BF" />
        <path d="M28 46 C27 26, 73 26, 72 46 C72 68, 62 75, 50 75 C38 75, 28 68, 28 46 Z" fill="#0F766E" />
        {/* Inner Cap */}
        <path d="M37 33 C42 30, 58 30, 63 33 L63 40 C58 37, 42 37, 37 40 Z" fill="#FFFFFF" />
        {/* Face */}
        <ellipse cx="50" cy="49" rx="14" ry="17" fill="#F8C4A5" />
        {/* Cheeks */}
        <circle cx="41" cy="53" r="3.5" fill="#F43F5E" opacity="0.3" />
        <circle cx="59" cy="53" r="3.5" fill="#F43F5E" opacity="0.3" />
        {/* Eyes */}
        <ellipse cx="43" cy="46" rx="2.5" ry="3" fill="#1E293B" />
        <ellipse cx="57" cy="46" rx="2.5" ry="3" fill="#1E293B" />
        <circle cx="44" cy="45" r="0.9" fill="#FFFFFF" />
        <circle cx="58" cy="45" r="0.9" fill="#FFFFFF" />
        {/* Smile */}
        <path d="M46 56 Q50 60 54 56" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "sunglasses-cool",
    name: "Malik (Cool Sunglasses)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#F59E0B" />
        {/* Clothes */}
        <path d="M20 95 C22 68, 78 68, 80 95 Z" fill="#7C3AED" />
        <path d="M38 75 L62 75 L60 95 L40 95 Z" fill="#FFFFFF" />
        {/* Neck */}
        <rect x="43" y="60" width="14" height="15" fill="#C28867" />
        {/* Face */}
        <ellipse cx="50" cy="47" rx="21" ry="22" fill="#DDA17B" />
        {/* Ears */}
        <circle cx="28" cy="48" r="5" fill="#C28867" />
        <circle cx="72" cy="48" r="5" fill="#C28867" />
        {/* Hair */}
        <path d="M28 42 C26 22, 74 20, 72 40 C68 24, 32 24, 28 42 Z" fill="#1E1B18" />
        {/* Sunglasses */}
        <rect x="31" y="42" width="16" height="11" rx="4" fill="#0F172A" />
        <rect x="53" y="42" width="16" height="11" rx="4" fill="#0F172A" />
        <line x1="47" y1="46" x2="53" y2="46" stroke="#0F172A" strokeWidth="3" />
        <line x1="33" y1="51" x2="41" y2="44" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="55" y1="51" x2="63" y2="44" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        {/* Smile */}
        <path d="M44 60 Q50 65 56 60" stroke="#78350F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "young-woman-blue",
    name: "Sarah (Short Bob)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#6366F1" />
        <path d="M22 95 C25 68, 75 68, 78 95 Z" fill="#0284C7" />
        <rect x="44" y="60" width="12" height="14" fill="#FBD5BD" />
        <path d="M26 44 C22 62, 28 66, 32 68 L28 44 Z" fill="#18181B" />
        <path d="M74 44 C78 62, 72 66, 68 68 L72 44 Z" fill="#18181B" />
        <ellipse cx="50" cy="48" rx="20" ry="21" fill="#FEE5D4" />
        <path d="M28 46 C26 22, 74 22, 72 46 C68 28, 55 26, 50 28 C45 26, 32 28, 28 46 Z" fill="#18181B" />
        <path d="M30 38 Q42 34 50 40 Q58 34 70 38 Q60 30 50 32 Q40 30 30 38 Z" fill="#27272A" />
        <ellipse cx="42" cy="47" rx="2.5" ry="3" fill="#1E293B" />
        <ellipse cx="58" cy="47" rx="2.5" ry="3" fill="#1E293B" />
        <path d="M45 57 Q50 62 55 57" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "smart-glasses",
    name: "Rayyan (Blue Glasses)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#EF4444" />
        <path d="M20 95 C24 68, 76 68, 80 95 Z" fill="#0EA5E9" />
        <rect x="43" y="60" width="14" height="15" fill="#FBD5BD" />
        <ellipse cx="50" cy="47" rx="21" ry="22" fill="#FEE5D4" />
        <path d="M28 40 C28 20, 72 20, 72 40 C68 24, 32 24, 28 40 Z" fill="#0F172A" />
        <circle cx="39" cy="46" r="8" fill="none" stroke="#2563EB" strokeWidth="2.5" />
        <circle cx="61" cy="46" r="8" fill="none" stroke="#2563EB" strokeWidth="2.5" />
        <line x1="47" y1="46" x2="53" y2="46" stroke="#2563EB" strokeWidth="2.5" />
        <circle cx="39" cy="46" r="2.5" fill="#0F172A" />
        <circle cx="61" cy="46" r="2.5" fill="#0F172A" />
        <path d="M46 59 Q50 63 54 59" stroke="#9A3412" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "woman-long-hair",
    name: "Diana (Long Wavy Hair)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#EAB308" />
        <path d="M22 45 C18 78, 22 95, 30 95 L70 95 C78 95, 82 78, 78 45 Z" fill="#18181B" />
        <path d="M26 95 C28 72, 72 72, 74 95 Z" fill="#15803D" />
        <ellipse cx="50" cy="48" rx="19" ry="20" fill="#FBD5BD" />
        <path d="M28 45 C28 22, 72 22, 72 45 C65 28, 55 26, 50 30 C45 26, 35 28, 28 45 Z" fill="#27272A" />
        <circle cx="31" cy="52" r="2.5" fill="#FFFFFF" />
        <circle cx="69" cy="52" r="2.5" fill="#FFFFFF" />
        <ellipse cx="43" cy="47" rx="2.5" ry="3" fill="#1E293B" />
        <ellipse cx="57" cy="47" rx="2.5" ry="3" fill="#1E293B" />
        <path d="M45 57 Q50 62 55 57" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "dark-yellow-glasses",
    name: "Kofi (Yellow Glasses)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#86EFAC" />
        <path d="M22 95 C25 68, 75 68, 78 95 Z" fill="#FCE7F3" />
        <rect x="44" y="60" width="12" height="15" fill="#5B3828" />
        <ellipse cx="50" cy="47" rx="21" ry="22" fill="#784B35" />
        <ellipse cx="50" cy="30" rx="20" ry="12" fill="#1C1917" />
        <rect x="32" y="42" width="15" height="10" rx="2" fill="none" stroke="#EAB308" strokeWidth="2.8" />
        <rect x="53" y="42" width="15" height="10" rx="2" fill="none" stroke="#EAB308" strokeWidth="2.8" />
        <line x1="47" y1="47" x2="53" y2="47" stroke="#EAB308" strokeWidth="2.8" />
        <circle cx="39" cy="47" r="2.5" fill="#1C1917" />
        <circle cx="61" cy="47" r="2.5" fill="#1C1917" />
        <path d="M44 60 Q50 66 56 60" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "man-green-cap",
    name: "Tariq (Green Cap)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#22C55E" />
        <path d="M22 95 C25 68, 75 68, 78 95 Z" fill="#F97316" />
        <rect x="44" y="60" width="12" height="14" fill="#E2A684" />
        <ellipse cx="50" cy="50" rx="20" ry="21" fill="#F4C0A1" />
        <path d="M28 42 C28 24, 72 24, 72 42 Z" fill="#166534" />
        <ellipse cx="50" cy="42" rx="26" ry="6" fill="#15803D" />
        <circle cx="40" cy="49" r="7" fill="none" stroke="#EA580C" strokeWidth="2.5" />
        <circle cx="60" cy="49" r="7" fill="none" stroke="#EA580C" strokeWidth="2.5" />
        <line x1="47" y1="49" x2="53" y2="49" stroke="#EA580C" strokeWidth="2.5" />
        <circle cx="40" cy="49" r="2.2" fill="#1E293B" />
        <circle cx="60" cy="49" r="2.2" fill="#1E293B" />
        <path d="M45 61 Q50 66 55 61" stroke="#9A3412" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "woman-curly-black",
    name: "Maya (Curly Hair)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#E11D48" />
        <circle cx="30" cy="38" r="14" fill="#18181B" />
        <circle cx="70" cy="38" r="14" fill="#18181B" />
        <circle cx="50" cy="26" r="16" fill="#18181B" />
        <circle cx="28" cy="54" r="12" fill="#18181B" />
        <circle cx="72" cy="54" r="12" fill="#18181B" />
        <path d="M22 95 C25 70, 75 70, 78 95 Z" fill="#2563EB" />
        <ellipse cx="50" cy="50" rx="19" ry="20" fill="#FEE5D4" />
        <path d="M29 58 L32 64 L26 64 Z" fill="#FFFFFF" />
        <path d="M71 58 L74 64 L68 64 Z" fill="#FFFFFF" />
        <ellipse cx="43" cy="48" rx="2.5" ry="3" fill="#1E293B" />
        <ellipse cx="57" cy="48" rx="2.5" ry="3" fill="#1E293B" />
        <path d="M44 59 Q50 63 56 59" stroke="#E11D48" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "man-elder",
    name: "Haji Ahmad (Senior Staff)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#EF4444" />
        <path d="M22 95 C25 68, 75 68, 78 95 Z" fill="#1E3A8A" />
        <rect x="44" y="60" width="12" height="15" fill="#E2A684" />
        <ellipse cx="50" cy="47" rx="21" ry="22" fill="#F4C0A1" />
        <path d="M28 42 C26 20, 74 20, 72 42 C68 26, 32 26, 28 42 Z" fill="#F1F5F9" />
        <line x1="38" y1="46" x2="44" y2="46" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="56" y1="46" x2="62" y2="46" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M45 58 Q50 63 55 58" stroke="#9A3412" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "woman-elder",
    name: "Hajjah Maryam (Senior Exec)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#FBCFE8" />
        <path d="M22 95 C25 68, 75 68, 78 95 Z" fill="#1E40AF" />
        <ellipse cx="50" cy="48" rx="20" ry="21" fill="#F8C4A5" />
        <circle cx="34" cy="34" r="10" fill="#F1F5F9" />
        <circle cx="50" cy="26" r="11" fill="#F1F5F9" />
        <circle cx="66" cy="34" r="10" fill="#F1F5F9" />
        <circle cx="30" cy="44" r="8" fill="#F1F5F9" />
        <circle cx="70" cy="44" r="8" fill="#F1F5F9" />
        <circle cx="28" cy="52" r="3.5" fill="#EF4444" />
        <circle cx="72" cy="52" r="3.5" fill="#EF4444" />
        <ellipse cx="43" cy="47" rx="2.2" ry="2.8" fill="#1E293B" />
        <ellipse cx="57" cy="47" rx="2.2" ry="2.8" fill="#1E293B" />
        <path d="M45 58 Q50 63 55 58" stroke="#BE123C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "man-beard-clean",
    name: "Zul (Neat Beard)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#FCE7F3" />
        <path d="M22 95 C25 68, 75 68, 78 95 Z" fill="#047857" />
        <ellipse cx="50" cy="46" rx="20" ry="21" fill="#E2A684" />
        <path d="M30 40 C30 22, 70 22, 70 40 C65 26, 35 26, 30 40 Z" fill="#18181B" />
        <path d="M33 50 C33 70, 67 70, 67 50 C67 65, 33 65, 33 50 Z" fill="#18181B" />
        <circle cx="42" cy="45" r="2.6" fill="#0F172A" />
        <circle cx="58" cy="45" r="2.6" fill="#0F172A" />
        <path d="M46 58 Q50 62 54 58" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "woman-ponytail",
    name: "Aisyah (Hair Bun & Glasses)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#FDE047" />
        <circle cx="50" cy="22" r="10" fill="#1C1917" />
        <path d="M22 95 C25 68, 75 68, 78 95 Z" fill="#4338CA" />
        <ellipse cx="50" cy="48" rx="19" ry="20" fill="#FEE5D4" />
        <path d="M30 40 C32 26, 68 26, 70 40 C65 30, 35 30, 30 40 Z" fill="#1C1917" />
        <circle cx="42" cy="47" r="7" fill="none" stroke="#0F172A" strokeWidth="2.4" />
        <circle cx="58" cy="47" r="7" fill="none" stroke="#0F172A" strokeWidth="2.4" />
        <line x1="49" y1="47" x2="51" y2="47" stroke="#0F172A" strokeWidth="2.4" />
        <circle cx="42" cy="47" r="2.2" fill="#0F172A" />
        <circle cx="58" cy="47" r="2.2" fill="#0F172A" />
        <path d="M46 58 Q50 62 54 58" stroke="#BE185D" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "man-modern-blue",
    name: "Adam (Minimalist Blue)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#E2E8F0" />
        <path d="M22 95 C25 68, 75 68, 78 95 Z" fill="#1E3A8A" />
        <rect x="44" y="60" width="12" height="15" fill="#D97706" opacity="0.85" />
        <ellipse cx="50" cy="48" rx="20" ry="21" fill="#F59E0B" opacity="0.8" />
        <path d="M30 40 C28 22, 72 22, 70 40 Z" fill="#0F172A" />
      </svg>
    ),
  },
  {
    id: "initials",
    name: "Default Initials Badge",
    gender: "neutral",
    render: () => (
      <div className="w-full h-full rounded-full bg-gradient-to-br from-[#942392] to-[#c026d3] flex items-center justify-center text-white font-black text-xl shadow-inner">
        ★
      </div>
    ),
  },
];

const STORAGE_KEY = "rayhar_selected_avatar";

export function getSavedAvatar(userId?: string): string {
  try {
    if (userId) {
      const userSpecific = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (userSpecific) return userSpecific;
    }
    const globalSaved = localStorage.getItem(STORAGE_KEY);
    if (globalSaved) return globalSaved;
  } catch (e) {
    console.error("Failed to get saved avatar", e);
  }
  return "initials";
}

export function saveSelectedAvatar(avatarId: string, userId?: string): void {
  try {
    if (userId) {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, avatarId);
    }
    localStorage.setItem(STORAGE_KEY, avatarId);
    window.dispatchEvent(new CustomEvent("avatarChanged", { detail: avatarId }));
  } catch (e) {
    console.error("Failed to save avatar", e);
  }
}

interface UserAvatarProps {
  avatarId?: string;
  name?: string;
  className?: string;
  size?: number | string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ avatarId, name = "U", className = "w-full h-full", size = "100%" }) => {
  const initial = (name || "U").trim()[0]?.toUpperCase() || "U";
  
  if (!avatarId || avatarId === "initials") {
    return (
      <div className={`w-full h-full rounded-full bg-gradient-to-br from-[#942392] to-[#c026d3] flex items-center justify-center text-white font-black select-none ${className}`}>
        {initial}
      </div>
    );
  }

  const found = AVATAR_OPTIONS.find((a) => a.id === avatarId);
  if (found) {
    return (
      <div className={`w-full h-full flex items-center justify-center overflow-hidden rounded-full ${className}`}>
        {found.render(size)}
      </div>
    );
  }

  return (
    <div className={`w-full h-full rounded-full bg-gradient-to-br from-[#942392] to-[#c026d3] flex items-center justify-center text-white font-black select-none ${className}`}>
      {initial}
    </div>
  );
};
