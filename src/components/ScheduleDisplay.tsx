/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { format, eachDayOfInterval, parseISO, isSameDay, startOfToday, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { ChevronDown, ChevronUp, User, Clock, Calendar as CalendarIcon, X, ChevronRight, ChevronLeft, Phone, Shield, Save, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarResponse, AppSettings } from "../types.ts";
import { CALENDARS, CONTACT_PHONE } from "../constants.ts";
import axios from "axios";

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
  onRefresh
}: ScheduleTableProps) {
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

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
    return name
      .replace(/[❌✔️⚠️❗]/g, "") // Remove emojis
      .replace(/^(د\/|د\.|دتور |Dr\.|Prof\.)\s?/gi, "") // Remove common prefixes
      .replace(/\s+/g, " ")      // Collapse multiple spaces
      .trim()
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
      const calInfo = CALENDARS.find((c) => c.id === calRes.calendarId);
      if (!calInfo) return;

      const specialtyName = calInfo.name;
      if (!root[specialtyName]) {
        root[specialtyName] = { color: calInfo.color, doctors: {} };
      }

      calRes.events.forEach((event) => {
        const title = event.summary || "طبيب غير مسمى";
        // Extract doctor name before the first hyphen if present
        const rawDoctorName = title.split("-")[0].trim();
        const doctorName = normalizeDoctorName(rawDoctorName);
        
        if (!root[specialtyName].doctors[doctorName]) {
          root[specialtyName].doctors[doctorName] = {};
        }

        const dateStr = event.start.dateTime || event.start.date;
        if (!dateStr) return;
        const eventDate = parseISO(dateStr);
        const dateKey = format(eventDate, "yyyy-MM-dd");

        if (!root[specialtyName].doctors[doctorName][dateKey]) {
          root[specialtyName].doctors[doctorName][dateKey] = [];
        }
        root[specialtyName].doctors[doctorName][dateKey].push(event);
      });
    });

    return root;
  }, [data]);

  const processEvent = (summary: string) => {
    const textToSearch = summary.toLowerCase();
    if (textToSearch.includes("❌")) return { label: "معتذر", className: "text-brand-red border-brand-red/20 bg-brand-red/5" };
    if (textToSearch.includes("✔️")) return { label: "بديل", className: "text-brand-blue border-brand-blue/20 bg-brand-blue/5" };
    if (textToSearch.includes("⚠️")) return { label: "استثناء", className: "text-amber-600 border-amber-600/20 bg-amber-600/5" };
    if (textToSearch.includes("❗")) return { label: "حجز مسبق", className: "text-brand-blue-dark border-brand-blue-dark/20 bg-brand-blue-dark/5" };
    return { label: null, className: "" };
  };

  const getTimeString = (event: any) => {
    if (event.start?.date) return "طوال اليوم";
    if (event.start?.dateTime) {
      const start = parseISO(event.start.dateTime);
      const end = parseISO(event.end.dateTime);
      return `${format(start, "hh:mm a")} - ${format(end, "hh:mm a")}`;
    }
    return "";
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

  const { flatTodayData, specialtyTints } = useMemo(() => {
    const flat: Array<{ specialty: string; doctor: string; color: string; events: any[] }> = [];
    if (days.length === 0) return { flatTodayData: [], specialtyTints: {} };
    
    const todayKey = format(days[0], "yyyy-MM-dd");
    
    Object.entries(groupedData).forEach(([specialty, { color, doctors }]) => {
      Object.entries(doctors).forEach(([doctor, daySchedules]) => {
        const events = daySchedules[todayKey] || [];
        if (events.length > 0) {
          flat.push({ specialty, doctor, color, events });
        }
      });
    });

    flat.sort((a, b) => {
      if (a.specialty !== b.specialty) return a.specialty.localeCompare(b.specialty, "ar");
      return a.doctor.localeCompare(b.doctor, "ar");
    });

    const tints: Record<string, string> = {};
    const sortedSpecialties = Array.from(new Set(flat.map(d => d.specialty)));
    sortedSpecialties.forEach((s, i) => {
      tints[s] = i % 2 === 0 ? "rgba(3,83,168,0.06)" : "rgba(158,42,47,0.06)";
    });

    return { flatTodayData: flat, specialtyTints: tints };
  }, [groupedData, days]);

  const renderTodayTable = () => {
    return (
      <div className="space-y-6">
        {/* Day Navigation */}
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate/5 shadow-sm">
          <button 
            onClick={onPrevDay}
            className="flex items-center gap-2 px-6 py-3 bg-slate/5 text-brand-blue rounded-2xl font-black hover:bg-brand-blue hover:text-white transition-all shadow-sm"
          >
            <ChevronRight size={20} />
            اليوم السابق
          </button>
          
          <div className="text-center px-4">
            <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest mb-1">عرض مواعيد يوم</p>
            <h4 className="font-black text-brand-blue text-lg">{format(days[0], "EEEE dd MMMM yyyy", { locale: ar })}</h4>
          </div>

          <button 
            onClick={onNextDay}
            className="flex items-center gap-2 px-6 py-3 bg-slate/5 text-brand-blue rounded-2xl font-black hover:bg-brand-blue hover:text-white transition-all shadow-sm"
          >
            اليوم التالي
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden border border-slate/5 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-brand-blue text-white">
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest whitespace-nowrap">التخصص</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest whitespace-nowrap">الطبيب</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest whitespace-nowrap">المواعيد اليوم</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest whitespace-nowrap">الحالة وملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate/5">
                {flatTodayData.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-slate/10 transition-colors group"
                    style={{ backgroundColor: specialtyTints[row.specialty] }}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-10 rounded-full shadow-sm" style={{ backgroundColor: row.color }}></div>
                        <span className="font-black text-brand-blue text-sm">{row.specialty}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => setSelectedDoctor({ name: row.doctor, specialty: row.specialty })}
                        className="font-black text-slate text-base hover:text-brand-red hover:underline decoration-brand-red/30 decoration-2 transition-all cursor-pointer text-right flex items-center gap-2 group/docName"
                      >
                         <User size={16} className="text-slate/20 group-hover:text-brand-red transition-colors" />
                         {row.doctor}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {row.events.map((event, eIdx) => (
                          <div key={eIdx} className="bg-white border border-brand-blue/10 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                            <Clock size={12} className="text-brand-blue" />
                            <span className="text-[12px] font-black text-brand-blue" dir="ltr">
                              {getTimeString(event)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {row.events.map((event, eIdx) => {
                          const { label, className } = processEvent(event.summary || "");
                          if (!label) return null;
                          return (
                            <span key={eIdx} className={`text-[11px] font-black px-3 py-1.5 rounded-lg border ${className} shadow-sm`}>
                              {label}
                            </span>
                          );
                        })}
                        {row.events.every(e => !processEvent(e.summary || "").label) && (
                          <span className="text-[11px] font-bold text-slate/20 italic">لا يوجد تنبيهات</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {flatTodayData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-32 text-center">
                       <div className="flex flex-col items-center gap-4 opacity-10">
                          <CalendarIcon size={80} strokeWidth={1} />
                          <p className="font-black text-2xl uppercase tracking-[0.2em]">لا توجد مواعيد</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderWeeklyAccordions = () => {
    return (
      <div className="space-y-6">
        {Object.entries(groupedData).map(([specialty, { color, doctors }]) => (
          <div key={specialty} id={`specialty-${specialty}`} className="bg-white rounded-3xl overflow-hidden card-shadow border border-slate/5 scroll-mt-24">
            <button
              onClick={() => toggleSpecialty(specialty)}
              className="w-full flex items-center justify-between p-8 hover:bg-slate/5 transition-colors text-right"
              style={{ borderRight: `8px solid ${color}` }}
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${color}20`, color: color }}>
                  <User size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-brand-blue">{specialty}</h3>
                  <p className="text-xs font-bold text-slate/40 mt-1 uppercase tracking-widest">المواعيد الأسبوعية للعيادة</p>
                </div>
              </div>
              <div className={`p-2 rounded-xl bg-slate/5 transition-transform ${expandedSpecialties[specialty] ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} className="text-brand-blue" />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedSpecialties[specialty] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-8 pt-0 space-y-10 border-t border-slate/5">
                    {Object.entries(doctors).map(([doctor, daySchedules]) => (
                      <div key={doctor} className="group pt-8 last:pb-0">
                        <div className="flex items-center gap-4 mb-6">
                          <button 
                            onClick={() => setSelectedDoctor({ name: doctor, specialty: specialty })}
                            className="w-10 h-10 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center hover:bg-brand-blue hover:text-white transition-all shadow-md"
                          >
                            <User size={20} />
                          </button>
                          <h4 
                            onClick={() => setSelectedDoctor({ name: doctor, specialty: specialty })}
                            className="font-black text-navy text-xl hover:text-brand-blue cursor-pointer transition-colors"
                          >
                            {doctor}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                          {days.map((day) => {
                            const dayKey = format(day, "yyyy-MM-dd");
                            const events = daySchedules[dayKey] || [];
                            const hasEvents = events.length > 0;
                            const isToday = isSameDay(day, startOfToday());

                            return (
                              <div 
                                key={dayKey} 
                                className={`p-5 rounded-3xl border transition-all ${
                                  isToday 
                                    ? "bg-[#FFF3B0] border-brand-red/30 shadow-inner ring-4 ring-brand-red/5" 
                                    : hasEvents 
                                      ? "bg-brand-blue/5 border-brand-blue/10" 
                                      : "bg-slate/5 border-transparent opacity-40 hover:opacity-100"
                                }`}
                              >
                                <div className={`flex justify-between items-center mb-4 p-2 rounded-xl ${isToday ? "bg-brand-red shadow-lg" : "bg-slate/5"}`}>
                                  <span className={`text-[11px] font-black uppercase tracking-wider ${isToday ? "text-white" : "text-brand-blue"}`}>
                                    {format(day, "EEEE", { locale: ar })}
                                  </span>
                                  {settings.showDatesRow && (
                                    <span className={`text-[10px] font-mono font-black ${isToday ? "text-white/80" : "text-slate/30"}`}>
                                      {format(day, "dd/MM")}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  {events.map((event, idx) => {
                                    const { label, className } = processEvent(event.summary || "");
                                    return (
                                      <div key={event.id || idx} className="bg-white p-3 rounded-2xl shadow-sm border border-brand-blue/5 group/event hover:border-brand-blue/20 transition-all">
                                        <div className={`flex items-center gap-2 text-[12px] font-black ${className}`}>
                                          <Clock size={12} className="opacity-50" />
                                          <span className="tracking-tight text-slate" dir="ltr">{getTimeString(event)}</span>
                                        </div>
                                        {label && (
                                          <div className="mt-2 pt-2 border-t border-slate/5">
                                            <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase inline-block ring-1 ring-slate/5 ${className}`}>
                                              {label}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {!hasEvents && (
                                    <div className="py-6 text-center">
                                      <span className="text-[10px] text-slate/20 font-black uppercase tracking-[0.2em]">مغلق</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div id="schedule" className="space-y-10" style={{ fontSize: `${settings.globalFontSize}%` }}>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-4">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-red rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-brand-red/30">
             <CalendarIcon size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-brand-blue tracking-tight">
              {viewMode === "today" ? "مواعيد اليوم المباشرة" : "الجدول الأسبوعي العام"}
            </h2>
            <p className="text-sm font-bold text-slate/40 mt-1 uppercase tracking-[0.3em]">Om Elnour Medical Center</p>
          </div>
        </div>
        <div className="bg-white px-8 py-4 rounded-[2rem] shadow-xl border border-slate/5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
          <span className="text-sm text-brand-blue font-black tracking-widest uppercase">
            {viewMode === "today" ? format(days[0], "dd MMMM yyyy", { locale: ar }) : `${days.length} أيام في العرض`}
          </span>
        </div>
      </header>

      {viewMode === "today" ? renderTodayTable() : renderWeeklyAccordions()}

      {/* Doctor Modal */}
      <AnimatePresence>
        {selectedDoctor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoctor(null)}
              className="absolute inset-0 bg-navy/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="bg-brand-blue p-12 text-white relative overflow-hidden">
                 {/* Decorative background logo */}
                <div className="absolute -right-10 -bottom-10 text-white/5 font-black text-[12rem] pointer-events-none select-none">ON</div>
                
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <div className="inline-flex px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4">التفاصيل الكاملة للأسبوع</div>
                    <h3 className="text-5xl font-black mb-4 flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                          <User size={32} />
                       </div>
                       {selectedDoctor.name}
                    </h3>
                    <div className="flex items-center gap-3 text-white/70 font-black text-lg">
                       <span className="w-2.5 h-2.5 rounded-full bg-brand-red"></span>
                       {selectedDoctor.specialty}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDoctor(null)}
                    className="w-16 h-16 flex items-center justify-center rounded-3xl bg-white/10 hover:bg-brand-red transition-all shadow-2xl group"
                  >
                    <X size={32} className="group-hover:rotate-90 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="p-12 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate/5">
                <div className="flex items-center gap-6 mb-10">
                   <div className="font-black text-brand-blue uppercase tracking-[0.2em] text-xs px-8 py-3 bg-white rounded-2xl shadow-lg border border-slate/5">جدول الأيام (السبت - الجمعة)</div>
                   <div className="h-px flex-1 bg-slate/10"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getWeekRangeForDate(days[0]).map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const normalizedSelectedName = normalizeDoctorName(selectedDoctor.name);
                    const events = groupedData[selectedDoctor.specialty]?.doctors[normalizedSelectedName]?.[dayKey] || [];
                    const isTargetToday = isSameDay(day, startOfToday());

                    return (
                      <div key={dayKey} className={`p-8 rounded-[2.5rem] border transition-all ${
                        isTargetToday ? "bg-white border-brand-red/40 shadow-2xl ring-1 ring-brand-red/10" : "bg-white border-slate/5 shadow-sm hover:shadow-md"
                      }`}>
                        <div className={`flex items-center justify-between mb-6 pb-6 border-b border-slate/5`}>
                           <div className="flex flex-col gap-1">
                             <span className="text-[13px] font-black text-brand-blue uppercase tracking-widest">{format(day, "EEEE", { locale: ar })}</span>
                             <span className="text-[10px] font-mono text-slate/40 font-black">{format(day, "dd MMMM yyyy", { locale: ar })}</span>
                           </div>
                           {isTargetToday && <span className="bg-brand-red text-white text-[9px] px-4 py-1.5 rounded-full font-black uppercase shadow-lg shadow-brand-red/30">اليوم</span>}
                        </div>
                        
                        <div className="space-y-4">
                          {events.length > 0 ? events.map((event, eIdx) => {
                            const { label, className } = processEvent(event.summary || "");
                            return (
                              <div key={eIdx} className="bg-slate/5 p-5 rounded-2xl border border-transparent hover:border-brand-blue/10 transition-all flex flex-col gap-3">
                                <div className="flex items-center gap-3 text-slate">
                                  <Clock size={16} className="text-brand-blue" />
                                  <span className="font-black text-sm" dir="ltr">{getTimeString(event)}</span>
                                </div>
                                {label && (
                                  <span className={`inline-block text-[10px] font-black px-4 py-1.5 rounded-xl border bg-white shadow-sm ${className}`}>
                                    {label}
                                  </span>
                                )}
                                {renderAdminControls(
                                  data.find(cal => cal.events.some(e => e.id === event.id))?.calendarId || "",
                                  event.id,
                                  event.summary
                                )}
                              </div>
                            );
                          }) : (
                             <div className="py-8 text-center opacity-10 font-black text-xs uppercase tracking-[0.3em] italic">مغلق</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-12 bg-white border-t border-slate/10 flex flex-wrap justify-center gap-6">
                <a 
                  href={`tel:${CONTACT_PHONE}`} 
                  className="px-12 py-5 bg-brand-red text-white rounded-3xl font-black text-sm shadow-2xl shadow-brand-red/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                >
                  <Phone size={22} className="stroke-[3]" />
                  احجز موعدك الآن
                </a>
                <button 
                  onClick={() => setSelectedDoctor(null)}
                  className="px-12 py-5 bg-slate/10 text-slate rounded-3xl font-black text-sm hover:bg-brand-blue hover:text-white transition-all shadow-md group"
                >
                   إغلاق التفاصيل
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
