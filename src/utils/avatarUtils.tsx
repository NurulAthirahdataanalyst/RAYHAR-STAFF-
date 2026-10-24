import React from "react";
import { sanitizeUrl } from "@/utils/security";

export interface AvatarOption {
  id: string;
  name: string;
  gender?: "female" | "male" | "neutral";
  imageSrc?: string;
  render: (size?: number | string) => React.ReactNode;
}

// Helper to render an avatar image with proper sizing and accessibility
const createAvatarRenderer = (src: string, alt: string) => {
  const safeSrc = sanitizeUrl(src);
  return (size: number | string = "100%") => (
    <img
      src={safeSrc}
      alt={alt}
      className="w-full h-full object-cover rounded-full block select-none pointer-events-none"
      style={{ width: typeof size === "number" ? `${size}px` : size, height: typeof size === "number" ? `${size}px` : size }}
      loading="lazy"
      draggable={false}
    />
  );
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  // ==========================================
  // WOMEN / HIJAB AVATARS (from user pack)
  // ==========================================
  {
    id: "hijab-white",
    name: "Amina (White Hijab & Red)",
    gender: "female",
    imageSrc: "/avatars/hijab-white.png",
    render: createAvatarRenderer("/avatars/hijab-white.png", "White Hijab & Red Dress"),
  },
  {
    id: "hijab-blue",
    name: "Siti (Blue Hijab & Glasses)",
    gender: "female",
    imageSrc: "/avatars/hijab-blue.png",
    render: createAvatarRenderer("/avatars/hijab-blue.png", "Blue Hijab with Glasses"),
  },
  {
    id: "doctor-female",
    name: "Dr. Sarah (Medical Specialist)",
    gender: "female",
    imageSrc: "/avatars/doctor-female.png",
    render: createAvatarRenderer("/avatars/doctor-female.png", "Female Doctor"),
  },
  {
    id: "glasses-female-dark",
    name: "Maya (Dark Hair & Glasses)",
    gender: "female",
    imageSrc: "/avatars/glasses-female-dark.png",
    render: createAvatarRenderer("/avatars/glasses-female-dark.png", "Professional with Glasses"),
  },
  {
    id: "casual-female-dark",
    name: "Aisha (Curly Hair in Orange)",
    gender: "female",
    imageSrc: "/avatars/casual-female-dark.png",
    render: createAvatarRenderer("/avatars/casual-female-dark.png", "Curly Hair in Orange"),
  },
  {
    id: "striped-ginger-female",
    name: "Chloe (Striped Shirt Chic)",
    gender: "female",
    imageSrc: "/avatars/striped-ginger-female.png",
    render: createAvatarRenderer("/avatars/striped-ginger-female.png", "Striped Shirt Chic"),
  },
  {
    id: "glasses-bob-female",
    name: "Nadia (Bob Hair & Round Glasses)",
    gender: "female",
    imageSrc: "/avatars/glasses-bob-female.png",
    render: createAvatarRenderer("/avatars/glasses-bob-female.png", "Bob Cut with Round Glasses"),
  },
  {
    id: "bangs-bob-female",
    name: "Hannah (Classic Bob with Bangs)",
    gender: "female",
    imageSrc: "/avatars/bangs-bob-female.png",
    render: createAvatarRenderer("/avatars/bangs-bob-female.png", "Classic Bob with Bangs"),
  },
  {
    id: "topknot-bun-female",
    name: "Zara (Topknot Bun)",
    gender: "female",
    imageSrc: "/avatars/topknot-bun-female.png",
    render: createAvatarRenderer("/avatars/topknot-bun-female.png", "Topknot Bun"),
  },
  {
    id: "wavy-orange-female",
    name: "Elena (Wavy Hair in Orange)",
    gender: "female",
    imageSrc: "/avatars/wavy-orange-female.png",
    render: createAvatarRenderer("/avatars/wavy-orange-female.png", "Wavy Hair in Orange"),
  },

  // ==========================================
  // MEN AVATARS (from user pack)
  // ==========================================
  {
    id: "songkok-white",
    name: "Ahmad (Songkok / Kopiah Putih)",
    gender: "male",
    imageSrc: "/avatars/songkok-white.png",
    render: createAvatarRenderer("/avatars/songkok-white.png", "White Songkok"),
  },
  {
    id: "suit-beard-male",
    name: "Farhan (Executive Suit & Beard)",
    gender: "male",
    imageSrc: "/avatars/suit-beard-male.png",
    render: createAvatarRenderer("/avatars/suit-beard-male.png", "Executive Suit & Beard"),
  },
  {
    id: "beret-officer-male",
    name: "Hakim (Officer in Red Beret)",
    gender: "male",
    imageSrc: "/avatars/beret-officer-male.png",
    render: createAvatarRenderer("/avatars/beret-officer-male.png", "Officer in Red Beret"),
  },
  {
    id: "elder-glasses-male",
    name: "Pak Osman (Distinguished Senior)",
    gender: "male",
    imageSrc: "/avatars/elder-glasses-male.png",
    render: createAvatarRenderer("/avatars/elder-glasses-male.png", "Distinguished Senior"),
  },
  {
    id: "apron-male",
    name: "Zul (Friendly Staff in Apron)",
    gender: "male",
    imageSrc: "/avatars/apron-male.png",
    render: createAvatarRenderer("/avatars/apron-male.png", "Friendly Staff in Apron"),
  },
  {
    id: "smiling-tan-male",
    name: "Rayyan (Clean & Confident)",
    gender: "male",
    imageSrc: "/avatars/smiling-tan-male.png",
    render: createAvatarRenderer("/avatars/smiling-tan-male.png", "Clean & Confident"),
  },
  {
    id: "casual-pink-male",
    name: "Adam (Modern Casual in Pink)",
    gender: "male",
    imageSrc: "/avatars/casual-pink-male.png",
    render: createAvatarRenderer("/avatars/casual-pink-male.png", "Modern Casual in Pink"),
  },
  {
    id: "bald-beard-male",
    name: "Tariq (Bald & Trimmed Beard)",
    gender: "male",
    imageSrc: "/avatars/bald-beard-male.png",
    render: createAvatarRenderer("/avatars/bald-beard-male.png", "Bald & Trimmed Beard"),
  },
  {
    id: "curly-blue-male",
    name: "Imran (Curly Hair in Blue)",
    gender: "male",
    imageSrc: "/avatars/curly-blue-male.png",
    render: createAvatarRenderer("/avatars/curly-blue-male.png", "Curly Hair in Blue"),
  },
  {
    id: "turtleneck-glasses-male",
    name: "Danial (Specs & Maroon Turtleneck)",
    gender: "male",
    imageSrc: "/avatars/turtleneck-glasses-male.png",
    render: createAvatarRenderer("/avatars/turtleneck-glasses-male.png", "Specs & Maroon Turtleneck"),
  },

  // ==========================================
  // INITIALS / DEFAULT
  // ==========================================
  {
    id: "initials",
    name: "Letter Initial (Default)",
    gender: "neutral",
    render: () => (
      <div className="w-full h-full rounded-full bg-gradient-to-br from-[#942392] to-[#c026d3] flex items-center justify-center text-white font-black text-xl shadow-inner select-none">
        ★
      </div>
    ),
  },
];

