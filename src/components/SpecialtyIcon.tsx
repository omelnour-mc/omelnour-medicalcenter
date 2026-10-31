/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Stethoscope } from "lucide-react";
import { CALENDARS } from "../constants.ts";

interface SpecialtyIconProps {
  specialty: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBackground?: boolean;
  backgroundColor?: string;
}

// Map specialty name keywords to specific emojis
const SPECIALTY_EMOJI_MAP: Record<string, string> = {
  "أسنان": "🦷",
  "اسنان": "🦷",
  "علاج طبيعي": "🦵",
  "طبيعي": "🦵",
  "باطن": "🩺",
  "قلب": "🩺",
  "تغذية": "🍏",
  "اطفال": "👶",
  "أطفال": "👶",
  "أنف": "👂",
  "انف": "👂",
  "أذن": "👂",
  "حنجرة": "👂",
  "هضمى": "🩺",
  "هضمي": "🩺",
  "كبد": "🩺",
  "تخاطب": "🔊",
  "جراحة": "🔪",
  "جلدية": "💅",
  "رمد": "👁️",
  "عيون": "👁️",
  "سونار": "📺",
  "أشعة": "📺",
  "اشعة": "📺",
  "عظام": "🦴",
  "مخ": "🧠",
  "اعصاب": "🧠",
  "أعصاب": "🧠",
  "مسالك": "⚕️",
  "نساء": "🤰",
  "توليد": "🤰",
};

export function getSpecialtyEmoji(specialty: string): string | null {
  if (!specialty) return null;

  // 1. Try to extract emoji directly if present in string
  const directEmoji = specialty.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0];
  if (directEmoji) return directEmoji;

  // 2. Check in CALENDARS list
  const foundInCal = CALENDARS.find(c => 
    c.name.includes(specialty) || specialty.includes(c.name.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, "").trim())
  );
  if (foundInCal) {
    const calEmoji = foundInCal.name.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0];
    if (calEmoji) return calEmoji;
  }

  // 3. Keyword search
  const cleanSpec = specialty.toLowerCase();
  for (const [kw, emoji] of Object.entries(SPECIALTY_EMOJI_MAP)) {
    if (cleanSpec.includes(kw)) {
      return emoji;
    }
  }

  return null;
}

export function getCleanSpecialtyName(specialty: string): string {
  if (!specialty) return "";
  return specialty.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, "").trim();
}

export default function SpecialtyIcon({
  specialty,
  size = "md",
  className = "",
  showBackground = false,
  backgroundColor,
}: SpecialtyIconProps) {
  const emoji = getSpecialtyEmoji(specialty);

  const sizeClasses = {
    sm: "w-7 h-7 text-sm",
    md: "w-9 h-9 text-base sm:text-lg",
    lg: "w-11 h-11 text-xl sm:text-2xl",
    xl: "w-14 h-14 text-2xl sm:text-3xl",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
    xl: 28,
  };

  if (!showBackground) {
    if (emoji) {
      return (
        <span 
          className={`inline-flex items-center justify-center leading-none select-none ${className}`}
          aria-hidden="true"
        >
          {emoji}
        </span>
      );
    }
    return <Stethoscope size={iconSizes[size]} className={`text-brand-blue ${className}`} />;
  }

  const calInfo = CALENDARS.find(c => 
    c.name.includes(specialty) || specialty.includes(getCleanSpecialtyName(c.name))
  );
  const bgColor = backgroundColor || (calInfo?.color ? `${calInfo.color}` : "#DBEAFE");

  return (
    <div
      className={`rounded-xl flex items-center justify-center shrink-0 border border-slate-200/60 shadow-2xs ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
      title={getCleanSpecialtyName(specialty)}
      aria-label={getCleanSpecialtyName(specialty)}
    >
      {emoji ? (
        <span className="leading-none select-none">{emoji}</span>
      ) : (
        <Stethoscope size={iconSizes[size]} className="text-brand-blue" />
      )}
    </div>
  );
}

// Guaranteed high-contrast dark vibrant colors for light mode
export const SPECIALTY_DARK_COLORS: Record<string, string> = {
  "عظام": "#1e3a8a", // Dark Indigo
  "تغذية": "#15803d", // Dark Forest Green
  "علاج طبيعي": "#0369a1", // Dark Ocean Blue
  "نساء وتوليد": "#be123c", // Dark Ruby Crimson
  "سونار": "#0f766e", // Dark Teal
  "مخ واعصاب": "#6b21a8", // Dark Purple
  "مخ وأعصاب": "#6b21a8",
  "جراحة عامة": "#b91c1c", // Dark Red
  "اطفال": "#0284c7", // Dark Sky Blue
  "أطفال": "#0284c7",
  "جلدية": "#a21caf", // Dark Fuchsia
  "رمد": "#047857", // Dark Emerald Green
  "انف واذن": "#b45309", // Dark Bronze/Amber
  "أنف وأذن وحنجرة": "#b45309",
  "باطن": "#881337", // Dark Maroon
  "باطن وقلب": "#881337",
  "قلب واوعية دموية": "#881337",
  "اسنان": "#0284c7",
  "أسنان": "#0284c7",
};

export function getVibrantSpecialtyColor(specialtyName: string, hexColor?: string): string {
  const cleanName = (specialtyName || "").toLowerCase().trim();
  
  for (const [key, darkHex] of Object.entries(SPECIALTY_DARK_COLORS)) {
    if (cleanName.includes(key.toLowerCase())) {
      return darkHex;
    }
  }

  if (hexColor) {
    let c = hexColor.replace("#", "");
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    if (c.length === 6) {
      let r = parseInt(c.substring(0, 2), 16);
      let g = parseInt(c.substring(2, 4), 16);
      let b = parseInt(c.substring(4, 6), 16);

      r = Math.floor(r * 0.45);
      g = Math.floor(g * 0.45);
      b = Math.floor(b * 0.45);

      const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
  }

  return "#0353a8";
}

export function getSpecialtyHeaderBg(specialtyName: string, hexColor?: string): string {
  const darkHex = getVibrantSpecialtyColor(specialtyName, hexColor);
  if (darkHex && darkHex.startsWith("#") && darkHex.length === 7) {
    return `${darkHex}33`; // ~20% opacity tint of rich dark specialty color
  }
  return "#e0e7ff";
}

