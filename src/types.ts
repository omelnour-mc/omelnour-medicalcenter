/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CalendarInfo {
  id: string;
  name: string;
  color: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export interface CalendarResponse {
  calendarId: string;
  events: GoogleCalendarEvent[];
  error?: string;
}

export interface AppSettings {
  globalFontSize: number;
  showDatesRow: boolean;
  showDayNamesRow: boolean;
  showDayAndDate: boolean;
  headlineFontSize: number;
  headlineWidth: number;
}