// Backward-compatible mapping for users who previously selected legacy SVG avatars
const LEGACY_AVATAR_MAP: Record<string, string> = {
  "hijab-pink": "hijab-white",
  "hijab-teal": "hijab-blue",
  "hijab-purple": "hijab-blue",
  "glasses-boy": "turtleneck-glasses-male",
  "sunglasses-cool": "smiling-tan-male",
  "bun-green": "topknot-bun-female",
  "songkok-traditional": "songkok-white",
  "curls-orange": "casual-female-dark",
  "beret-artist": "beret-officer-male",
  "suit-executive": "suit-beard-male",
  "doctor-scrubs": "doctor-female",
  "casual-cap": "apron-male",
  "bob-cut": "glasses-bob-female",
  "senior-gentleman": "elder-glasses-male",
};

const STORAGE_KEY = "rayhar_selected_avatar";

// Clean up any stale global avatar choice that was polluting all users
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function getSavedAvatar(userId?: string, email?: string): string {
  try {
    const cleanId = (userId || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    // Check by user ID first (e.g. "E017", "E004", "E018")
    if (cleanId) {
      const userSpecific = localStorage.getItem(`${STORAGE_KEY}_${cleanId}`);
      if (userSpecific) {
        return LEGACY_AVATAR_MAP[userSpecific] || userSpecific;
      }
    }

    // Check by email as secondary key (e.g. "mdkhan@gmail.com")
    if (cleanEmail) {
      const emailSpecific = localStorage.getItem(`${STORAGE_KEY}_${cleanEmail}`);
      if (emailSpecific) {
        return LEGACY_AVATAR_MAP[emailSpecific] || emailSpecific;
      }
    }
  } catch (e) {
    console.error("Failed to get saved avatar", e);
  }
  // Default to initials so other users NEVER inherit another user's avatar
  return "initials";
}

export function saveSelectedAvatar(avatarId: string, userId?: string, email?: string): void {
  try {
    const cleanId = (userId || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (cleanId) {
      localStorage.setItem(`${STORAGE_KEY}_${cleanId}`, avatarId);
    }
    if (cleanEmail && cleanEmail !== cleanId) {
      localStorage.setItem(`${STORAGE_KEY}_${cleanEmail}`, avatarId);
    }

    // Always remove global legacy key to prevent leaking to other users
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    window.dispatchEvent(new CustomEvent("avatarChanged", { 
      detail: { avatarId, userId: cleanId, email: cleanEmail } 
    }));
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

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarId,
  name = "U",
  className = "w-full h-full",
  size = "100%",
}) => {
  const initial = (name || "U").trim()[0]?.toUpperCase() || "U";
  
  if (!avatarId || avatarId === "initials") {
    return (
      <div className={`w-full h-full rounded-full bg-gradient-to-br from-[#942392] to-[#c026d3] flex items-center justify-center text-white font-black select-none ${className}`}>
        {initial}
      </div>
    );
  }

  const resolvedId = LEGACY_AVATAR_MAP[avatarId] || avatarId;
  const found = AVATAR_OPTIONS.find((a) => a.id === resolvedId);

  if (found && found.id !== "initials") {
    return (
      <div className={`w-full h-full flex items-center justify-center overflow-hidden rounded-full ${className}`}>
        {found.render(size)}
      </div>
    );
  }

  // Fallback: Check if avatarId directly matches a png asset in public/avatars/
  if (resolvedId && resolvedId !== "initials" && /^[a-zA-Z0-9_-]+$/.test(resolvedId)) {
    const safeAvatarSrc = sanitizeUrl(`/avatars/${encodeURIComponent(resolvedId)}.png`);
    return (
      <div className={`w-full h-full flex items-center justify-center overflow-hidden rounded-full ${className}`}>
        <img
          src={safeAvatarSrc}
          alt={name}
          className="w-full h-full object-cover rounded-full block select-none pointer-events-none"
          style={{ width: typeof size === "number" ? `${size}px` : size, height: typeof size === "number" ? `${size}px` : size }}
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = "none";
            if (img.parentElement) {
              const fallbackSpan = document.createElement("span");
              fallbackSpan.className =
                "w-full h-full rounded-full bg-gradient-to-br from-[#942392] to-[#c026d3] flex items-center justify-center text-white font-black select-none";
              fallbackSpan.textContent = initial;
              img.parentElement.replaceChildren(fallbackSpan);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={`w-full h-full rounded-full bg-gradient-to-br from-[#942392] to-[#c026d3] flex items-center justify-center text-white font-black select-none ${className}`}>
      {initial}
    </div>
  );
};
