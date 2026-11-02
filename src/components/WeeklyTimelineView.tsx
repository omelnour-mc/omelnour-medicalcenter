/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { format, isSameDay, startOfToday, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { Search, Filter, Calendar as CalendarIcon, Pencil, ChevronLeft, Eye, EyeOff, Check, User, X } from "lucide-react";
import { CalendarResponse, AppSettings } from "../types.ts";
import { stripStatusEmojis, normalizeArabicQuery, extractCleanDoctorName } from "../lib/utils.ts";
import AppointmentTimeBadge from "./AppointmentTimeBadge.tsx";
import SpecialtyIcon, { getCleanSpecialtyName, getVibrantSpecialtyColor, getSpecialtyHeaderBg } from "./SpecialtyIcon.tsx";
import { FilterState } from "./FilterSidebar.tsx";

interface WeeklyTimelineViewProps {
  data: CalendarResponse[];
  days: Date[];
  calendars: any[];
  filters?: FilterState;
  onSelectDoctor: (doctor: { name: string; specialty: string }) => void;
  isAdmin?: boolean;
  onEditEvent?: (event: any, calendarId: string) => void;
  settings: AppSettings;
}

function processEvent(summary: string) {
  const textToSearch = (summary || "").toLowerCase();
  if (textToSearch.includes("❌") || textToSearch.includes("معتذر") || textToSearch.includes("اعتذر")) {
    return { label: "معتذر ❌", isCanceled: false, className: "text-brand-red border-brand-red/30 bg-brand-red/10 font-black shadow-2xs" };
  }
  if (textToSearch.includes("✔️") || textToSearch.includes("بديل")) return { label: "بديل ✔️", isCanceled: false, className: "text-brand-blue border-brand-blue/30 bg-brand-blue/10 font-black shadow-2xs" };
  if (textToSearch.includes("⚠️") || textToSearch.includes("استثناء")) return { label: "استثناء ⚠️", isCanceled: false, className: "text-amber-800 border-amber-500/40 bg-amber-100/90 font-black shadow-2xs" };
  if (textToSearch.includes("🟢") || textToSearch.includes("مواعيد عادية")) return { label: null, isCanceled: false, className: "" };
  if (textToSearch.includes("❗") || textToSearch.includes("حجز مسبق")) return { label: "حجز مسبق ❗", isCanceled: false, className: "text-brand-blue-dark border-brand-blue-dark/30 bg-brand-blue-dark/10 font-black shadow-2xs" };
  return { label: null, isCanceled: false, className: "" };
}

export default function WeeklyTimelineView({
  data,
  days,
  calendars,
  filters,
  onSelectDoctor,
  isAdmin,
  onEditEvent,
  settings: _settings,
}: WeeklyTimelineViewProps) {
  const [localDoctorQuery, setLocalDoctorQuery] = useState("");
  const [disabledClinics, setDisabledClinics] = useState<Set<string>>(new Set());

  // Get all unique clinic names available in calendars
  const allClinicNames = useMemo(() => {
    return calendars.map((c) => c.name);
  }, [calendars]);

  // Set of active (visible) clinics
  const activeClinicsSet = useMemo(() => {
    return new Set(allClinicNames.filter((c) => !disabledClinics.has(c)));
  }, [disabledClinics, allClinicNames]);

  const toggleClinicFilter = (clinicName: string) => {
    setDisabledClinics((prev) => {
      const next = new Set(prev);
      if (next.has(clinicName)) {
        next.delete(clinicName);
      } else {
        next.add(clinicName);
      }
      return next;
    });
  };

  const showAllClinics = () => {
    setDisabledClinics(new Set());
  };

  const hideAllClinics = () => {
    setDisabledClinics(new Set(allClinicNames));
  };

  // Group data by Clinic -> Doctor -> DateKey -> events[]
  const timelineData = useMemo(() => {
    const root: Record<
      string,
      {
        color: string;
        doctors: Record<string, { rawName: string; cleanName: string; dayEvents: Record<string, any[]> }>;
      }
    > = {};

    data.forEach((calRes) => {
      const calInfo = calendars.find((c) => c.id === calRes.calendarId);
      if (!calInfo) return;

      const specialtyName = calInfo.name;
      if (!root[specialtyName]) {
        root[specialtyName] = {
          color: calInfo.backgroundColor || calInfo.color || "#3B82F6",
          doctors: {},
        };
      }

      calRes.events.forEach((event) => {
        const title = event.summary || "طبيب غير مسمى";
        const cleanDocPart = extractCleanDoctorName(title).split("•")[0].trim();

        // Local or external doctor name filter
        const query = localDoctorQuery || filters?.doctorQuery || "";
        if (query) {
          const q = normalizeArabicQuery(query);
          if (q && !normalizeArabicQuery(cleanDocPart).includes(q)) {
            return;
          }
        }

        const dateStr = event.start.dateTime || event.start.date;
        if (!dateStr) return;
        const eventDate = parseISO(dateStr);
        const dateKey = format(eventDate, "yyyy-MM-dd");

        const docKey = cleanDocPart.toLowerCase();

        if (!root[specialtyName].doctors[docKey]) {
          root[specialtyName].doctors[docKey] = {
            rawName: cleanDocPart,
            cleanName: cleanDocPart.startsWith("د.") || cleanDocPart.startsWith("د/") ? cleanDocPart : `د. ${cleanDocPart}`,
            dayEvents: {},
          };
        }

        if (!root[specialtyName].doctors[docKey].dayEvents[dateKey]) {
          root[specialtyName].doctors[docKey].dayEvents[dateKey] = [];
        }

        root[specialtyName].doctors[docKey].dayEvents[dateKey].push(event);
      });
    });

    return root;
  }, [data, calendars, filters, localDoctorQuery]);

  const activeToday = startOfToday();

  return (
    <div className="space-y-4">
      {/* Interactive Controls & Clinic Show/Hide Filter Chips */}
      <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl">
              <Filter size={16} />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm text-navy">تصفية وإخفاء عيادات التايم لاين</h3>
              <p className="text-[10px] text-slate-400 font-semibold">استخدم أزرار "عرض الكل" و "إخفاء الكل" أو انقر على العيادة للتصفية</p>
            </div>
          </div>

          {/* Quick Doctor Search Box with Clear 'X' Button */}
          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localDoctorQuery}
              onChange={(e) => setLocalDoctorQuery(e.target.value)}
              placeholder="البحث السريع عن طبيب..."
              className="w-full pr-8 pl-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-brand-blue focus:bg-white transition-all placeholder:text-slate-400"
            />
            {localDoctorQuery && (
              <button
                onClick={() => setLocalDoctorQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-red p-1 rounded-full transition-colors cursor-pointer"
                title="مسح البحث (X)"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Clinic Filter Chips & Show All / Hide All Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={showAllClinics}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
              disabledClinics.size === 0
                ? "bg-brand-blue text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            title="إظهار جميع العيادات في الجدول"
          >
            <Check size={12} />
            <span>عرض الكل ({allClinicNames.length})</span>
          </button>

          <button
            onClick={hideAllClinics}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
              disabledClinics.size === allClinicNames.length
                ? "bg-navy text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            title="إخفاء جميع العيادات من الجدول"
          >
            <EyeOff size={12} />
            <span>إخفاء الكل</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {allClinicNames.map((clinic) => {
            const isVisible = activeClinicsSet.has(clinic);
            const calObj = calendars.find((c) => c.name === clinic);
            const color = calObj?.backgroundColor || calObj?.color || "#3B82F6";
            const darkColor = getVibrantSpecialtyColor(clinic, color);

            return (
              <button
                key={clinic}
                onClick={() => toggleClinicFilter(clinic)}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isVisible
                    ? "bg-white shadow-2xs border-slate-300/80"
                    : "bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60 hover:opacity-100"
                }`}
                style={{
                  borderColor: isVisible ? `${darkColor}40` : undefined,
                  color: isVisible ? darkColor : undefined,
                }}
              >
                <SpecialtyIcon specialty={clinic} size="sm" />
                <span>{getCleanSpecialtyName(clinic)}</span>
                {isVisible ? <Eye size={12} className="opacity-70" /> : <EyeOff size={12} className="opacity-70" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Timeline Grid Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-black select-none">
                {/* Sticky Header Column 1: Clinic / Doctor */}
                <th className="p-3 sticky right-0 bg-slate-100 border-l border-slate-200 min-w-[170px] sm:min-w-[210px] shadow-2xs z-10">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-brand-blue" />
                    <span>العيادة والطبيب</span>
                  </div>
                </th>

                {/* 7 Days Columns Header */}
                {days.map((day) => {
                  const isToday = isSameDay(day, activeToday);
                  return (
                    <th
                      key={day.toISOString()}
                      className={`p-2.5 text-center min-w-[110px] sm:min-w-[130px] border-l border-slate-200/70 transition-colors ${
                        isToday ? "bg-amber-100/90 text-brand-red font-black" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className={`text-xs font-black ${isToday ? "text-brand-red" : "text-navy"}`}>
                          {format(day, "EEEE", { locale: ar })}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                            isToday ? "bg-brand-red text-white font-bold" : "text-slate-400 bg-white/80 border border-slate-200/60"
                          }`}
                        >
                          {format(day, "d MMMM", { locale: ar })}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {Object.entries(timelineData).map(([specialty, { color, doctors }]) => {
                if (!activeClinicsSet.has(specialty)) return null;

                const docList = Object.values(doctors);
                if (docList.length === 0) return null;

                const darkColor = getVibrantSpecialtyColor(specialty, color);

                return (
                  <React.Fragment key={specialty}>
                    {/* Clinic Group Header Row */}
                    <tr
                      className="border-t-2 border-slate-200"
                      style={{ backgroundColor: getSpecialtyHeaderBg(specialty, color) }}
                    >
                      <td
                        colSpan={days.length + 1}
                        className="py-2 px-3 font-black text-xs border-r-4"
                        style={{ borderRightColor: darkColor, color: darkColor }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SpecialtyIcon specialty={specialty} size="sm" showBackground />
                            <span>{getCleanSpecialtyName(specialty)}</span>
                            <span className="text-[10px] font-bold opacity-80">({docList.length} أطباء)</span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Doctor Rows with Alternating Row Colors */}
                    {docList.map((docItem, idx) => {
                      const cleanDoc = stripStatusEmojis(docItem.rawName).split("•")[0].trim();
                      const docNameDisplay = cleanDoc.startsWith("د.") || cleanDoc.startsWith("د/") ? cleanDoc : `د. ${cleanDoc}`;
                      const isEven = idx % 2 === 0;
                      const rowBgClass = isEven ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/80 hover:bg-blue-50/40";
                      const stickyCellBg = isEven ? "bg-white" : "bg-slate-100/90";

                      const activeTodayKey = format(activeToday, "yyyy-MM-dd");
                      const todayEventsForDoc = docItem.dayEvents[activeTodayKey] || [];
                      const isApologizedToday = todayEventsForDoc.some(e => {
                        const sum = (e.summary || "").toLowerCase();
                        return sum.includes("❌") || sum.includes("معتذر") || sum.includes("اعتذر");
                      });
                      const isExceptionToday = todayEventsForDoc.some(e => {
                        const sum = (e.summary || "").toLowerCase();
                        return sum.includes("⚠️") || sum.includes("استثناء");
                      });

                      return (
                        <tr key={idx} className={`${rowBgClass} transition-colors`}>
                          {/* Sticky Right Cell: Doctor Info */}
                          <td className={`p-2.5 sticky right-0 ${stickyCellBg} border-l border-r-2 border-slate-200 shadow-2xs z-10 hover:bg-blue-50/30`}>
                            <button
                              onClick={() => onSelectDoctor({ name: cleanDoc, specialty })}
                              className="flex items-center gap-2 text-right group/doc w-full cursor-pointer"
                              title={`عرض جدول مواعيد ${docNameDisplay}`}
                            >
                              <SpecialtyIcon specialty={specialty} size="sm" showBackground className="shrink-0 group-hover/doc:scale-110 transition-transform" />
                              <div className="min-w-0 flex-1">
                                <h4 className="font-black text-navy text-xs group-hover/doc:text-brand-blue transition-colors leading-snug truncate">
                                  {docNameDisplay}
                                </h4>
                                <span className="text-[9.5px] text-slate-400 font-medium leading-none block truncate">
                                  {getCleanSpecialtyName(specialty)}
                                </span>
                              </div>
                              <ChevronLeft size={12} className="text-slate-300 group-hover/doc:text-brand-blue transition-colors shrink-0" />
                            </button>
                          </td>

                          {/* 7 Day Schedule Cells */}
                          {days.map((day) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const dayEvents = docItem.dayEvents[dateKey] || [];
                            const isToday = isSameDay(day, activeToday);

                            return (
                              <td
                                key={dateKey}
                                className={`p-2 text-center border-l border-slate-100 align-top transition-colors ${
                                  isToday ? "bg-amber-50/40" : ""
                                }`}
                              >
                                {dayEvents.length > 0 ? (
                                  <div className="flex flex-col gap-1 items-center justify-center">
                                    {dayEvents.map((ev, eIdx) => {
                                      const { label, isCanceled, className } = processEvent(ev.summary || "");
                                      return (
                                        <div key={ev.id || eIdx} className="w-full flex flex-col items-center gap-1">
                                          {!isCanceled && (
                                            <AppointmentTimeBadge
                                              event={ev}
                                              size="sm"
                                              layout="stacked"
                                              className="w-full justify-center"
                                            />
                                          )}
                                          {label && (
                                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border w-full text-center ${className}`}>
                                              {label}
                                            </span>
                                          )}
                                          {isAdmin && onEditEvent && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const calObj = calendars.find(
                                                  (c) => c.name === specialty || c.id === specialty
                                                );
                                                onEditEvent(ev, ev.calendarId || (calObj ? calObj.id : calendars[0].id));
                                              }}
                                              className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[8.5px] font-bold transition-all flex items-center justify-center gap-0.5 w-full cursor-pointer"
                                              title="تعديل الموعد"
                                            >
                                              <Pencil size={10} />
                                              <span>تعديل</span>
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="py-2 text-center select-none">
                                    <span className="text-slate-300 font-bold text-sm">—</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {activeClinicsSet.size === 0 && (
                <tr>
                  <td colSpan={days.length + 1} className="py-12 text-center text-slate-400 font-bold">
                    تم إخفاء جميع العيادات. اضغط على "عرض الكل" بالأعلى لإعادة إظهار الجداول.
                  </td>
                </tr>
              )}

              {activeClinicsSet.size > 0 && Object.keys(timelineData).length === 0 && (
                <tr>
                  <td colSpan={days.length + 1} className="py-12 text-center text-slate-400 font-bold">
                    لا توجد بيانات مواعيد مطابقة للتصفية الحالية
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
