/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { Search, User, Stethoscope, ChevronRight, ArrowRight, Loader2 } from "lucide-react";
import { CalendarResponse } from "../types.ts";
import { CALENDARS } from "../constants.ts";
import { stripStatusEmojis, normalizeArabicQuery } from "../lib/utils.ts";
import AppointmentTimeBadge from "./AppointmentTimeBadge.tsx";

interface SearchResultsViewProps {
  query: string;
  onBack: () => void;
  onSelectDoctor: (name: string, specialty: string) => void;
  onSelectSpecialty: (specialty: string) => void;
  allData: CalendarResponse[];
  loading: boolean;
  calendars?: any[];
}

interface SearchResultItem {
  type: "doctor" | "specialty";
  name: string;
  specialty?: string;
  color?: string;
  events?: any[];
}

export default function SearchResultsView({
  query,
  onBack,
  onSelectDoctor,
  onSelectSpecialty,
  allData,
  loading,
  calendars = CALENDARS,
}: SearchResultsViewProps) {
  const results = useMemo(() => {
    if (query.trim().length < 1) return [];

    const normQuery = normalizeArabicQuery(query);
    const matches: SearchResultItem[] = [];

    // 1) Search Specialties (Clinics)
    calendars.forEach((cal) => {
      const normCalName = normalizeArabicQuery(cal.name);
      if (normCalName.includes(normQuery)) {
        const calData = allData.find((c) => c.calendarId === cal.id);
        const calEvents = (calData?.events || []).slice(0, 3);
        matches.push({
          type: "specialty",
          name: cal.name,
          color: cal.backgroundColor || cal.color,
          events: calEvents,
        });
      }
    });

    // 2) Search Doctors across allData
    const seenDoctors = new Set<string>();
    allData.forEach((calRes) => {
      const calInfo = calendars.find((c) => c.id === calRes.calendarId);
      calRes.events.forEach((event) => {
        const title = (event.summary || "").trim();
        if (!title) return;

        const rawDoctorNameWithEmoji = title.split("-")[0].trim();
        const rawDoctorName = stripStatusEmojis(rawDoctorNameWithEmoji);
        const normDoctorName = normalizeArabicQuery(rawDoctorName);

        if (normDoctorName && normDoctorName.includes(normQuery) && !seenDoctors.has(normDoctorName)) {
          // Gather events for this doctor
          const docEvents = allData
            .flatMap((c) => c.events)
            .filter((e) => {
              const eDoctor = stripStatusEmojis((e.summary || "").split("-")[0]?.trim() || "");
              const eNorm = normalizeArabicQuery(eDoctor);
              return eNorm === normDoctorName;
            })
            .slice(0, 3);

          matches.push({
            type: "doctor",
            name: rawDoctorName,
            specialty: calInfo?.name || "غير محدد",
            color: calInfo?.backgroundColor || calInfo?.color,
            events: docEvents,
          });
          seenDoctors.add(normDoctorName);
        }
      });
    });

    return matches;
  }, [query, allData, calendars]);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate/10 shadow-xl overflow-hidden min-h-[400px] animate-in fade-in slide-in-from-bottom-4">
      <div className="p-4 sm:p-5 bg-slate/5 border-b border-slate/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-lg transition-all text-slate hover:text-brand-blue"
            title="رجوع"
          >
            <ArrowRight size={18} />
          </button>
          <div className="text-right">
            <h2 className="text-base sm:text-lg font-black text-navy leading-tight">نتائج البحث: "{query}"</h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate/40 uppercase tracking-widest mt-0.5">
              تم العثور على {results.length} نتيجة
            </p>
          </div>
        </div>
        {loading && <Loader2 className="animate-spin text-brand-blue" size={18} />}
      </div>

      <div className="p-3 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-brand-blue" size={32} />
            <p className="font-bold text-slate/40 text-xs text-center">جاري البحث في كافة العيادات والمواعيد المتاحة...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {results.map((res, idx) => (
              <button
                key={idx}
                className="flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl bg-slate/5 hover:bg-white hover:shadow-lg hover:shadow-slate/10 transition-all text-right group border border-transparent hover:border-brand-blue/15 gap-3"
                onClick={() => {
                  if (res.type === "doctor") {
                    onSelectDoctor(res.name, res.specialty || "");
                  } else {
                    onSelectSpecialty(res.name);
                  }
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                        res.type === "doctor"
                          ? "bg-brand-blue-light text-brand-blue"
                          : "bg-brand-red-light text-brand-red"
                      }`}
                    >
                      {res.type === "doctor" ? <User size={20} className="sm:size-6" /> : <Stethoscope size={20} className="sm:size-6" />}
                    </div>
                    <div>
                      <h4 className="font-black text-navy text-[13px] sm:text-[15px]">{res.name}</h4>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate/40 uppercase tracking-widest mt-0.5">
                        {res.type === "doctor" ? res.specialty : "عيادة تخصصية"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate/20 group-hover:text-brand-blue transition-colors shrink-0" />
                </div>

                {/* Appointment Times with Time-of-Day Badges */}
                {res.events && res.events.length > 0 && (
                  <div className="w-full pt-2 border-t border-slate/10 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate/40 ml-1">المواعيد:</span>
                    {res.events.map((evt, eIdx) => (
                      <AppointmentTimeBadge key={eIdx} event={evt} size="sm" />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-20">
            <Search size={48} className="mx-auto mb-4" strokeWidth={1} />
            <p className="font-black text-lg">لا توجد نتائج مطابقة</p>
            <p className="text-[10px] font-bold mt-1">تأكد من كتابة الاسم بشكل صحيح أو ابحث عن عيادة</p>
          </div>
        )}
      </div>
    </div>
  );
}
