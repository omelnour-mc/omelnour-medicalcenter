/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { format, eachDayOfInterval, parseISO, isSameDay, startOfToday, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, User, Clock, Calendar as CalendarIcon, X, ChevronRight, ChevronLeft, Phone, Shield, Save, Loader2, AlertCircle, Stethoscope, Download, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarResponse, AppSettings } from "../types.ts";
import { CALENDARS, CONTACT_PHONE } from "../constants.ts";
import axios from "axios";
import { stripStatusEmojis, normalizeArabicQuery } from "../lib/utils.ts";
import { FilterState } from "./FilterSidebar.tsx";
import AppointmentTimeBadge from "./AppointmentTimeBadge.tsx";
import { getAppointmentTimeInfo } from "../lib/timeUtils.ts";
import CompactDoctorScheduleModal from "./CompactDoctorScheduleModal.tsx";
import DailyClinicPosterModal from "./DailyClinicPosterModal.tsx";
import SpecialtyIcon, { getCleanSpecialtyName, getVibrantSpecialtyColor, getSpecialtyHeaderBg } from "./SpecialtyIcon.tsx";

interface ScheduleTableProps {
  data: CalendarResponse[];
  startDate: string;
  endDate: string;
  settings: AppSettings;
  viewMode: "today" | "week";
  onPrevDay?: () => void;
  onNextDay?: () => void;
  expandedSpecialties: Record<string, boolean>;
  setExpandedSpecialties: (val: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  selectedDoctor: { name: string; specialty: string } | null;
  setSelectedDoctor: (val: { name: string; specialty: string } | null) => void;
  isAdmin?: boolean;
  googleAccessToken?: string | null;
  onRefresh?: () => void;
  calendars?: any[];
  filters?: FilterState;
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
  expandedSpecialties,
  setExpandedSpecialties,
  selectedDoctor,
  setSelectedDoctor,
  isAdmin,
  googleAccessToken,
  onRefresh,
  calendars = CALENDARS,
  filters
}: ScheduleTableProps) {
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isDailyPosterOpen, setIsDailyPosterOpen] = useState(false);

  const handleUpdateStatus = async (calendarId: string, eventId: string, currentSummary: string, statusIcon: string, statusLabel: string) => {
    if (!googleAccessToken) return;
    
    setUpdatingEventId(eventId);
    setUpdateError(null);
    
    try {
      // Extract original name from summary (assuming Format: "Dr Name - Status")
      const namePart = currentSummary.split("-")[0].trim();
      const newSummary = `${namePart} - ${statusIcon} ${statusLabel}`;

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
      
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Error updating event:", err);
      setUpdateError("فشل تحديث الحالة. تأكد من صلاحيات المشرف.");
    } finally {
      setUpdatingEventId(null);
    }
  };

  const renderAdminControls = (calendarId: string, eventId: string, currentSummary: string) => {
    if (!isAdmin || !googleAccessToken) return null;

    const statuses = [
      { label: "متواجد", icon: "✅", color: "text-green-600 bg-green-50" },
      { label: "اعتذر", icon: "❌", color: "text-red-600 bg-red-50" },
      { label: "تأخير", icon: "⚠️", color: "text-amber-600 bg-amber-50" },
      { label: "حالة طارئة", icon: "❗", color: "text-brand-red bg-brand-red/5" },
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
    if (textToSearch.includes("❌")) return { label: "معتذر", className: "text-brand-red border-brand-red/20 bg-brand-red/5" };
    if (textToSearch.includes("✔️")) return { label: "بديل", className: "text-brand-blue border-brand-blue/20 bg-brand-blue/5" };
    if (textToSearch.includes("⚠️")) return { label: "استثناء", className: "text-amber-600 border-amber-600/20 bg-amber-600/5" };
    if (textToSearch.includes("❗")) return { label: "حجز مسبق", className: "text-brand-blue-dark border-brand-blue-dark/20 bg-brand-blue-dark/5" };
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
        <div className="flex items-center justify-between bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200/70 shadow-2xs">
          <button 
            onClick={onPrevDay}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 text-brand-blue border border-slate-200/80 rounded-lg font-black hover:bg-brand-blue hover:text-white transition-all text-xs active:scale-95"
            title="اليوم السابق"
          >
            <ChevronRight size={14} />
            <span>السابق</span>
          </button>
          
          <h4 className="font-black text-brand-blue text-xs sm:text-sm text-center">
            {format(days[0], "EEEE d MMMM yyyy", { locale: ar })}
          </h4>

          <button 
            onClick={onNextDay}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 text-brand-blue border border-slate-200/80 rounded-lg font-black hover:bg-brand-blue hover:text-white transition-all text-xs active:scale-95"
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
                      setExpandedSpecialties(prev => ({ ...prev, [group.specialty]: true }));
                      const element = document.getElementById(`specialty-${group.specialty}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="text-[10px] font-bold text-brand-blue bg-white/90 hover:bg-white border border-slate-200/60 px-2 py-1 rounded-md transition-colors shrink-0 flex items-center gap-0.5 active:scale-95 shadow-2xs"
                  >
                    <span>عرض الأسبوع</span>
                    <ChevronLeft size={12} />
                  </button>
                </div>

                {/* Doctors List under this Clinic */}
                <div className="divide-y divide-slate-100 p-1.5 sm:p-2">
                  {group.doctors.map((docItem, dIdx) => {
                    const cleanDoc = stripStatusEmojis(docItem.doctor);
                    return (
                      <div 
                        key={dIdx}
                        className="p-2 rounded-lg hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                      >
                        {/* Doctor Name with Clinic Specialty Emoji Icon */}
                        <button 
                          onClick={() => setSelectedDoctor({ name: cleanDoc, specialty: group.specialty })}
                          className="flex items-center gap-2 text-right group/doc min-w-0"
                          title={`عرض جدول مواعيد ${cleanDoc}`}
                        >
                          <SpecialtyIcon specialty={group.specialty} size="sm" showBackground className="shrink-0 group-hover/doc:scale-105 transition-transform" />
                          <h4 className="font-extrabold text-navy text-[13px] sm:text-[14px] group-hover/doc:text-brand-blue cursor-pointer transition-colors leading-snug">
                            {cleanDoc.startsWith("د.") || cleanDoc.startsWith("د/") ? cleanDoc : `د. ${cleanDoc}`}
                          </h4>
                        </button>

                        {/* Appointments and Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 sm:justify-end pr-8 sm:pr-0">
                          {docItem.events.map((event, eIdx) => {
                            const { label, className } = processEvent(event.summary || "");
                            const isCanceled = label === "معتذر";
                            return (
                              <div key={eIdx} className="flex items-center gap-1">
                                {!isCanceled && <AppointmentTimeBadge event={event} size="sm" />}
                                {label && (
                                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${className}`}>
                                    {label}
                                  </span>
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
              className="px-2.5 py-1 text-[11px] font-black text-brand-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 active:scale-95 shrink-0"
              title="توسيع الكل"
              aria-label="توسيع الكل"
            >
              <ChevronsDown size={14} />
              <span>توسيع</span>
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1 text-[11px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 active:scale-95 shrink-0"
              title="طي الكل"
              aria-label="طي الكل"
            >
              <ChevronsUp size={14} />
              <span>طي</span>
            </button>
          </div>
        </div>

        {Object.entries(groupedData).map(([specialty, { color, doctors }]) => {
          // Count only doctors in this clinic that have at least 1 non-canceled appointment this week
          const activeWeeklyDoctors = Object.entries(doctors).filter(([_, daySchedules]) => {
            return Object.values(daySchedules).some(events => events.some(e => isEventActive(e)));
          });
          const docCount = activeWeeklyDoctors.length;
          const darkColor = getVibrantSpecialtyColor(specialty, color);

          return (
            <div key={specialty} id={`specialty-${specialty}`} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs scroll-mt-24">
              {/* Clinic Group Header - Rich Vibrant Dark Tint Background */}
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
                        // Count only active (non-canceled) events for this doctor
                        const totalActiveEvents = Object.values(daySchedules).reduce((acc, evs) => {
                          return acc + evs.filter(e => isEventActive(e)).length;
                        }, 0);

                        return (
                          <div 
                            key={doctor} 
                            className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all"
                          >
                            {/* Doctor Card Row: Clean Doctor Name + Number Badge inline */}
                            <div 
                              onClick={() => toggleDoctor(docKey)}
                              className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-blue-50/20 transition-colors select-none"
                            >
                              {/* Doctor Specialty Icon + Doctor Name & Count */}
                              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                <SpecialtyIcon specialty={specialty} size="sm" showBackground className="shrink-0" />
                                <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-navy text-[13px] sm:text-[14px] leading-snug">
                                    {docDisplayName}
                                  </h4>
                                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200/60 px-1.5 py-0.2 rounded-md shrink-0">
                                    ({totalActiveEvents})
                                  </span>
                                </div>
                              </div>

                              {/* Line 2 on Mobile / Right Side on Desktop: Action Buttons */}
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

                            {/* Collapsible Weekly Schedule Body */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-slate-100 overflow-hidden bg-slate-50/30"
                                >
                                  <div className="p-2 sm:p-3 space-y-2">
                                    {/* Mobile Compact Weekly Schedule List (md:hidden) */}
                                    <div className="md:hidden divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                                      {days.map((day) => {
                                        const dayKey = format(day, "yyyy-MM-dd");
                                        const events = daySchedules[dayKey] || [];
                                        const hasEvents = events.length > 0;
                                        const isToday = isSameDay(day, startOfToday());

                                        return (
                                          <div 
                                            key={dayKey}
                                            className={`py-2 px-2.5 flex items-center justify-between gap-2 transition-colors ${
                                              isToday ? "bg-amber-50/80 border-r-3 border-r-brand-red pr-2" : "hover:bg-slate-50/60"
                                            }`}
                                          >
                                            {/* RIGHT: Day Name and Date */}
                                            <div className="min-w-[80px] sm:min-w-[95px] shrink-0 text-right">
                                              <div className="flex items-center gap-1">
                                                <span className={`text-xs font-black leading-tight ${isToday ? "text-brand-red" : "text-navy"}`}>
                                                  {format(day, "EEEE", { locale: ar })}
                                                </span>
                                                {isToday && (
                                                  <span className="text-[8.5px] font-black px-1.5 py-0.2 bg-brand-red text-white rounded-full leading-none">
                                                    اليوم
                                                  </span>
                                                )}
                                              </div>
                                              {settings.showDatesRow && (
                                                <span className="text-[10px] text-slate-400 font-semibold block leading-tight mt-0.5">
                                                  {format(day, "d MMMM", { locale: ar })}
                                                </span>
                                              )}
                                            </div>

                                            {/* LEFT: All registered appointments or neutral dash '—' (NO 'مغلق') */}
                                            <div className="flex-1 flex flex-wrap items-center justify-end gap-1.5 min-w-0">
                                              {hasEvents ? (
                                                events.map((event, idx) => {
                                                  const { label, className } = processEvent(event.summary || "");
                                                  const isCanceled = label === "معتذر";
                                                  return (
                                                    <div key={event.id || idx} className="flex items-center gap-1">
                                                      {!isCanceled && <AppointmentTimeBadge event={event} size="sm" />}
                                                      {label && (
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${className}`}>
                                                          {label}
                                                        </span>
                                                      )}
                                                    </div>
                                                  );
                                                })
                                              ) : (
                                                <span className="text-slate-300 font-bold text-sm select-none px-2" aria-label="لا توجد مواعيد">
                                                  —
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Desktop / Tablet Layout (hidden md:grid) */}
                                    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
                                      {days.map((day) => {
                                        const dayKey = format(day, "yyyy-MM-dd");
                                        const events = daySchedules[dayKey] || [];
                                        const hasEvents = events.length > 0;
                                        const isToday = isSameDay(day, startOfToday());

                                        return (
                                          <div 
                                            key={dayKey} 
                                            className={`p-3 rounded-2xl border transition-all ${
                                              isToday 
                                                ? "bg-amber-50/80 border-brand-red/40 shadow-xs ring-2 ring-brand-red/10" 
                                                : hasEvents 
                                                  ? "bg-blue-50/30 border-blue-100" 
                                                  : "bg-slate-50/60 border-slate-100"
                                            }`}
                                          >
                                            <div className={`flex justify-between items-center mb-2.5 p-1.5 rounded-lg ${isToday ? "bg-brand-red text-white" : "bg-white border border-slate-200/60 text-brand-blue"}`}>
                                              <span className="text-[11px] font-black">
                                                {format(day, "EEEE", { locale: ar })}
                                              </span>
                                              {settings.showDatesRow && (
                                                <span className={`text-[10px] font-mono font-bold ${isToday ? "text-white/80" : "text-slate-400"}`}>
                                                  {format(day, "dd/MM")}
                                                </span>
                                              )}
                                            </div>

                                            <div className="space-y-1.5">
                                              {events.map((event, idx) => {
                                                const { label, className } = processEvent(event.summary || "");
                                                const isCanceled = label === "معتذر";
                                                return (
                                                  <div key={event.id || idx} className="bg-white p-2 rounded-xl shadow-2xs border border-slate-100 flex flex-col gap-1 items-center">
                                                    {!isCanceled && <AppointmentTimeBadge event={event} size="sm" className="w-full justify-center" />}
                                                    {label && (
                                                      <span className={`text-[9.5px] px-2 py-0.5 rounded font-black ${className}`}>
                                                        {label}
                                                      </span>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                              {!hasEvents && (
                                                <div className="py-4 text-center">
                                                  <span className="text-slate-300 font-bold text-base select-none">—</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
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
    <div id="schedule" className="space-y-4 sm:space-y-8" style={{ fontSize: `${settings.globalFontSize}%` }}>
      <header className="flex items-center justify-between gap-4 py-2 sm:py-3 border-b border-slate-200/60">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-brand-red rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-red/20 shrink-0">
             <CalendarIcon size={20} className="sm:size-7" />
          </div>
          <div>
            <h2 className="text-base sm:text-2xl font-black text-brand-blue tracking-tight">
              {viewMode === "today" ? "مواعيد اليوم" : "الجدول الأسبوعي العام"}
            </h2>
            <p className="text-[9px] sm:text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Om Elnour Medical Center</p>
          </div>
        </div>
      </header>

      {viewMode === "today" ? renderTodayTable() : renderWeeklyAccordions()}

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
    </div>
  );
}
