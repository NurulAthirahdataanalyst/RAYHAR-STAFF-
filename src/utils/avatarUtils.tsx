import React from "react";

export interface AvatarOption {
  id: string;
  name: string;
  gender?: "female" | "male" | "neutral";
  render: (size?: number | string) => React.ReactNode;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // 1. Amina (Pink Hijab) - Proper, modest, beautiful tudung bawal/shawl
  {
    id: "hijab-pink",
    name: "Amina (Pink Hijab)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        {/* Background Circle */}
        <circle cx="50" cy="50" r="50" fill="#F43F5E" />
        {/* Modest Blouse / Shoulder base */}
        <path d="M16 98 C18 70, 82 70, 84 98 Z" fill="#475569" />
        <path d="M38 78 L62 78 L60 98 L40 98 Z" fill="#FFFFFF" />
        {/* Hijab Drape over Shoulders & Chest */}
        <path d="M22 96 C20 70, 32 60, 50 66 C68 60, 80 70, 78 96 Z" fill="#F472B6" />
        <path d="M28 96 C28 78, 40 70, 50 72 C60 70, 72 78, 72 96 Z" fill="#EC4899" opacity="0.6" />
        {/* Hijab Head Wrap (Sleek, graceful curve) */}
        <path d="M25 46 C24 22, 76 22, 75 46 C75 66, 64 74, 50 74 C36 74, 25 66, 25 46 Z" fill="#F472B6" />
        <path d="M27 45 C26 25, 74 25, 73 45 C73 64, 62 71, 50 71 C38 71, 27 64, 27 45 Z" fill="#FBCFE8" />
        {/* Neat Inner Cap (Anak Tudung) arched over forehead */}
        <path d="M36 34 C43 29, 57 29, 64 34 L64 41 C57 37, 43 37, 36 41 Z" fill="#FFFFFF" />
        {/* Face Oval */}
        <ellipse cx="50" cy="49" rx="14.5" ry="17.5" fill="#FBD5BD" />
        {/* Eyebrows */}
        <path d="M39 42 Q43 39.5 47 42" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M53 42 Q57 39.5 61 42" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        {/* Delicate Eyes & Lashes */}
        <ellipse cx="43" cy="46.5" rx="2.5" ry="3.2" fill="#1E293B" />
        <ellipse cx="57" cy="46.5" rx="2.5" ry="3.2" fill="#1E293B" />
        <circle cx="44.2" cy="45.5" r="1" fill="#FFFFFF" />
        <circle cx="58.2" cy="45.5" r="1" fill="#FFFFFF" />
        {/* Soft Cheeks */}
        <circle cx="40" cy="53" r="3.2" fill="#F43F5E" opacity="0.25" />
        <circle cx="60" cy="53" r="3.2" fill="#F43F5E" opacity="0.25" />
        {/* Nose & Sweet Smile */}
        <path d="M50 48 L50 51.5" stroke="#DDA17B" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M46 56.5 Q50 60 54 56.5" stroke="#BE185D" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* Hijab Drape Fold Line */}
        <path d="M42 66 Q50 74 62 67" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 2. Siti (Teal Hijab) - Modern corporate teal tudung
  {
    id: "hijab-teal",
    name: "Siti (Teal Hijab)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        {/* Background Circle */}
        <circle cx="50" cy="50" r="50" fill="#0F766E" />
        {/* Corporate Navy Collar */}
        <path d="M16 98 C18 70, 82 70, 84 98 Z" fill="#1E293B" />
        <path d="M36 78 L64 78 L60 98 L40 98 Z" fill="#F8FAFC" />
        {/* Hijab Shoulders & Chest Drape */}
        <path d="M22 96 C20 70, 32 60, 50 66 C68 60, 80 70, 78 96 Z" fill="#0D9488" />
        <path d="M28 96 C28 78, 40 70, 50 72 C60 70, 72 78, 72 96 Z" fill="#115E59" opacity="0.5" />
        {/* Hijab Head Wrap */}
        <path d="M25 46 C24 22, 76 22, 75 46 C75 66, 64 74, 50 74 C36 74, 25 66, 25 46 Z" fill="#0D9488" />
        <path d="M27 45 C26 25, 74 25, 73 45 C73 64, 62 71, 50 71 C38 71, 27 64, 27 45 Z" fill="#2DD4BF" />
        {/* Crisp White Inner Cap */}
        <path d="M36 34 C43 29, 57 29, 64 34 L64 41 C57 37, 43 37, 36 41 Z" fill="#FFFFFF" />
        {/* Face Oval */}
        <ellipse cx="50" cy="49" rx="14.5" ry="17.5" fill="#FBD5BD" />
        {/* Eyebrows */}
        <path d="M39 42 Q43 39.5 47 42" stroke="#334155" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M53 42 Q57 39.5 61 42" stroke="#334155" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <ellipse cx="43" cy="46.5" rx="2.5" ry="3.2" fill="#0F172A" />
        <ellipse cx="57" cy="46.5" rx="2.5" ry="3.2" fill="#0F172A" />
        <circle cx="44.2" cy="45.5" r="1" fill="#FFFFFF" />
        <circle cx="58.2" cy="45.5" r="1" fill="#FFFFFF" />
        {/* Cheeks */}
        <circle cx="40" cy="53" r="3.2" fill="#F43F5E" opacity="0.25" />
        <circle cx="60" cy="53" r="3.2" fill="#F43F5E" opacity="0.25" />
        {/* Nose & Smile */}
        <path d="M50 48 L50 51.5" stroke="#DDA17B" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M46 56.5 Q50 60 54 56.5" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* Fold Accent */}
        <path d="M42 66 Q50 74 62 67" stroke="#115E59" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 3. Noah (Glasses & Brown Hair) - Exactly as in Screenshot 1
  {
    id: "glasses-boy",
    name: "Noah (Glasses & Brown Hair)",
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

  // 4. Malik (Cool Sunglasses)
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

  // 5. Tariq (Green Cap & Glasses)
  {
    id: "man-green-cap",
    name: "Tariq (Green Cap & Glasses)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#10B981" />
        <path d="M22 96 C24 70, 76 70, 78 96 Z" fill="#0F766E" />
        <rect x="44" y="60" width="12" height="14" fill="#F8C4A5" />
        <ellipse cx="50" cy="48" rx="20" ry="21" fill="#FBD5BD" />
        {/* Green Cap */}
        <path d="M28 40 C28 22, 72 22, 72 40 Z" fill="#047857" />
        <ellipse cx="50" cy="38" rx="26" ry="6" fill="#065F46" />
        {/* Glasses */}
        <circle cx="40" cy="48" r="8" fill="none" stroke="#0F172A" strokeWidth="2.5" />
        <circle cx="60" cy="48" r="8" fill="none" stroke="#0F172A" strokeWidth="2.5" />
        <line x1="48" y1="48" x2="52" y2="48" stroke="#0F172A" strokeWidth="2.5" />
        <circle cx="40" cy="48" r="2.5" fill="#0F172A" />
        <circle cx="60" cy="48" r="2.5" fill="#0F172A" />
        <path d="M45 60 Q50 64 55 60" stroke="#A35232" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 6. Sarah (Short Bob) - Matching uploaded Screenshot 2 (media_1789461177900.png)
  {
    id: "woman-short-bob",
    name: "Sarah (Short Bob)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        {/* Coral Red Circle */}
        <circle cx="50" cy="50" r="50" fill="#F43F5E" />
        {/* Hair Back */}
        <path d="M30 46 C26 26, 74 26, 70 46 C68 68, 74 72, 76 76 L24 76 C26 72, 32 68, 30 46 Z" fill="#1E293B" />
        {/* Mustard Yellow Blouse */}
        <path d="M20 96 C22 68, 78 68, 80 96 Z" fill="#EAB308" />
        {/* White Inner Collar */}
        <path d="M36 62 L50 82 L64 62 L58 58 L50 68 L42 58 Z" fill="#FFFFFF" />
        {/* Neck */}
        <path d="M43 54 L43 66 L50 72 L57 66 L57 54 Z" fill="#FBD5BD" />
        {/* Face Oval (Minimalist aesthetic) */}
        <ellipse cx="50" cy="45" rx="17" ry="19" fill="#FBD5BD" />
        {/* Sleek Bob Hair Framing */}
        <path d="M32 40 C32 22, 68 22, 68 40 C68 46, 66 52, 64 55 C62 44, 58 35, 50 35 C42 35, 38 44, 36 55 C34 52, 32 46, 32 40 Z" fill="#1E293B" />
        {/* Side bangs */}
        <path d="M33 36 C42 28, 56 32, 67 44 C62 38, 52 32, 42 36 Z" fill="#0F172A" />
      </svg>
    ),
  },

  // 7. Diana (Long Wavy Hair) - Matching uploaded Screenshot 4 (media_1789461268307.png)
  {
    id: "woman-long-hair",
    name: "Diana (Long Wavy Hair)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        {/* Royal Blue Circle */}
        <circle cx="50" cy="50" r="50" fill="#3B82F6" />
        {/* Long Wavy Hair Back */}
        <path d="M28 42 C24 22, 76 22, 72 42 C70 54, 78 62, 74 72 C71 80, 74 88, 72 96 L28 96 C26 88, 29 80, 26 72 C22 62, 30 54, 28 42 Z" fill="#1E293B" />
        {/* Coral Red Blouse */}
        <path d="M20 96 C22 68, 78 68, 80 96 Z" fill="#EF4444" />
        {/* White Scoop Neckline Trim */}
        <path d="M34 68 C38 78, 62 78, 66 68 L68 72 C64 84, 36 84, 32 72 Z" fill="#FFFFFF" />
        {/* Neck */}
        <path d="M43 52 L43 68 L50 74 L57 68 L57 52 Z" fill="#FBD5BD" />
        {/* Face Oval */}
        <ellipse cx="50" cy="44" rx="16.5" ry="18.5" fill="#FBD5BD" />
        {/* Front Wavy Hair Strands & Bangs */}
        <path d="M31 38 C31 22, 69 22, 69 38 C67 48, 72 58, 68 66 C66 58, 64 50, 62 44 C56 36, 44 36, 38 44 C36 50, 34 58, 32 66 C28 58, 33 48, 31 38 Z" fill="#1E293B" />
        <path d="M33 34 C44 26, 56 32, 66 40 C60 34, 48 29, 38 34 Z" fill="#0F172A" />
      </svg>
    ),
  },

  // 8. Rayyan (Blue Glasses) - Matching uploaded Screenshot 3 (media_1789461197081.png)
  {
    id: "smart-glasses",
    name: "Rayyan (Blue Glasses)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        {/* Sky Blue Circle */}
        <circle cx="50" cy="50" r="50" fill="#0EA5E9" />
        {/* Dark Hoodie Jacket */}
        <path d="M18 96 C20 68, 80 68, 82 96 Z" fill="#1E293B" />
        <path d="M38 70 L62 70 L58 96 L42 96 Z" fill="#BAE6FD" />
        {/* Neck */}
        <rect x="43" y="52" width="14" height="18" fill="#F8C4A5" />
        {/* Head */}
        <ellipse cx="50" cy="44" rx="19" ry="21" fill="#FBD5BD" />
        {/* Messy textured hair */}
        <path d="M28 36 C27 18, 73 18, 72 36 C74 24, 66 18, 54 18 C46 16, 34 20, 28 36 Z" fill="#0F172A" />
        <path d="M32 28 Q44 20 54 28 Q64 20 68 28 Z" fill="#1E293B" />
        {/* Blue Frame Glasses */}
        <rect x="33" y="40" width="14" height="11" rx="3" fill="none" stroke="#2563EB" strokeWidth="2.5" />
        <rect x="53" y="40" width="14" height="11" rx="3" fill="none" stroke="#2563EB" strokeWidth="2.5" />
        <line x1="47" y1="45" x2="53" y2="45" stroke="#2563EB" strokeWidth="2.5" />
        {/* Eyes behind glasses */}
        <circle cx="40" cy="45.5" r="2.2" fill="#0F172A" />
        <circle cx="60" cy="45.5" r="2.2" fill="#0F172A" />
        {/* Smile */}
        <path d="M46 56 Q50 59 54 56" stroke="#A35232" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 9. Maya (Curly Hair with Red Lips)
  {
    id: "woman-curly-black",
    name: "Maya (Curly Hair with Red Lips)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#7C3AED" />
        {/* Curly hair volume back */}
        <circle cx="32" cy="38" r="16" fill="#18181B" />
        <circle cx="68" cy="38" r="16" fill="#18181B" />
        <circle cx="50" cy="28" r="18" fill="#18181B" />
        {/* Clothes */}
        <path d="M20 96 C22 70, 78 70, 80 96 Z" fill="#F43F5E" />
        <rect x="44" y="58" width="12" height="14" fill="#C28867" />
        {/* Face */}
        <ellipse cx="50" cy="48" rx="18" ry="19" fill="#DDA17B" />
        {/* Gold Earrings */}
        <circle cx="30" cy="50" r="3" fill="none" stroke="#FBBF24" strokeWidth="1.5" />
        <circle cx="70" cy="50" r="3" fill="none" stroke="#FBBF24" strokeWidth="1.5" />
        {/* Eyes */}
        <ellipse cx="43" cy="46" rx="2.5" ry="3" fill="#18181B" />
        <ellipse cx="57" cy="46" rx="2.5" ry="3" fill="#18181B" />
        {/* Red Lips */}
        <path d="M44 58 Q50 63 56 58" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 10. Haji Ahmad (Senior Staff)
  {
    id: "man-elder",
    name: "Haji Ahmad (Senior Staff)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#1E3A8A" />
        {/* Baju Melayu / Corporate Collar */}
        <path d="M18 96 C20 70, 80 70, 82 96 Z" fill="#0F172A" />
        <path d="M42 74 L58 74 L56 96 L44 96 Z" fill="#E2E8F0" />
        {/* Head */}
        <rect x="44" y="58" width="12" height="14" fill="#F8C4A5" />
        <ellipse cx="50" cy="48" rx="19" ry="20" fill="#FBD5BD" />
        {/* Songkok with Gold Trim */}
        <path d="M30 38 L32 20 L68 20 L70 38 Z" fill="#0F172A" />
        <line x1="30" y1="36" x2="70" y2="36" stroke="#F59E0B" strokeWidth="2" />
        {/* Silver side hair */}
        <path d="M28 42 C28 48, 31 52, 32 54" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M72 42 C72 48, 69 52, 68 54" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Dignified Glasses */}
        <rect x="36" y="44" width="11" height="9" rx="2" fill="none" stroke="#64748B" strokeWidth="2" />
        <rect x="53" y="44" width="11" height="9" rx="2" fill="none" stroke="#64748B" strokeWidth="2" />
        <line x1="47" y1="48" x2="53" y2="48" stroke="#64748B" strokeWidth="2" />
        <circle cx="41.5" cy="48.5" r="1.8" fill="#1E293B" />
        <circle cx="58.5" cy="48.5" r="1.8" fill="#1E293B" />
        {/* Dignified Silver Mustache */}
        <path d="M43 56 Q50 54 57 56" stroke="#94A3B8" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 11. Hajjah Maryam (Senior Executive)
  {
    id: "woman-elder",
    name: "Hajjah Maryam (Senior Executive)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#6D28D9" />
        {/* Executive Blazer */}
        <path d="M16 98 C18 70, 82 70, 84 98 Z" fill="#312E81" />
        {/* Ivory Hijab Drape */}
        <path d="M22 96 C20 70, 32 60, 50 66 C68 60, 80 70, 78 96 Z" fill="#EDE9FE" />
        <path d="M25 46 C24 22, 76 22, 75 46 C75 66, 64 74, 50 74 C36 74, 25 66, 25 46 Z" fill="#DDD6FE" />
        <path d="M36 34 C43 29, 57 29, 64 34 L64 41 C57 37, 43 37, 36 41 Z" fill="#FFFFFF" />
        {/* Face */}
        <ellipse cx="50" cy="49" rx="14.5" ry="17.5" fill="#FBD5BD" />
        {/* Senior Executive Gold Wire Glasses */}
        <circle cx="42" cy="47" r="5" fill="none" stroke="#D97706" strokeWidth="1.8" />
        <circle cx="58" cy="47" r="5" fill="none" stroke="#D97706" strokeWidth="1.8" />
        <line x1="47" y1="47" x2="53" y2="47" stroke="#D97706" strokeWidth="1.8" />
        <circle cx="42" cy="47" r="1.8" fill="#1E293B" />
        <circle cx="58" cy="47" r="1.8" fill="#1E293B" />
        {/* Dignified Smile */}
        <path d="M46 57 Q50 60 54 57" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 12. Zul (Neat Beard)
  {
    id: "man-beard-clean",
    name: "Zul (Neat Beard)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#475569" />
        <path d="M20 96 C22 68, 78 68, 80 96 Z" fill="#0F172A" />
        <rect x="44" y="58" width="12" height="14" fill="#E29A78" />
        <ellipse cx="50" cy="47" rx="19" ry="20" fill="#F8C4A5" />
        {/* Modern haircut */}
        <path d="M29 36 C28 18, 72 18, 71 36 C66 22, 34 22, 29 36 Z" fill="#18181B" />
        {/* Eyes */}
        <circle cx="42" cy="45" r="2.5" fill="#18181B" />
        <circle cx="58" cy="45" r="2.5" fill="#18181B" />
        {/* Well Groomed Neat Beard */}
        <path d="M38 52 C38 66, 62 66, 62 52 C64 58, 62 68, 50 71 C38 68, 36 58, 38 52 Z" fill="#18181B" />
        <path d="M44 54 Q50 56 56 54" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 13. Kofi (Yellow Glasses)
  {
    id: "dark-yellow-glasses",
    name: "Kofi (Yellow Glasses)",
    gender: "male",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#15803D" />
        <path d="M20 96 C22 68, 78 68, 80 96 Z" fill="#3B82F6" />
        <rect x="44" y="60" width="12" height="14" fill="#78350F" />
        <ellipse cx="50" cy="47" rx="20" ry="21" fill="#92400E" />
        {/* Short afro crop hair */}
        <path d="M30 38 C29 20, 71 20, 70 38 Z" fill="#171717" />
        {/* Bright Yellow Glasses */}
        <circle cx="40" cy="47" r="8" fill="none" stroke="#FACC15" strokeWidth="2.5" />
        <circle cx="60" cy="47" r="8" fill="none" stroke="#FACC15" strokeWidth="2.5" />
        <line x1="48" y1="47" x2="52" y2="47" stroke="#FACC15" strokeWidth="2.5" />
        <circle cx="40" cy="47" r="2.5" fill="#171717" />
        <circle cx="60" cy="47" r="2.5" fill="#171717" />
        {/* Smile */}
        <path d="M44 60 Q50 65 56 60" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 14. Aisyah (Hair Bun & Glasses)
  {
    id: "woman-ponytail",
    name: "Aisyah (Hair Bun & Glasses)",
    gender: "female",
    render: (size = "100%") => (
      <svg viewBox="0 0 100 100" width={size} height={size} className="w-full h-full block">
        <circle cx="50" cy="50" r="50" fill="#EC4899" />
        {/* High Top Bun */}
        <circle cx="50" cy="18" r="10" fill="#18181B" />
        {/* Clothes */}
        <path d="M20 96 C22 70, 78 70, 80 96 Z" fill="#0284C7" />
        <rect x="44" y="58" width="12" height="14" fill="#F8C4A5" />
        {/* Face */}
        <ellipse cx="50" cy="46" rx="18" ry="19" fill="#FBD5BD" />
        {/* Hair shape */}
        <path d="M30 38 C30 22, 70 22, 70 38 Z" fill="#18181B" />
        {/* Glasses */}
        <circle cx="41" cy="45" r="7.5" fill="none" stroke="#0F172A" strokeWidth="2" />
        <circle cx="59" cy="45" r="7.5" fill="none" stroke="#0F172A" strokeWidth="2" />
        <line x1="48.5" y1="45" x2="51.5" y2="45" stroke="#0F172A" strokeWidth="2" />
        <circle cx="41" cy="45" r="2" fill="#0F172A" />
        <circle cx="59" cy="45" r="2" fill="#0F172A" />
        <path d="M46 56 Q50 59 54 56" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 15. Default Initial Badge
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
