/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TimeOfDayPeriod = "morning" | "afternoon" | "evening" | "overnight" | "allday";

export interface AppointmentTimeInfo {
  period: TimeOfDayPeriod;
  emoji: string;
  timeString: string;
  startFormatted: string;
  endFormatted?: string;
  isAllDay: boolean;
  bgHex: string;
  textHex: string;
  borderHex: string;
  badgeClasses: string;
  startHour: number;
}

/**
 * Formats a single Date object to Arabic 12-hour format with "ص" / "م" in Africa/Cairo timezone.
 * Example: "11:00 ص", "01:00 م"
 */
export function formatArabicTime(date: Date, timeZone = "Africa/Cairo"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value?.toUpperCase() || "";

  // Convert AM/PM to Arabic suffixes: AM -> ص, PM -> م
  const isAm = dayPeriod === "AM" || dayPeriod === "A.M." || dayPeriod.includes("A");
  const suffix = isAm ? "ص" : "م";

  return `${hour}:${minute} ${suffix}`;
}

/**
 * Classifies an appointment start time into time-of-day periods according to Cairo timezone:
 * - Morning (05:00–11:59): 🌅  (#DBEAFE / #1D4ED8)
 * - Afternoon (12:00–16:59): ☀️ (#FEF3C7 / #92400E)
 * - Evening (17:00–23:59): 🌙  (#EDE9FE / #6D28D9)
 * - Overnight (00:00–04:59): 🌙 (#EDE9FE / #6D28D9)
 *
 * All time strings are returned with Arabic suffixes (ص / م) and RTL reading order.
 */
export function getAppointmentTimeInfo(event: {
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
} | null | undefined): AppointmentTimeInfo {
  const defaultFallback: AppointmentTimeInfo = {
    period: "allday",
    emoji: "📅",
    timeString: "غير محدد",
    startFormatted: "غير محدد",
    isAllDay: true,
    bgHex: "#F1F5F9",
    textHex: "#475569",
    borderHex: "#E2E8F0",
    badgeClasses: "bg-slate-100 text-slate-700 border-slate-200",
    startHour: 12,
  };

  if (!event || !event.start) {
    return defaultFallback;
  }

  // Handle all-day events
  if (event.start.date && !event.start.dateTime) {
    return {
      period: "allday",
      emoji: "📅",
      timeString: "طوال اليوم",
      startFormatted: "طوال اليوم",
      isAllDay: true,
      bgHex: "#F1F5F9",
      textHex: "#475569",
      borderHex: "#E2E8F0",
      badgeClasses: "bg-slate-100 text-slate-700 border-slate-200",
      startHour: 12,
    };
  }

  const startIso = event.start.dateTime;
  const endIso = event.end?.dateTime;

  if (!startIso) {
    return {
      period: "allday",
      emoji: "📅",
      timeString: "طوال اليوم",
      startFormatted: "طوال اليوم",
      isAllDay: true,
      bgHex: "#F1F5F9",
      textHex: "#475569",
      borderHex: "#E2E8F0",
      badgeClasses: "bg-slate-100 text-slate-700 border-slate-200",
      startHour: 12,
    };
  }

  const startDate = new Date(startIso);
  const timeZone = "Africa/Cairo";

  // Extract start hour in Africa/Cairo timezone
  const hourParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(startDate);
  
  const hourPart = hourParts.find((p) => p.type === "hour");
  const startHour = hourPart ? parseInt(hourPart.value, 10) : startDate.getHours();

  // Classify based strictly on START TIME
  let period: TimeOfDayPeriod = "overnight";
  let emoji = "🌙";
  let bgHex = "#EDE9FE";
  let textHex = "#6D28D9";
  let borderHex = "#DDD6FE";
  let badgeClasses = "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]";

  if (startHour >= 5 && startHour < 12) {
    // Morning (05:00–11:59): 🌅 Light blue background (#DBEAFE), dark blue text (#1D4ED8)
    period = "morning";
    emoji = "🌅";
    bgHex = "#DBEAFE";
    textHex = "#1D4ED8";
    borderHex = "#BFDBFE";
    badgeClasses = "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]";
  } else if (startHour >= 12 && startHour < 17) {
    // Afternoon (12:00–16:59): ☀️ Light amber background (#FEF3C7), dark amber text (#92400E)
    period = "afternoon";
    emoji = "☀️";
    bgHex = "#FEF3C7";
    textHex = "#92400E";
    borderHex = "#FDE68A";
    badgeClasses = "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";
  } else if (startHour >= 17 && startHour <= 23) {
    // Evening (17:00–23:59): 🌙 Light violet background (#EDE9FE), dark violet text (#6D28D9)
    period = "evening";
    emoji = "🌙";
    bgHex = "#EDE9FE";
    textHex = "#6D28D9";
    borderHex = "#DDD6FE";
    badgeClasses = "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]";
  } else {
    // Overnight (00:00–04:59): 🌙 Light violet background (#EDE9FE), dark violet text (#6D28D9)
    period = "overnight";
    emoji = "🌙";
    bgHex = "#EDE9FE";
    textHex = "#6D28D9";
    borderHex = "#DDD6FE";
    badgeClasses = "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]";
  }

  // Format start & end in Arabic
  const startFormatted = formatArabicTime(startDate, timeZone);
  let endFormatted: string | undefined;
  // In RTL context: Start appears first on the right, end appears on the left
  let timeString = startFormatted;

  if (endIso) {
    const endDate = new Date(endIso);
    endFormatted = formatArabicTime(endDate, timeZone);
    // Unicode RTL mark (\u200F) ensures proper Arabic bidi presentation when printed as a plain string
    timeString = `\u200F${startFormatted} – ${endFormatted}\u200F`;
  }

  return {
    period,
    emoji,
    timeString,
    startFormatted,
    endFormatted,
    isAllDay: false,
    bgHex,
    textHex,
    borderHex,
    badgeClasses,
    startHour,
  };
}
