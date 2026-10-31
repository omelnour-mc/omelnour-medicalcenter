/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Clock } from "lucide-react";
import { getAppointmentTimeInfo } from "../lib/timeUtils.ts";

interface AppointmentTimeBadgeProps {
  event: {
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  };
  className?: string;
  showClockIcon?: boolean;
  size?: "sm" | "md";
}

/**
 * Prominent colored badge for appointment times with time-of-day emoji:
 * - Morning (05:00–11:59): 🌅 Light blue background (#DBEAFE), dark blue text (#1D4ED8)
 * - Afternoon (12:00–16:59): ☀️ Light amber background (#FEF3C7), dark amber text (#92400E)
 * - Evening (17:00–23:59): 🌙 Light violet background (#EDE9FE), dark violet text (#6D28D9)
 * - Overnight (00:00–04:59): 🌙 Light violet background (#EDE9FE), dark violet text (#6D28D9)
 *
 * Rendered in correct Arabic RTL order: Start time on the RIGHT, End time on the LEFT.
 */
export default function AppointmentTimeBadge({
  event,
  className = "",
  showClockIcon = true,
  size = "md",
}: AppointmentTimeBadgeProps) {
  const info = getAppointmentTimeInfo(event);

  const paddingClasses = size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-[12px]";
  const iconSize = size === "sm" ? 10 : 12;

  return (
    <div
      dir="rtl"
      className={`inline-flex items-center gap-1.5 rounded-xl font-bold whitespace-nowrap shadow-xs border transition-colors select-none ${info.badgeClasses} ${paddingClasses} ${className}`}
      style={{
        backgroundColor: info.bgHex,
        color: info.textHex,
        borderColor: info.borderHex,
      }}
      title={`موعد ${info.period === "morning" ? "صباحي" : info.period === "afternoon" ? "بعد الظهر" : "مسائي"} (${info.timeString})`}
    >
      <span className="text-xs sm:text-sm leading-none shrink-0" aria-hidden="true">
        {info.emoji}
      </span>
      {showClockIcon && (
        <Clock size={iconSize} className="opacity-50 shrink-0" aria-hidden="true" />
      )}
      {info.isAllDay ? (
        <span className="font-black tracking-tight"><bdi>{info.timeString}</bdi></span>
      ) : (
        <span className="font-black tracking-tight inline-flex items-center gap-1" dir="rtl">
          <bdi>{info.startFormatted}</bdi>
          {info.endFormatted && (
            <>
              <span className="opacity-60 select-none" aria-hidden="true">–</span>
              <bdi>{info.endFormatted}</bdi>
            </>
          )}
        </span>
      )}
    </div>
  );
}
