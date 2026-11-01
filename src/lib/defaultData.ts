/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format, addDays, startOfToday } from "date-fns";
import { CALENDARS } from "../constants.ts";

export interface CustomEvent {
  id: string;
  calendarId: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

export function getDefaultCustomEvents(): CustomEvent[] {
  const today = startOfToday();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const diffToSat = (dayOfWeek + 1) % 7;
  const saturday = addDays(today, -diffToSat);

  const initialDoctors = [
    { calId: CALENDARS[0].id, name: "د/ ماركو موسى", startH: "19:00", endH: "22:00", days: [0, 1, 2, 3, 4, 6] }, // Dental
    { calId: CALENDARS[0].id, name: "د/ أحمد صابر", startH: "09:30", endH: "12:00", days: [1, 3, 5] },
    { calId: CALENDARS[1].id, name: "د/ مينا صبحي", startH: "13:00", endH: "15:00", days: [0, 2, 4, 6] }, // Physio
    { calId: CALENDARS[2].id, name: "د/ احمد عبدالسلام", startH: "18:00", endH: "21:00", days: [0, 1, 2, 3, 4, 6] }, // Internal/Heart
    { calId: CALENDARS[3].id, name: "د/ سارة إبراهيم", startH: "17:00", endH: "19:00", days: [1, 4] }, // Nutrition
    { calId: CALENDARS[4].id, name: "د/ شريف نجيب", startH: "18:30", endH: "21:00", days: [0, 2, 5, 6] }, // Pediatrics
    { calId: CALENDARS[5].id, name: "د/ احمد محمد سلام", startH: "17:00", endH: "20:00", days: [0, 1, 3, 6] }, // ENT
    { calId: CALENDARS[6].id, name: "د/ عماد ميخائيل", startH: "18:00", endH: "20:30", days: [2, 4] }, // GI
    { calId: CALENDARS[7].id, name: "د/ مريم فايز", startH: "16:00", endH: "18:00", days: [1, 3, 6] }, // Speech
    { calId: CALENDARS[8].id, name: "د/ بيتر سمير", startH: "19:00", endH: "21:00", days: [0, 3, 5] }, // Surgery
    { calId: CALENDARS[9].id, name: "د/ أيه ممدوح", startH: "17:30", endH: "20:00", days: [0, 1, 2, 4, 6] }, // Dermatology
    { calId: CALENDARS[10].id, name: "د/ امين عزمي", startH: "18:00", endH: "20:30", days: [1, 2, 3, 5, 6] }, // Ophthalmology
    { calId: CALENDARS[11].id, name: "د/ سامح انطون", startH: "12:00", endH: "15:00", days: [0, 1, 2, 3, 4, 5, 6] }, // Sonar
    { calId: CALENDARS[12].id, name: "د/ نادين يوسف", startH: "18:00", endH: "21:00", days: [0, 1, 3, 4, 6] }, // Orthopedics
    { calId: CALENDARS[13].id, name: "د/ جرجس وائل", startH: "19:00", endH: "21:30", days: [2, 5] }, // Neurology
    { calId: CALENDARS[14].id, name: "د/ امير توفيق", startH: "17:00", endH: "19:30", days: [1, 4, 6] }, // Urology
    { calId: CALENDARS[15].id, name: "د/ هالة نصيف", startH: "18:00", endH: "21:00", days: [0, 1, 2, 3, 4, 6] }, // Gynecology
  ];

  const events: CustomEvent[] = [];

  initialDoctors.forEach((docInfo, idx) => {
    // Generate events for 2 weeks starting from Saturday
    for (let dayOffset = -7; dayOffset < 14; dayOffset++) {
      const targetDay = addDays(saturday, dayOffset);
      const targetDayOfWeek = targetDay.getDay();

      if (docInfo.days.includes(targetDayOfWeek)) {
        const dateStr = format(targetDay, "yyyy-MM-dd");
        events.push({
          id: `default_${docInfo.calId}_${dateStr}_${idx}`,
          calendarId: docInfo.calId,
          summary: `${docInfo.name} - 🟢 مواعيد عادية`,
          start: { dateTime: `${dateStr}T${docInfo.startH}:00` },
          end: { dateTime: `${dateStr}T${docInfo.endH}:00` },
        });
      }
    }
  });

  return events;
}
