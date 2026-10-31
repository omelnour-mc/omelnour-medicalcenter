/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  X, 
  Download, 
  Share2, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Calendar as CalendarIcon, 
  Clock, 
  Loader2, 
  Check,
  Building2,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toPng, toBlob } from "html-to-image";
import { CalendarResponse, CalendarInfo } from "../types.ts";
import { 
  CALENDARS, 
  CONTACT_LANDLINE, 
  CONTACT_MOBILE, 
  CENTER_ADDRESS, 
  CENTER_NAME,
  CENTER_NAME_SHORT
} from "../constants.ts";
import { stripStatusEmojis, normalizeArabicQuery } from "../lib/utils.ts";
import AppointmentTimeBadge from "./AppointmentTimeBadge.tsx";
import SpecialtyIcon, { getCleanSpecialtyName, getSpecialtyHeaderBg } from "./SpecialtyIcon.tsx";

interface DailyClinicPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  data: CalendarResponse[];
  calendars?: CalendarInfo[];
}

interface SpecialtyGroup {
  specialtyName: string;
  cleanName: string;
  color: string;
  doctors: Array<{
    doctorName: string;
    events: any[];
  }>;
}

export default function DailyClinicPosterModal({
  isOpen,
  onClose,
  selectedDate,
  data,
  calendars = CALENDARS,
}: DailyClinicPosterModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Prevent background body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Group events by specialty and doctor for the selected day
  const groupedSpecialties = useMemo(() => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const map: Record<string, { color: string; doctors: Record<string, any[]> }> = {};

    data.forEach((calRes) => {
      const calInfo = calendars.find((c) => c.id === calRes.calendarId);
      if (!calInfo) return;

      const specName = calInfo.name;
      if (!map[specName]) {
        map[specName] = {
          color: calInfo.backgroundColor || calInfo.color || "#0353a8",
          doctors: {},
        };
      }

      (calRes.events || []).forEach((event: any) => {
        const dateStr = event.start?.dateTime || event.start?.date;
        if (!dateStr) return;
        const evDateKey = format(parseISO(dateStr), "yyyy-MM-dd");
        if (evDateKey !== dateKey) return;

        const summary = event.summary || "طبيب غير مسمى";
        const rawDoctorName = summary.split("-")[0].trim();
        const cleanDocName = stripStatusEmojis(rawDoctorName);

        if (!map[specName].doctors[cleanDocName]) {
          map[specName].doctors[cleanDocName] = [];
        }
        map[specName].doctors[cleanDocName].push(event);
      });
    });

    const result: SpecialtyGroup[] = [];
    Object.entries(map).forEach(([specialtyName, { color, doctors }]) => {
      const docEntries = Object.entries(doctors).filter(([_, events]) => events.length > 0);
      if (docEntries.length > 0) {
        // Sort doctors inside specialty
        docEntries.sort((a, b) => a[0].localeCompare(b[0], "ar"));

        result.push({
          specialtyName,
          cleanName: getCleanSpecialtyName(specialtyName),
          color,
          doctors: docEntries.map(([doctorName, events]) => ({
            doctorName,
            // Sort events by time
            events: [...events].sort((a, b) => {
              const timeA = a.start?.dateTime || a.start?.date || "";
              const timeB = b.start?.dateTime || b.start?.date || "";
              return timeA.localeCompare(timeB);
            }),
          })),
        });
      }
    });

    // Sort specialties alphabetically
    result.sort((a, b) => a.cleanName.localeCompare(b.cleanName, "ar"));
    return result;
  }, [data, calendars, selectedDate]);

  // Full formatted Arabic date: e.g. "السبت 31 أكتوبر 2026"
  const formattedFullDate = useMemo(() => {
    return format(selectedDate, "EEEE d MMMM yyyy", { locale: ar });
  }, [selectedDate]);

  // Tag helper
  const getEventTag = (summary: string) => {
    const text = summary.toLowerCase();
    if (text.includes("❌")) return { label: "معتذر", badgeClass: "bg-red-50 text-red-700 border-red-200" };
    if (text.includes("✔️")) return { label: "طبيب بديل", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" };
    if (text.includes("⚠️")) return { label: "استثناء", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" };
    if (text.includes("❗")) return { label: "حجز مسبق", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" };
    return null;
  };

  // Adaptive Grid Configuration based on number of active specialties (Part 9C)
  const gridConfig = useMemo(() => {
    const count = groupedSpecialties.length;
    if (count <= 3) {
      return {
        columns: "grid-cols-1 sm:grid-cols-2",
        cardPadding: "p-4",
        fontSize: "text-sm",
        badgeSize: "md" as const,
        layoutHint: "spacious",
      };
    } else if (count <= 6) {
      return {
        columns: "grid-cols-1 sm:grid-cols-2",
        cardPadding: "p-3 sm:p-3.5",
        fontSize: "text-xs sm:text-sm",
        badgeSize: "sm" as const,
        layoutHint: "balanced",
      };
    } else {
      return {
        columns: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        cardPadding: "p-2.5 sm:p-3",
        fontSize: "text-xs",
        badgeSize: "sm" as const,
        layoutHint: "compact",
      };
    }
  }, [groupedSpecialties.length]);

  // Export Poster as PNG
  const handleSavePoster = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      // Ensure fonts and images are loaded
      if (document.fonts) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(posterRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const filename = `بوستر_مواعيد_عيادات_أم_النور_${dateStr}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to generate poster image:", err);
      alert("حدث خطأ أثناء حفظ بوستر اليوم. يرجى إعادة المحاولة.");
    } finally {
      setIsExporting(false);
    }
  };

  // Share Poster
  const handleSharePoster = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }

      const shareTitle = `جدول عيادات مركز أم النور الطبي - ${formattedFullDate}`;
      const shareText = `جدول مواعيد العيادات التخصصية والأطباء بمركز أم النور الطبي ليوم ${formattedFullDate}. للحجز: ${CONTACT_LANDLINE} | ${CONTACT_MOBILE}`;

      const blob = await toBlob(posterRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "om-elnour-daily-schedule.png", { type: "image/png" })] })) {
        const file = new File([blob], `جدول_عيادات_أم_النور_${format(selectedDate, "yyyy-MM-dd")}.png`, { type: "image/png" });
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        await handleSavePoster();
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Share poster error:", err);
        await handleSavePoster();
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 overflow-hidden" 
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-poster-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Container: Fixed Header, Scrollable Poster Canvas, Fixed Footer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 z-10 flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                <CalendarIcon size={18} />
              </div>
              <div>
                <h3 id="daily-poster-title" className="text-sm sm:text-base font-black text-navy leading-tight">
                  بوستر جدول مواعيد اليوم
                </h3>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold block">
                  {formattedFullDate}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="إغلاق النافذة"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-brand-red border border-slate-200 flex items-center justify-center transition-all shrink-0 active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Container containing the Dedicated Poster Element */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-5 bg-slate-100/70">
            
            {/* ============================================================ */}
            {/* DEDICATED POSTER CANVAS (Captured by toPng / toBlob)        */}
            {/* Adaptive layout inspired by official clinic poster reference */}
            {/* ============================================================ */}
            <div
              ref={posterRef}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-slate-200 overflow-hidden font-sans"
              style={{ direction: "rtl" }}
            >
              {/* Top Accent Gradient Ribbon */}
              <div className="h-2 bg-gradient-to-r from-brand-blue via-brand-red to-brand-blue w-full" />

              {/* Poster Header */}
              <div className="p-4 sm:p-6 bg-gradient-to-b from-blue-50/40 via-white to-white border-b border-slate-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
                  
                  {/* Logo & Identity */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center p-1.5 shrink-0">
                      <img 
                        src="/assets/om-elnour-logo.png" 
                        alt="شعار مركز أم النور الطبي" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-2xl font-black text-navy leading-tight tracking-tight">
                        مركز أم النور الطبي
                      </h1>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                        <span className="text-xs font-black text-brand-red">العصافرة قبلي</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-brand-blue">قسم العيادات التخصصية</span>
                      </div>
                    </div>
                  </div>

                  {/* Selected Date Badge */}
                  <div className="bg-white border-2 border-brand-blue/20 rounded-2xl px-4 py-2 shadow-2xs text-center">
                    <span className="text-[10px] font-black text-brand-blue uppercase tracking-wider block">
                      جدول مواعيد يوم
                    </span>
                    <span className="text-sm sm:text-base font-black text-navy block mt-0.5">
                      {formattedFullDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Poster Content: Clinics & Doctors Adaptive Grid */}
              <div className="p-4 sm:p-6">
                {groupedSpecialties.length > 0 ? (
                  <div className={`grid ${gridConfig.columns} gap-3 sm:gap-4`}>
                    {groupedSpecialties.map((specGroup, sIdx) => (
                      <div
                        key={sIdx}
                        className={`rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between overflow-hidden`}
                      >
                        {/* Clinic Header */}
                        <div 
                          className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-200/80"
                          style={{ backgroundColor: getSpecialtyHeaderBg(specGroup.specialtyName, specGroup.color), borderRightWidth: "4px", borderRightColor: specGroup.color }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <SpecialtyIcon 
                              specialty={specGroup.specialtyName} 
                              size="sm" 
                              showBackground
                              className="shrink-0"
                            />
                            <h4 className="font-black text-xs sm:text-sm text-navy truncate">
                              عيادة {specGroup.cleanName}
                            </h4>
                          </div>

                          <span 
                            className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/80 border border-slate-200/60 text-slate-700 shrink-0"
                          >
                            {specGroup.doctors.length} {specGroup.doctors.length === 1 ? "طبيب" : "أطباء"}
                          </span>
                        </div>

                        {/* Doctors & Appointments List */}
                        <div className="p-3 space-y-2.5 flex-1">
                          {specGroup.doctors.map((doc, dIdx) => (
                            <div 
                              key={dIdx}
                              className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-150/70 space-y-1.5"
                            >
                              {/* Doctor Name (Full natural wrapping, never truncated) */}
                              <div className="flex items-center justify-between gap-1">
                                {(() => {
                                  const pure = doc.doctorName.split("•")[0].trim();
                                  const disp = pure.startsWith("د.") || pure.startsWith("د/") ? pure : `د. ${pure}`;
                                  return (
                                    <span className="font-extrabold text-xs sm:text-[13px] text-navy break-words whitespace-normal text-right leading-snug">
                                      {disp}
                                    </span>
                                  );
                                })()}
                              </div>

                              {/* Appointment Badges */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {doc.events.map((event, eIdx) => {
                                  const tag = getEventTag(event.summary || "");
                                  return (
                                    <div key={eIdx} className="flex items-center gap-1">
                                      <AppointmentTimeBadge event={event} size="sm" />
                                      {tag && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${tag.badgeClass}`}>
                                          {tag.label}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Clock size={36} className="mx-auto text-slate-400 mb-3" />
                    <h3 className="text-base font-black text-navy">
                      لا توجد عيادات مسجلة لهذا اليوم
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      لم يتم تسجيل أي مواعيد أطباء في جدول هذا اليوم ({formattedFullDate})
                    </p>
                  </div>
                )}
              </div>

              {/* Poster Footer: Official Contact Details (Part 8) */}
              <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-right">
                  
                  {/* Address */}
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-slate-500 block">العنوان</span>
                      <span className="text-xs font-black text-navy leading-tight block">{CENTER_ADDRESS}</span>
                    </div>
                  </div>

                  {/* Landline */}
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                      <Phone size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-slate-500 block">تليفون أرضي</span>
                      <span className="text-xs font-black text-navy leading-tight block" dir="ltr">{CONTACT_LANDLINE}</span>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-brand-red flex items-center justify-center shrink-0">
                      <Smartphone size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-slate-500 block">موبايل للحجز</span>
                      <span className="text-xs font-black text-brand-red leading-tight block" dir="ltr">{CONTACT_MOBILE}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-strip: timestamp & quality note */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[9px] text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                    <span>مركز أم النور الطبي • برجاء الحضور قبل الموعد بنصف ساعة</span>
                  </div>
                  <span>تاريخ الاستخراج: {format(new Date(), "yyyy/MM/dd HH:mm")}</span>
                </div>
              </div>
            </div>
            {/* ============================================================ */}
            {/* END DEDICATED POSTER CANVAS                                  */}
            {/* ============================================================ */}

          </div>

          {/* Modal Action Bar */}
          <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shrink-0 z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              {/* Save PNG Button */}
              <button
                onClick={handleSavePoster}
                disabled={isExporting}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl text-xs font-black shadow-2xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : exportSuccess ? (
                  <Check size={15} className="text-emerald-300" />
                ) : (
                  <Download size={15} />
                )}
                <span>{exportSuccess ? "تم حفظ البوستر" : "حفظ جدول اليوم كصورة"}</span>
              </button>

              {/* Share Poster Button */}
              <button
                onClick={handleSharePoster}
                disabled={isExporting}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {shareSuccess ? (
                  <Check size={15} className="text-emerald-600" />
                ) : (
                  <Share2 size={15} />
                )}
                <span>{shareSuccess ? "تمت المشاركة" : "مشاركة جدول اليوم"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <a
                href={`tel:${CONTACT_LANDLINE}`}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-brand-red hover:bg-brand-red/90 text-white rounded-xl text-xs font-black shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Phone size={14} />
                <span>اتصل الآن</span>
              </a>

              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
