/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { format, eachDayOfInterval, parseISO, isSameDay, startOfToday, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, User, Clock, Calendar as CalendarIcon, X, ChevronRight, ChevronLeft, Phone, Shield, Save, Loader2, AlertCircle, Stethoscope, Download, Share2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarResponse, AppSettings } from "../types.ts";
import { CALENDARS, CONTACT_PHONE } from "../constants.ts";
import axios from "axios";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase.ts";
import { stripStatusEmojis, normalizeArabicQuery } from "../lib/utils.ts";
import { FilterState } from "./FilterSidebar.tsx";
import AppointmentTimeBadge from "./AppointmentTimeBadge.tsx";
import { getAppointmentTimeInfo } from "../lib/timeUtils.ts";
import CompactDoctorScheduleModal from "./CompactDoctorScheduleModal.tsx";
import DailyClinicPosterModal from "./DailyClinicPosterModal.tsx";
import SpecialtyIcon, { getCleanSpecialtyName, getVibrantSpecialtyColor, getSpecialtyHeaderBg } from "./SpecialtyIcon.tsx";
import EditEventModal from "./EditEventModal.tsx";
import ConfirmationModal from "./ConfirmationModal.tsx";
import WeeklyTimelineView from "./WeeklyTimelineView.tsx";

