/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Search, X, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parseISO, isSameDay, startOfToday } from "date-fns";
import { CalendarResponse } from "../types.ts";
import { CALENDARS } from "../constants.ts";
import { stripStatusEmojis, normalizeArabicQuery } from "../lib/utils.ts";
import AppointmentTimeBadge from "./AppointmentTimeBadge.tsx";
import SpecialtyIcon, { getCleanSpecialtyName, getVibrantSpecialtyColor } from "./SpecialtyIcon.tsx";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CalendarResponse[];
  onSelectDoctor: (name: string, specialty: string) => void;
  onSelectSpecialty: (specialty: string) => void;
  onSearchSubmit: (query: string) => void;
  loading: boolean;
  calendars?: any[];
}

export default function SearchModal({ 
  isOpen, 
  onClose, 
  data, 
  onSelectDoctor, 
  onSelectSpecialty, 
  onSearchSubmit,
  loading: _loading,
  calendars = CALENDARS
}: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchTerm.trim().length >= 2) {
      onSearchSubmit(searchTerm);
    }
  };

  const results = useMemo(() => {
    const q = normalizeArabicQuery(searchTerm);
    if (q.length < 2) return [];

    const matches: Array<{ 
      type: 'doctor' | 'specialty'; 
      name: string; 
      specialty?: string; 
      color?: string;
      todayEvent?: any;
      todayApologized?: boolean;
    }> = [];

    const today = startOfToday();

    // 1) Clinics (specialties)
    for (const cal of calendars || []) {
      const calName = cal?.name ?? "";
      if (normalizeArabicQuery(calName).includes(q)) {
        matches.push({
          type: "specialty",
          name: calName,
          specialty: calName,
          color: cal.backgroundColor || cal.color,
        });
      }
    }

    // 2) Doctors index from ALL events across ALL calendars
    const doctorIndex = new Map<
      string,
      { displayName: string; specialty: string; color?: string; todayEvent?: any; todayApologized?: boolean }
    >();

    for (const calRes of data || []) {
      const calInfo = (calendars || []).find((c) => c.id === calRes.calendarId);
      const specialtyName = calInfo?.name || "غير محدد";
      const color = calInfo?.backgroundColor || calInfo?.color;

      for (const event of calRes.events || []) {
        const summary = (event.summary || "").trim();
        if (!summary) continue;

        const doctorPart = summary.split("-")[0]?.trim() || "";
        const displayName = stripStatusEmojis(doctorPart).replace(/\s+/g, " ").trim();
        if (!displayName) continue;

        const key = normalizeArabicQuery(displayName);
        if (!key) continue;

        const dateStr = event.start?.dateTime || event.start?.date;
        const isToday = dateStr ? isSameDay(parseISO(dateStr), today) : false;
        const summaryLower = summary.toLowerCase();
        const isApologized = summaryLower.includes("معتذر") || summaryLower.includes("اعتذر") || summaryLower.includes("عتذر") || summaryLower.includes("❌");

        const existing = doctorIndex.get(key);
        if (!existing) {
          doctorIndex.set(key, {
            displayName,
            specialty: specialtyName,
            color,
            todayEvent: isToday ? event : undefined,
            todayApologized: isToday ? isApologized : false,
          });
        } else {
          if (!existing.todayEvent && isToday) {
            existing.todayEvent = event;
            existing.todayApologized = isApologized;
          }
        }
      }
    }

    // 3) Search doctors from the index (deduped globally)
    for (const [key, value] of doctorIndex.entries()) {
      if (key.includes(q)) {
        matches.push({
          type: "doctor",
          name: value.displayName,
          specialty: value.specialty,
          color: value.color,
          todayEvent: value.todayEvent,
          todayApologized: value.todayApologized,
        });
      }
    }

    // 4) Limit output
    return matches.slice(0, 15);
  }, [searchTerm, data, calendars]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4 sm:pt-24" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            className="relative bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 sm:p-4 border-b border-slate/5 bg-slate/5">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate/30" size={16} />
                <input
                  autoFocus
                  type="text"
                  placeholder="ابحث عن اسم طبيب أو عيادة..."
                  className="w-full bg-white pr-10 pl-24 py-2 sm:py-2.5 rounded-lg text-[13px] sm:text-[14px] font-black text-brand-blue placeholder:text-slate/20 outline-none ring-1 ring-slate/5 focus:ring-brand-blue/20 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchTerm.length > 0 && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="p-1 text-slate-400 hover:text-brand-red transition-colors cursor-pointer rounded-full"
                      title="مسح كلمة البحث (X)"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {searchTerm.trim().length >= 2 && (
                    <button 
                      onClick={() => onSearchSubmit(searchTerm)}
                      className="bg-brand-blue text-white px-2.5 py-1.5 rounded-md text-[10px] font-black hover:bg-brand-blue-dark transition-colors cursor-pointer"
                    >
                      بحث
                    </button>
                  )}
                  <button 
                    onClick={onClose}
                    className="p-1 px-1.5 text-slate-300 hover:text-brand-red transition-colors cursor-pointer border-r border-slate-200"
                    title="إغلاق النافذة"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {results.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate/40 uppercase tracking-[0.2em] px-1 mb-2">نتائج البحث</p>
                  {results.map((res, idx) => {
                    const cleanSpecName = getCleanSpecialtyName(res.specialty || res.name);
                    const vibrantColor = getVibrantSpecialtyColor(res.specialty || res.name, res.color);
                    const docDisplayName = res.name.startsWith("د.") || res.name.startsWith("د/") 
                      ? res.name 
                      : `د. ${res.name}`;

                    return (
                      <button
                        key={idx}
                        className="w-full flex flex-col p-3 rounded-2xl hover:bg-brand-blue/5 transition-all text-right group border border-slate-100 hover:border-brand-blue/20 bg-white shadow-2xs cursor-pointer"
                        onClick={() => {
                          if (res.type === 'doctor') {
                            onSelectDoctor(res.name, res.specialty || "");
                          } else {
                            onSelectSpecialty(res.name);
                          }
                          onClose();
                        }}
                      >
                        {/* Line 1: SpecialtyIcon + Doctor/Clinic Name + Chevron Arrow */}
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className="flex items-center gap-2.5">
                            <SpecialtyIcon
                              specialty={res.specialty || res.name}
                              size="sm"
                              showBackground
                              backgroundColor={res.color ? `${res.color}25` : undefined}
                            />
                            <h4 className="font-black text-navy text-[13px] sm:text-[14px] leading-tight">
                              {res.type === 'doctor' ? docDisplayName : cleanSpecName}
                            </h4>
                          </div>
                          <ChevronLeft size={16} className="text-slate-300 group-hover:text-brand-blue group-hover:-translate-x-0.5 transition-all shrink-0" />
                        </div>

                        {/* Line 2: Specialty Name with dark vibrant color */}
                        <div className="pr-[34px] mb-1.5">
                          <span 
                            className="text-[11px] font-black uppercase tracking-wide inline-block"
                            style={{ color: vibrantColor }}
                          >
                            {res.type === 'doctor' ? cleanSpecName : "عيادة تخصصية"}
                          </span>
                        </div>

                        {/* Line 3: Today's Appointments Only */}
                        <div className="pr-[34px] flex items-center gap-2">
                          {res.type === 'doctor' ? (
                            res.todayEvent ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(res as any).todayApologized ? (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200 shadow-2xs">
                                    معتذر اليوم ❌
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                                    اليوم
                                  </span>
                                )}
                                <AppointmentTimeBadge event={res.todayEvent} size="sm" showClockIcon={false} />
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400">
                                لا توجد مواعيد مسجلة اليوم
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400">
                              اضغط لمشاهدة جميع أطباء العيادة
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchTerm.trim().length >= 2 ? (
                <div className="text-center py-12 opacity-30">
                  <Search size={32} className="mx-auto mb-3" strokeWidth={1} />
                  <p className="font-black text-sm">لا توجد نتائج مطابقة</p>
                </div>
              ) : (
                <div className="text-center py-12 opacity-30">
                  <Search size={32} className="mx-auto mb-3" strokeWidth={1} />
                  <p className="font-black text-sm">ابدأ بالبحث عن طبيب أو عيادة...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