interface ScheduleTableProps {
  data: CalendarResponse[];
  startDate: string;
  endDate: string;
  settings: AppSettings;
  viewMode: "today" | "week";
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onDateSelect?: (date: Date) => void;
  onOpenDatePicker?: () => void;
  activeDate?: Date;
  expandedSpecialties: Record<string, boolean>;
  setExpandedSpecialties: (val: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  selectedDoctor: { name: string; specialty: string } | null;
  setSelectedDoctor: (val: { name: string; specialty: string } | null) => void;
  isAdmin?: boolean;
  googleAccessToken?: string | null;
  onRefresh?: () => void;
  calendars?: any[];
  filters?: FilterState;
  onViewModeChange?: (mode: "today" | "week") => void;
}



// Helper to check if an event is active (not apologized/canceled)
function isEventActive(event: any): boolean {
  const summary = (event?.summary || "").toLowerCase();
  return !summary.includes("❌") && !summary.includes("معتذر") && !summary.includes("اعتذر");
}

export default function ScheduleDisplay({ 
  data, 
  startDate, 
  endDate, 
  settings, 
  viewMode, 
  onPrevDay, 
  onNextDay,
  onDateSelect,
  onOpenDatePicker,
  activeDate,
  expandedSpecialties,
  setExpandedSpecialties,
  selectedDoctor,
  setSelectedDoctor,
  isAdmin,
  googleAccessToken,
  onRefresh,
  calendars = CALENDARS,
  filters,
  onViewModeChange
}: ScheduleTableProps) {
  const [weeklySubView, setWeeklySubView] = useState<"cards" | "timeline">("cards");
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isDailyPosterOpen, setIsDailyPosterOpen] = useState(false);
  const [editingEventInfo, setEditingEventInfo] = useState<{ event: any; calendarId: string } | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "primary" | "danger";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "primary",
    onConfirm: () => {},
  });

  const handleUpdateStatus = async (calendarId: string, eventId: string, currentSummary: string, statusIcon: string, statusLabel: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد تغيير الحالة",
      message: `هل أنت متأكد من تغيير حالة الطبيب إلى (${statusLabel})؟`,
      type: "primary",
      onConfirm: async () => {
        setUpdatingEventId(eventId);
        setUpdateError(null);
        
        try {
          const namePart = stripStatusEmojis(currentSummary).split(" - ")[0].trim();
          const newSummary = statusIcon ? `${namePart} - ${statusIcon} ${statusLabel}` : namePart;

          const updatedEventObj = {
            id: eventId,
            calendarId,
            summary: newSummary
          };

          // Save to Firestore for permanent cross-device sync
          try {
            await setDoc(doc(db, "custom_events", eventId), updatedEventObj, { merge: true });
          } catch (fbErr) {
            console.warn("Firestore status update warning:", fbErr);
          }

          // 3. Update Google Calendar if token available
          if (googleAccessToken) {
            try {
              await axios.patch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
                { summary: newSummary },
                {
                  headers: {
                    Authorization: `Bearer ${googleAccessToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
            } catch (googleErr) {
              console.warn("Google Calendar patch warning:", googleErr);
            }
          }
          
          if (onRefresh) onRefresh();
        } catch (err: any) {
          console.error("Error updating event:", err);
          setUpdateError("فشل تحديث الحالة. يرجى المحاولة لاحقاً.");
        } finally {
          setUpdatingEventId(null);
        }
      }
    });
  };

  const renderAdminControls = (calendarId: string, eventId: string, currentSummary: string) => {
    if (!isAdmin) return null;

    const statuses = [
      { label: "مواعيد عادية", icon: "🟢", color: "text-green-600 bg-green-50" },
      { label: "معتذر", icon: "❌", color: "text-red-600 bg-red-50" },
      { label: "استثناء", icon: "⚠️", color: "text-amber-600 bg-amber-50" },
      { label: "بديل", icon: "✔️", color: "text-brand-blue bg-brand-blue/5" },
    ];

    return (
      <div className="mt-4 border-t border-slate/10 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-brand-blue" />
          <span className="text-[10px] font-black text-navy opacity-60">تحديث الحالة للمشرف</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {statuses.map((s) => (
            <button
              key={s.label}
              disabled={updatingEventId !== null}
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateStatus(calendarId, eventId, currentSummary, s.icon, s.label);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl font-black transition-all border border-transparent hover:border-navy/10 disabled:opacity-50 ${s.color}`}
            >
              <span className="text-sm">{s.icon} <span className="text-[10px]">{s.label}</span></span>
              {updatingEventId === eventId && s.icon === currentSummary.split("-")[1]?.trim()?.split(" ")[0] && (
                <Loader2 size={12} className="animate-spin" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };
  // const [expandedSpecialties, setExpandedSpecialties] = useState<Record<string, boolean>>({});
  // const [selectedDoctor, setSelectedDoctor] = useState<{ name: string; specialty: string } | null>(null);

  const normalizeDoctorName = (name: string) => {
    if (!name) return "";
    return stripStatusEmojis(name)
      .replace(/^(د\/|د\.|دكتور |Dr\.|Prof\.)\s?/gi, "") // Keep prefix removal for internal ID mapping
      .toLowerCase();
  };

  const days = useMemo(() => {
    if (!startDate || !endDate) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });
    } catch (e) {
      console.error("Date interval error:", e);
      return [];
    }
  }, [startDate, endDate]);

  const weekRangeText = useMemo(() => {
    if (days.length === 0) return "جدول الأسبوع";
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    const startFmt = format(firstDay, "EEEE d MMMM", { locale: ar });
    const endFmt = format(lastDay, "EEEE d MMMM yyyy", { locale: ar });
    return `${startFmt} - ${endFmt}`;
  }, [days]);

  const toggleSpecialty = (name: string) => {
    setExpandedSpecialties((prev: Record<string, boolean>) => ({ 
      ...prev, 
      [name]: prev[name] === undefined ? true : !prev[name] 
    }));
  };

  const groupedData = useMemo(() => {
    const root: Record<string, { color: string; doctors: Record<string, Record<string, any[]>> }> = {};

    data.forEach((calRes) => {
      const calInfo = calendars.find((c) => c.id === calRes.calendarId);
      if (!calInfo) return;

      const specialtyName = calInfo.name;
      if (!root[specialtyName]) {
        root[specialtyName] = { 
          color: calInfo.backgroundColor || calInfo.color || "#CBD5E1", 
          doctors: {} 
        };
      }

      calRes.events.forEach((event) => {
        const title = event.summary || "طبيب غير مسمى";
        // Extract doctor name before the first hyphen if present
        const rawDoctorName = title.split("-")[0].trim();
        const cleanDocPart = stripStatusEmojis(rawDoctorName).split("•")[0].trim();

        // Filter 1: Doctor Name Search Query
        if (filters?.doctorQuery) {
          const q = normalizeArabicQuery(filters.doctorQuery);
          if (q && !normalizeArabicQuery(cleanDocPart).includes(q)) {
            return;
          }
        }

        // Filter 2: Active Appointments Only
        if (filters?.activeOnly && !isEventActive(event)) {
          return;
        }

        const dateStr = event.start.dateTime || event.start.date;
        if (!dateStr) return;
        const eventDate = parseISO(dateStr);

        // Filter 3: Day of Week
        if (filters?.dayOfWeek && filters.dayOfWeek !== "all") {
          if (eventDate.getDay().toString() !== filters.dayOfWeek) {
            return;
          }
        }

        // Filter 4: Time Period / Shift
        if (filters?.shift && filters.shift !== "all") {
          const hour = eventDate.getHours();
          if (filters.shift === "morning" && (hour < 5 || hour >= 12)) return;
          if (filters.shift === "afternoon" && (hour < 12 || hour >= 17)) return;
          if (filters.shift === "evening" && hour < 17 && hour >= 5) return;
        }

        const doctorName = normalizeDoctorName(cleanDocPart);
        
        if (!root[specialtyName].doctors[doctorName]) {
          root[specialtyName].doctors[doctorName] = {};
        }

        const dateKey = format(eventDate, "yyyy-MM-dd");

        if (!root[specialtyName].doctors[doctorName][dateKey]) {
          root[specialtyName].doctors[doctorName][dateKey] = [];
        }
        root[specialtyName].doctors[doctorName][dateKey].push(event);
      });
    });

    return root;
  }, [data, calendars, filters]);

  const processEvent = (summary: string) => {
    const textToSearch = summary.toLowerCase();
    if (textToSearch.includes("❌") || textToSearch.includes("معتذر") || textToSearch.includes("اعتذر")) {
      return { label: "معتذر ❌", className: "text-brand-red border-brand-red/30 bg-brand-red/10 font-black shadow-2xs" };
    }
    if (textToSearch.includes("✔️") || textToSearch.includes("بديل")) {
      return { label: "بديل ✔️", className: "text-brand-blue border-brand-blue/30 bg-brand-blue/10 font-black shadow-2xs" };
    }
    if (textToSearch.includes("⚠️") || textToSearch.includes("استثناء")) {
      return { label: "استثناء ⚠️", className: "text-amber-800 border-amber-500/40 bg-amber-100/90 font-black shadow-2xs" };
    }
    if (textToSearch.includes("🟢") || textToSearch.includes("مواعيد عادية")) return { label: null, className: "" };
    if (textToSearch.includes("❗") || textToSearch.includes("حجز مسبق")) {
      return { label: "حجز مسبق ❗", className: "text-brand-blue-dark border-brand-blue-dark/30 bg-brand-blue-dark/10 font-black shadow-2xs" };
    }
    return { label: null, className: "" };
  };

  const getTimeString = (event: any) => {
    return getAppointmentTimeInfo(event).timeString;
  };

  const getWeekRangeForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    // In our system Sat is the start (0 for Sunday so Sat is 6)
    // Sat=6, Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
    // diffToSat: if Sat (6) -> 0. If Sun (0) -> 1. If Mon (1) -> 2.
    const diffToSat = (dayOfWeek + 1) % 7;
    const saturday = addDays(date, -diffToSat);
    const friday = addDays(saturday, 6);
    return eachDayOfInterval({ start: saturday, end: friday });
  };

  if (days.length === 0) return null;

  const groupedTodayData = useMemo(() => {
    const map: Record<string, { specialty: string; color: string; doctors: Array<{ doctor: string; events: any[] }> }> = {};
    if (days.length === 0) return [];
    
    const todayKey = format(days[0], "yyyy-MM-dd");
    
    Object.entries(groupedData).forEach(([specialty, { color, doctors }]) => {
      Object.entries(doctors).forEach(([doctor, daySchedules]) => {
        const events = daySchedules[todayKey] || [];
        if (events.length > 0) {
          if (!map[specialty]) {
            map[specialty] = { specialty, color, doctors: [] };
          }
          map[specialty].doctors.push({ doctor, events });
        }
      });
    });

    const list = Object.values(map);
    list.sort((a, b) => a.specialty.localeCompare(b.specialty, "ar"));
    return list;
  }, [groupedData, days]);

  const renderTodayTable = () => {
    return (
      <div className="space-y-3 sm:space-y-4">
        {/* Single Compact Day Navigation */}
        <div className="flex items-center justify-between bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200/70 shadow-2xs max-w-xl mx-auto w-full">
          <button 
            onClick={onPrevDay}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 text-brand-blue border border-slate-200/80 rounded-lg font-black hover:bg-brand-blue hover:text-white transition-all text-xs active:scale-95 cursor-pointer"
            title="اليوم السابق"
          >
            <ChevronRight size={14} />
            <span>السابق</span>
          </button>
          
          <div 
            onClick={onOpenDatePicker}
            className="flex items-center justify-center cursor-pointer group px-3.5 py-1.5 bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 rounded-xl transition-all shadow-2xs"
            title="انقر لفتح التقويم والقفز لأي تاريخ"
          >
            <div className="flex items-center gap-1.5 text-brand-red">
              <CalendarIcon size={14} className="shrink-0 text-brand-red" />
              <h4 className="font-black text-xs sm:text-sm text-center text-brand-red">
                {format(days[0], "EEEE d MMMM yyyy", { locale: ar })}
              </h4>
            </div>
          </div>

          <button 
            onClick={onNextDay}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 text-brand-blue border border-slate-200/80 rounded-lg font-black hover:bg-brand-blue hover:text-white transition-all text-xs active:scale-95 cursor-pointer"
            title="اليوم التالي"
          >
            <span>التالي</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Grouped Clinics List for Today */}
        <div className="space-y-2.5 sm:space-y-3">
          {groupedTodayData.map((group) => {
            const darkColor = getVibrantSpecialtyColor(group.specialty, group.color);
            // Exclude doctors whose events today are ALL apologized/canceled
            const activeDoctorsToday = group.doctors.filter(d => 
              d.events.some(e => isEventActive(e))
            );
            const activeCountToday = activeDoctorsToday.length;

            return (
              <div 
                key={group.specialty}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
              >
                {/* Clinic Group Header - Rich Vibrant Dark Tint Background */}
                <div 
                  className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200/60 flex items-center justify-between gap-2 shadow-2xs"
                  style={{ backgroundColor: getSpecialtyHeaderBg(group.specialty, group.color), borderRightWidth: "5px", borderRightColor: darkColor }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SpecialtyIcon specialty={group.specialty} size="sm" showBackground />
                    <h3 className="font-black text-xs sm:text-sm leading-tight" style={{ color: darkColor }}>
                      {getCleanSpecialtyName(group.specialty)} <span className="text-[11px] font-bold opacity-80">({activeCountToday})</span>
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onViewModeChange) onViewModeChange("week");
                      setExpandedSpecialties(prev => ({ ...prev, [group.specialty]: true }));
                      setTimeout(() => {
                        const element = document.getElementById(`specialty-${group.specialty}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 150);
                    }}
                    className="text-[10px] font-bold text-brand-blue bg-white/90 hover:bg-white border border-slate-200/60 px-2 py-1 rounded-md transition-colors shrink-0 flex items-center gap-0.5 active:scale-95 shadow-2xs cursor-pointer"
                  >
                    <span>عرض الأسبوع</span>
                    <ChevronLeft size={12} />
                  </button>
                </div>

                {/* Doctors List under this Clinic */}
                <div className="divide-y divide-slate-100 p-1.5 sm:p-2">
                  {group.doctors.map((docItem, dIdx) => {
                    const cleanDoc = stripStatusEmojis(docItem.doctor);
                    const isApologizedToday = docItem.events.some(e => {
                      const sum = (e.summary || "").toLowerCase();
                      return sum.includes("❌") || sum.includes("معتذر") || sum.includes("اعتذر");
                    });
                    const isExceptionToday = docItem.events.some(e => {
                      const sum = (e.summary || "").toLowerCase();
                      return sum.includes("⚠️") || sum.includes("استثناء");
                    });

                    return (
                      <div 
                        key={dIdx}
                        className={`p-2 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${
                          isApologizedToday ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Doctor Name with Clinic Specialty Emoji Icon & Status Badge */}
                        <div className="flex items-center gap-3 text-right group/doc min-w-0">
                          <button 
                            onClick={() => setSelectedDoctor({ name: cleanDoc, specialty: group.specialty })}
                            className="flex items-center gap-2 text-right group/doc min-w-0"
                            title={`عرض جدول مواعيد ${cleanDoc}`}
                          >
                            <SpecialtyIcon specialty={group.specialty} size="sm" showBackground className="shrink-0 group-hover/doc:scale-105 transition-transform" />
                            <h4 className="font-extrabold text-navy text-[13px] sm:text-[14px] group-hover/doc:text-brand-blue cursor-pointer transition-colors leading-snug flex items-center gap-1.5 flex-wrap">
                              <span>{cleanDoc.startsWith("د.") || cleanDoc.startsWith("د/") ? cleanDoc : `د. ${cleanDoc}`}</span>
                              {isApologizedToday && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.2 rounded-md border border-red-200/80 shrink-0" title="معتذر اليوم">
                                  ❌ معتذر
                                </span>
                              )}
                              {isExceptionToday && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.2 rounded-md border border-amber-300/80 shrink-0" title="استثناء اليوم">
                                  ⚠️ استثناء
                                </span>
                              )}
                            </h4>
                          </button>
                          
                          {isAdmin && (
                            <button
                              onClick={() => setSelectedDoctor({ name: cleanDoc, specialty: group.specialty })}
                              className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-all cursor-pointer border border-amber-200/50 active:scale-95 shrink-0 shadow-2xs"
                              title="إدارة جدول هذا الطبيب"
                            >
                              <CalendarIcon size={12} />
                            </button>
                          )}
                        </div>

                        {/* Appointments and Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 sm:justify-end pr-8 sm:pr-0">
                              {docItem.events.map((event, eIdx) => {
                            const { label, className } = processEvent(event.summary || "");
                            const isCanceled = label === "معتذر";
                            return (
                              <div key={eIdx} className="flex items-center gap-1.5">
                                {!isCanceled && <AppointmentTimeBadge event={event} size="sm" />}
                                {label && (
                                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${className}`}>
                                    {label}
                                  </span>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const calObj = calendars.find(c => c.name === group.specialty || c.id === group.specialty);
                                      setEditingEventInfo({ event, calendarId: event.calendarId || (calObj ? calObj.id : calendars[0].id) });
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-amber-200 active:scale-95 shrink-0"
                                    title="تعديل هذا الموعد"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {groupedTodayData.length === 0 && (
            <div className="py-12 px-4 text-center bg-white rounded-xl border border-dashed border-slate-200">
              <CalendarIcon size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-black text-slate-600 text-xs sm:text-sm">لا توجد مواعيد مسجلة اليوم</p>
              <span className="text-[10.5px] text-slate-400 font-medium mt-1 block">
                يمكنك التنقل بين الأيام أو الاطلاع على الجدول الأسبوعي العام
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const [expandedDoctors, setExpandedDoctors] = useState<Record<string, boolean>>({});

  const toggleDoctor = (docKey: string) => {
    setExpandedDoctors((prev) => ({
      ...prev,
      [docKey]: prev[docKey] === undefined ? true : !prev[docKey]
    }));
  };

  const handleCollapseAll = () => {
    const collapsedSpecs: Record<string, boolean> = {};
    Object.keys(groupedData).forEach((spec) => {
      collapsedSpecs[spec] = false;
    });
    setExpandedSpecialties(collapsedSpecs);
    setExpandedDoctors({});
  };

  const handleExpandAll = () => {
    const expandedSpecs: Record<string, boolean> = {};
    const expandedDocs: Record<string, boolean> = {};
    Object.entries(groupedData).forEach(([spec, { doctors }]) => {
      expandedSpecs[spec] = true;
      Object.keys(doctors).forEach((doc) => {
        expandedDocs[`${spec}-${doc}`] = true;
      });
    });
    setExpandedSpecialties(expandedSpecs);
    setExpandedDoctors(expandedDocs);
  };

  const renderWeeklyAccordions = () => {
    return (
      <div className="space-y-3 sm:space-y-4">
        {/* Top Control Bar for Collapse All / Expand All - Compact Single-Line Icon Buttons */}
        <div className="flex items-center justify-between bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs sm:text-sm font-black text-navy">العيادات الأسبوعية ({Object.keys(groupedData).length})</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExpandAll}
              className="p-1.5 text-brand-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center active:scale-95 shrink-0 cursor-pointer"
              title="توسيع الكل"
              aria-label="توسيع الكل"
            >
              <ChevronsDown size={16} />
            </button>
            <button
              onClick={handleCollapseAll}
              className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center active:scale-95 shrink-0 cursor-pointer"
              title="طي الكل"
              aria-label="طي الكل"
            >
              <ChevronsUp size={16} />
            </button>
          </div>
        </div>

        {Object.entries(groupedData).map(([specialty, { color, doctors }]) => {
          const activeWeeklyDoctors = Object.entries(doctors).filter(([_, daySchedules]) => {
            return Object.values(daySchedules).some(events => events.some(e => isEventActive(e)));
          });
          const docCount = activeWeeklyDoctors.length;
          const darkColor = getVibrantSpecialtyColor(specialty, color);

          return (
            <div key={specialty} id={`specialty-${specialty}`} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs scroll-mt-24">
              <button
                onClick={() => toggleSpecialty(specialty)}
                className="w-full flex items-center justify-between p-2.5 sm:p-3.5 hover:opacity-95 transition-all text-right relative overflow-hidden border-b border-slate-200/60 select-none shadow-2xs cursor-pointer"
                style={{ backgroundColor: getSpecialtyHeaderBg(specialty, color), borderRightWidth: "5px", borderRightColor: darkColor }}
              >
                <div className="flex items-center gap-2 sm:gap-3 pr-1 min-w-0">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs" style={{ backgroundColor: `${color}25`, color: color }}>
                    <SpecialtyIcon specialty={specialty} size="md" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black leading-tight truncate" style={{ color: darkColor }}>
                    {getCleanSpecialtyName(specialty)} <span className="text-[11px] font-bold opacity-80">({docCount})</span>
                  </h3>
                </div>
                <div className={`p-1 rounded-md bg-white/90 border border-slate-200/60 shadow-2xs transition-transform ${expandedSpecialties[specialty] ? 'rotate-180' : ''}`}>
                  <ChevronDown size={14} className="text-slate-600" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {expandedSpecialties[specialty] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-50/40"
                  >
                    <div className="p-2 sm:p-3 space-y-2">
                      {Object.entries(doctors).map(([doctor, daySchedules]) => {
                        const cleanDocName = stripStatusEmojis(doctor).split("•")[0].trim();
                        const docDisplayName = cleanDocName.startsWith("د.") || cleanDocName.startsWith("د/") 
                          ? cleanDocName 
                          : `د. ${cleanDocName}`;
                        const docKey = `${specialty}-${doctor}`;
                        const isExpanded = !!expandedDoctors[docKey];
                        const totalActiveEvents = Object.values(daySchedules).reduce((acc, evs) => {
                          return acc + evs.filter(e => isEventActive(e)).length;
                        }, 0);

                        return (
                          <div 
                            key={doctor} 
                            className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all"
                          >
                            <div 
                              onClick={() => toggleDoctor(docKey)}
                              className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-blue-50/20 transition-colors select-none"
                            >
                              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                <SpecialtyIcon specialty={specialty} size="sm" showBackground className="shrink-0" />
                                <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-navy text-[13px] sm:text-[14px] leading-snug">
                                    {docDisplayName}
                                  </h4>
                                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200/60 px-1.5 py-0.2 rounded-md shrink-0">
                                    ({totalActiveEvents})
                                  </span>
                                  {isAdmin && (
                                    <div className="flex items-center gap-1">
                                       <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" title="وضع الإدارة نشط" />
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setSelectedDoctor({ name: cleanDocName, specialty: specialty });
                                         }}
                                         className="p-1 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/50 rounded-md transition-all shadow-3xs"
                                         title="تعديل جدول الطبيب"
                                       >
                                         <CalendarIcon size={11} />
                                       </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 border-t border-slate-100 sm:border-t-0 sm:pt-0 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDoctor({ name: cleanDocName, specialty: specialty });
                                  }}
                                  className="px-3 py-1.5 text-[11px] font-extrabold text-brand-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 active:scale-95"
                                  title="فتح كارت الطبيب"
                                >
                                  <span>جدول الطبيب</span>
                                  <ChevronLeft size={13} />
                                </button>

                                <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform ${isExpanded ? 'rotate-180 bg-blue-100 text-brand-blue' : ''}`}>
                                  <ChevronDown size={14} />
                                </div>
                              </div>
                            </div>

                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-slate-100 overflow-hidden bg-slate-50/30"
                                >
                                  <div className="p-2 sm:p-3 overflow-x-auto">
                                    <table className="w-full text-right border-collapse min-w-[700px] bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                                      <thead>
                                        <tr className="bg-slate-100/90 border-b border-slate-200 text-xs font-black text-navy">
                                          {days.map((day) => {
                                            const isToday = isSameDay(day, startOfToday());
                                            return (
                                              <th key={day.toISOString()} className={`p-2.5 text-center border-l border-slate-200/70 last:border-l-0 ${isToday ? "bg-amber-100/90 text-brand-red font-black" : ""}`}>
                                                <div className="flex flex-col items-center gap-0.5">
                                                  <span>{format(day, "EEEE", { locale: ar })}</span>
                                                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${isToday ? "bg-brand-red text-white" : "text-slate-500 bg-white border border-slate-200/60"}`}>
                                                    {format(day, "d MMMM", { locale: ar })}
                                                  </span>
                                                </div>
                                              </th>
                                            );
                                          })}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="bg-white">
                                          {days.map((day) => {
                                            const dayKey = format(day, "yyyy-MM-dd");
                                            const events = daySchedules[dayKey] || [];
                                            const hasEvents = events.length > 0;
                                            const isToday = isSameDay(day, startOfToday());

                                            return (
                                              <td key={dayKey} className={`p-2.5 text-center border-l border-slate-100 last:border-l-0 align-top ${isToday ? "bg-amber-50/40" : ""}`}>
                                                {hasEvents ? (
                                                  <div className="flex flex-col gap-1.5 items-center justify-center">
                                                    {events.map((event, eIdx) => {
                                                      const { label, className } = processEvent(event.summary || "");
                                                      return (
                                                        <div key={event.id || eIdx} className="w-full flex flex-col items-center gap-1">
                                                          <AppointmentTimeBadge
                                                            event={event}
                                                            size="sm"
                                                            layout="stacked"
                                                            className="w-full justify-center"
                                                          />
                                                          {label && (
                                                            <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border w-full text-center ${className}`}>
                                                              {label}
                                                            </span>
                                                          )}
                                                          {isAdmin && (
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                const calObj = calendars.find(c => c.name === specialty || c.id === specialty);
                                                                setEditingEventInfo({ event, calendarId: event.calendarId || (calObj ? calObj.id : calendars[0].id) });
                                                              }}
                                                              className="mt-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[9.5px] font-black transition-colors w-full flex items-center justify-center gap-1 cursor-pointer"
                                                              title="تعديل الموعد"
                                                            >
                                                              <Pencil size={11} />
                                                              <span>تعديل</span>
                                                            </button>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ) : (
                                                  <div className="py-6 text-center select-none">
                                                    <span className="text-slate-300 font-bold text-base">—</span>
                                                  </div>
                                                )}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="schedule" className="space-y-4 sm:space-y-6" style={{ fontSize: `${settings.globalFontSize}%` }}>
      <header className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 border border-slate-200/80 bg-white rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-red rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-red/20 shrink-0">
             <CalendarIcon size={20} className="sm:size-6" />
          </div>
          <div className="text-right">
            <h2 className="text-base sm:text-xl font-black text-brand-blue tracking-tight">
              {viewMode === "today" ? "مواعيد اليوم" : "جدول العيادات الأسبوعي"}
            </h2>
            <p className="text-[11px] font-extrabold text-slate-500 mt-0.5">
              {viewMode === "today"
                ? format(days[0] || startOfToday(), "EEEE d MMMM yyyy", { locale: ar })
                : weekRangeText}
            </p>
          </div>
        </div>

        {/* In Weekly Mode: Toggle between Cards View and Timeline View */}
        {viewMode === "week" && (
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 shrink-0">
            <button
              onClick={() => setWeeklySubView("cards")}
              className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                weeklySubView === "cards" ? "bg-white text-brand-blue shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span>🗂️ عرض الكروت</span>
            </button>
            <button
              onClick={() => setWeeklySubView("timeline")}
              className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                weeklySubView === "timeline" ? "bg-white text-brand-blue shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span>📊 جدول التايم لاين</span>
            </button>
          </div>
        )}
      </header>

      {viewMode === "today" ? (
        renderTodayTable()
      ) : weeklySubView === "timeline" ? (
        <WeeklyTimelineView
          data={data}
          days={days}
          calendars={calendars}
          filters={filters}
          onSelectDoctor={(doc) => setSelectedDoctor(doc)}
          isAdmin={isAdmin}
          onEditEvent={(event, calendarId) => setEditingEventInfo({ event, calendarId })}
          settings={settings}
        />
      ) : (
        renderWeeklyAccordions()
      )}

      {/* Compact Doctor Schedule Modal */}
      {selectedDoctor && (
        <CompactDoctorScheduleModal
          selectedDoctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          initialData={data}
          calendars={calendars}
          isAdmin={isAdmin}
          googleAccessToken={googleAccessToken}
          onRefresh={onRefresh}
          onEditEvent={(event) => {
            const calObj = calendars.find(c => c.name === selectedDoctor.specialty || c.id === selectedDoctor.specialty);
            setEditingEventInfo({ event, calendarId: event.calendarId || (calObj ? calObj.id : calendars[0].id) });
          }}
        />
      )}

      {/* Daily Clinic Poster Modal (Part 9) */}
      <DailyClinicPosterModal
        isOpen={isDailyPosterOpen}
        onClose={() => setIsDailyPosterOpen(false)}
        selectedDate={days[0]}
        data={data}
        calendars={calendars}
      />

      {editingEventInfo && (
        <EditEventModal
          isOpen={true}
          onClose={() => setEditingEventInfo(null)}
          event={editingEventInfo.event}
          calendarId={editingEventInfo.calendarId}
          googleAccessToken={googleAccessToken}
          onRefresh={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </div>
  );
}
