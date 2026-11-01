/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { format, addDays, subDays, startOfToday, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Download, 
  Share2, 
  Phone, 
  User, 
  Loader2, 
  Check, 
  Clock, 
  Building2, 
  ShieldCheck,
  RotateCcw,
  Pencil
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toPng, toBlob } from "html-to-image";
import axios from "axios";
import { CalendarResponse, CalendarInfo } from "../types.ts";
import { 
  CALENDARS, 
  CONTACT_PHONE, 
  CONTACT_LANDLINE, 
  CONTACT_MOBILE, 
  CENTER_ADDRESS, 
  CENTER_NAME 
} from "../constants.ts";
import { stripStatusEmojis, normalizeArabicQuery } from "../lib/utils.ts";
import AppointmentTimeBadge from "./AppointmentTimeBadge.tsx";
import SpecialtyIcon, { getCleanSpecialtyName } from "./SpecialtyIcon.tsx";

interface CompactDoctorScheduleModalProps {
  selectedDoctor: { name: string; specialty: string } | null;
  onClose: () => void;
  initialData?: CalendarResponse[];
  calendars?: CalendarInfo[];
  isAdmin?: boolean;
  googleAccessToken?: string | null;
  onRefresh?: () => void;
  onEditEvent?: (event: any) => void;
}

export default function CompactDoctorScheduleModal({
  selectedDoctor,
  onClose,
  initialData = [],
  calendars = CALENDARS,
  isAdmin,
  googleAccessToken,
  onRefresh,
  onEditEvent,
}: CompactDoctorScheduleModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Week navigation state
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => startOfToday());
  const [weekData, setWeekData] = useState<CalendarResponse[]>(initialData);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (selectedDoctor) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedDoctor]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Calculate Saturday-to-Friday week with complete date range formatting (Part 4)
  const weekInfo = useMemo(() => {
    const dayOfWeek = currentWeekDate.getDay(); // 0 is Sun, 6 is Sat
    const diffToSat = (dayOfWeek + 1) % 7;
    const saturday = addDays(currentWeekDate, -diffToSat);
    const friday = addDays(saturday, 6);
    const days = eachDayOfInterval({ start: saturday, end: friday });

    // Format complete week range: e.g. "السبت 31 أكتوبر – الجمعة 6 نوفمبر 2026"
    const satStr = format(saturday, "EEEE d MMMM", { locale: ar });
    const friStr = format(friday, "EEEE d MMMM yyyy", { locale: ar });
    const rangeLabel = `${satStr} – ${friStr}`;

    return {
      saturday,
      friday,
      days,
      rangeLabel,
      satStr,
      friStr,
    };
  }, [currentWeekDate]);

  // Find specialty info (color, calendar ID)
  const specialtyInfo = useMemo(() => {
    if (!selectedDoctor) return null;
    const found = calendars.find(
      c => c.name.toLowerCase() === selectedDoctor.specialty.toLowerCase() ||
           selectedDoctor.specialty.toLowerCase().includes(c.name.toLowerCase()) ||
           c.name.toLowerCase().includes(selectedDoctor.specialty.toLowerCase())
    );
    return found || {
      id: "",
      name: selectedDoctor.specialty,
      backgroundColor: "#1E3A8A",
      color: "#1E3A8A",
    };
  }, [selectedDoctor, calendars]);

  // Fetch week data if navigated away or needed
  const fetchWeekSchedule = useCallback(async (saturday: Date, friday: Date) => {
    if (!selectedDoctor) return;
    setIsLoadingWeek(true);
    try {
      const startIso = new Date(format(saturday, "yyyy-MM-dd") + "T00:00:00").toISOString();
      const endIso = new Date(format(friday, "yyyy-MM-dd") + "T23:59:59").toISOString();

      // Determine which calendars to fetch: target doctor's calendar or all if not specific
      const targetCalendarIds = specialtyInfo?.id 
        ? [specialtyInfo.id] 
        : calendars.map(c => c.id);

      const response = await axios.post("/api/schedule", {
        calendarIds: targetCalendarIds,
        timeMin: startIso,
        timeMax: endIso,
      });

      setWeekData(response.data || []);
    } catch (err) {
      console.error("Failed to load doctor week schedule:", err);
    } finally {
      setIsLoadingWeek(false);
    }
  }, [selectedDoctor, specialtyInfo, calendars]);

  // When currentWeekDate changes, fetch fresh data if needed
  useEffect(() => {
    if (selectedDoctor) {
      fetchWeekSchedule(weekInfo.saturday, weekInfo.friday);
    }
  }, [currentWeekDate, selectedDoctor, fetchWeekSchedule, weekInfo.saturday, weekInfo.friday]);

  // Extract doctor events per day of week
  const doctorDaysEvents = useMemo(() => {
    if (!selectedDoctor) return [];

    const normTarget = normalizeArabicQuery(selectedDoctor.name);

    return weekInfo.days.map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const matchedEvents: any[] = [];

      weekData.forEach((calRes) => {
        (calRes.events || []).forEach((event: any) => {
          const dateStr = event.start?.dateTime || event.start?.date;
          if (!dateStr) return;
          const eventDateKey = format(parseISO(dateStr), "yyyy-MM-dd");
          if (eventDateKey !== dayKey) return;

          const summary = event.summary || "";
          const doctorPart = summary.split("-")[0].trim();
          const normDoctorPart = normalizeArabicQuery(doctorPart);

          if (
            normDoctorPart === normTarget ||
            normDoctorPart.includes(normTarget) ||
            normTarget.includes(normDoctorPart)
          ) {
            matchedEvents.push(event);
          }
        });
      });

      // Sort events by start time
      matchedEvents.sort((a, b) => {
        const timeA = a.start?.dateTime || a.start?.date || "";
        const timeB = b.start?.dateTime || b.start?.date || "";
        return timeA.localeCompare(timeB);
      });

      return {
        date: day,
        dayKey,
        isToday: isSameDay(day, startOfToday()),
        dayName: format(day, "EEEE", { locale: ar }),
        dayDateFormatted: format(day, "d MMMM", { locale: ar }),
        events: matchedEvents,
      };
    });
  }, [selectedDoctor, weekInfo.days, weekData]);

  // Event tag processor
  const getEventTag = (summary: string) => {
    const text = summary.toLowerCase();
    if (text.includes("❌")) return { label: "معتذر", badgeClass: "bg-red-50 text-red-700 border-red-200" };
    if (text.includes("✔️")) return { label: "طبيب بديل", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" };
    if (text.includes("⚠️")) return { label: "استثناء", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" };
    if (text.includes("❗")) return { label: "حجز مسبق", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" };
    return null;
  };

  // Week navigation handlers
  const handlePrevWeek = () => {
    setCurrentWeekDate(prev => subDays(prev, 7));
  };

  const handleNextWeek = () => {
    setCurrentWeekDate(prev => addDays(prev, 7));
  };

  const handleResetCurrentWeek = () => {
    setCurrentWeekDate(startOfToday());
  };

  const isCurrentWeek = useMemo(() => {
    const today = startOfToday();
    return today >= weekInfo.saturday && today <= weekInfo.friday;
  }, [weekInfo]);

  // Export to PNG function
  const handleSaveAsImage = async () => {
    if (!cardRef.current || !selectedDoctor) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      // Use html-to-image on cardRef (which contains only the clean schedule card)
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const cleanDocName = stripStatusEmojis(selectedDoctor.name).replace(/\s+/g, "_");
      const filename = `جدول_مواعيد_${cleanDocName}_${format(weekInfo.saturday, "yyyy-MM-dd")}.png`;

      // Trigger download
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to generate image:", err);
      alert("حدث خطأ أثناء حفظ الصورة. يرجى إعادة المحاولة.");
    } finally {
      setIsExporting(false);
    }
  };

  // Share schedule function (Web Share API with image file, or text fallback)
  const handleShareSchedule = async () => {
    if (!cardRef.current || !selectedDoctor) return;
    setIsExporting(true);

    try {
      const cleanDocName = stripStatusEmojis(selectedDoctor.name);
      const shareTitle = `جدول مواعيد د. ${cleanDocName} - مركز أم النور الطبي`;
      const shareText = `جدول مواعيد د. ${cleanDocName} (${selectedDoctor.specialty}) للأسبوع ${weekInfo.rangeLabel} بمركز أم النور الطبي. للحجز: ${CONTACT_PHONE}`;

      // Try generating Blob to share as file
      const blob = await toBlob(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "doctor-schedule.png", { type: "image/png" })] })) {
        const file = new File([blob], `جدول_مواعيد_${cleanDocName}.png`, { type: "image/png" });
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else if (navigator.share) {
        // Fallback to text Web Share
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        // Fallback to saving image and copying text
        await handleSaveAsImage();
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Share error:", err);
        // Fallback to direct download
        await handleSaveAsImage();
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Filter to ONLY days with actual registered appointments (Part 1.C & Part 2.B)
  const activeDaysEvents = useMemo(() => {
    return doctorDaysEvents.filter(dayItem => dayItem.events.length > 0);
  }, [doctorDaysEvents]);

  if (!selectedDoctor) return null;

  const pureDoctorName = stripStatusEmojis(selectedDoctor.name).split("•")[0].trim();
  const docDisplayName = pureDoctorName.startsWith("د.") || pureDoctorName.startsWith("د/") 
    ? pureDoctorName 
    : `د. ${pureDoctorName}`;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 overflow-hidden" 
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-schedule-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Window: Strict 3-part layout (Fixed Header, Fixed Week Nav, Single Scroll Body, Fixed Footer) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 z-10 flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
        >
          {/* ============================================================ */}
          {/* SECTION A: STREAMLINED COMPACT HEADER (shrink-0)             */}
          {/* Contains ONLY: Specialty Icon, Doctor Name, Specialty Name,  */}
          {/* and Close Button. No redundant clinic identity or logo!      */}
          {/* ============================================================ */}
          <div className="bg-white border-b border-slate-200/90 px-3.5 py-2.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2.5 shrink-0 z-20">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              {/* Specialty Icon */}
              <SpecialtyIcon 
                specialty={selectedDoctor.specialty} 
                size="md" 
                showBackground 
                className="shrink-0"
              />
              
              {/* Doctor Name & Specialty (Natural text wrapping, never truncated) */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 
                    id="doctor-schedule-modal-title"
                    className="text-sm sm:text-[15px] font-black text-navy break-words whitespace-normal text-right leading-tight"
                  >
                    {docDisplayName}
                  </h3>
                  {isLoadingWeek && (
                    <Loader2 size={13} className="animate-spin text-brand-blue shrink-0" />
                  )}
                </div>
                <div className="mt-0.5">
                  <span className="text-xs font-black text-brand-blue bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg inline-block shadow-2xs">
                    {selectedDoctor.specialty}
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="إغلاق النافذة"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-brand-red border border-slate-200 flex items-center justify-center transition-all shrink-0 active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* ============================================================ */}
          {/* SECTION B: COMPACT WEEK NAVIGATION BAR (shrink-0)            */}
          {/* Accessible at top, complete week date range without overflow */}
          {/* ============================================================ */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-1.5 shrink-0 z-10">
            {/* Prev Week Button */}
            <button
              onClick={handlePrevWeek}
              title="الأسبوع السابق"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-bold active:scale-95 shrink-0"
            >
              <ChevronRight size={15} />
              <span className="hidden xs:inline">السابق</span>
            </button>

            {/* Complete Week Date Range (Supports 2 lines naturally, never truncated) */}
            <div className="text-center min-w-0 px-1 sm:px-2 flex-1">
              <span className="text-[11px] sm:text-xs md:text-[13px] font-black text-brand-blue block leading-snug break-words">
                {weekInfo.rangeLabel}
              </span>
            </div>

            {/* Next Week Button & Reset */}
            <div className="flex items-center gap-1 shrink-0">
              {!isCurrentWeek ? (
                <button
                  onClick={handleResetCurrentWeek}
                  title="العودة للأسبوع الحالي"
                  className="px-2 py-1 text-[10px] sm:text-[11px] font-bold text-brand-red bg-brand-red/10 hover:bg-brand-red/20 rounded-md transition-colors flex items-center gap-1 active:scale-95"
                >
                  <RotateCcw size={11} />
                  <span>الحالي</span>
                </button>
              ) : (
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-md border border-emerald-200/60 whitespace-nowrap hidden xs:inline-block">
                  الأسبوع الحالي
                </span>
              )}

              <button
                onClick={handleNextWeek}
                title="الأسبوع القادم"
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-bold active:scale-95 shrink-0"
              >
                <span className="hidden xs:inline">التالي</span>
                <ChevronLeft size={15} />
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION C: SINGLE SCROLLABLE BODY (flex-1 min-h-0 overflow-y) */}
          {/* Only ONE vertical scroll container for appointments list     */}
          {/* ============================================================ */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 bg-slate-50/50">
            
            {/* Exportable schedule container (Target for toPng/toBlob) */}
            <div
              ref={cardRef}
              className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs font-sans"
              style={{ direction: "rtl" }}
            >
              {/* Compact Appointment List (Part 1.C: Horizontal rows, thin separators, no empty days) */}
              {activeDaysEvents.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {activeDaysEvents.map((dayItem) => (
                    <div
                      key={dayItem.dayKey}
                      className={`py-2.5 px-2 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                        dayItem.isToday 
                          ? "bg-amber-50/80 border-r-4 border-r-brand-red pr-2.5" 
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      {/* RIGHT: Day name & calendar date */}
                      <div className="min-w-[85px] sm:min-w-[110px] shrink-0 text-right">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs sm:text-[13px] font-black leading-tight ${dayItem.isToday ? "text-brand-red" : "text-navy"}`}>
                            {dayItem.dayName}
                          </span>
                          {dayItem.isToday && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-brand-red text-white rounded-full leading-none shrink-0">
                              اليوم
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold block leading-tight mt-0.5">
                          {dayItem.dayDateFormatted}
                        </span>
                      </div>

                      {/* LEFT: Appointment time badge(s) + status tags */}
                      <div className="flex-1 flex flex-wrap items-center justify-end gap-1.5 min-w-0">
                        {dayItem.events.map((event: any, evIdx: number) => {
                          const tag = getEventTag(event.summary || "");
                          const isCanceled = tag?.label === "معتذر";
                          return (
                            <div key={evIdx} className="flex items-center gap-1.5 p-1 bg-white/50 rounded-lg hover:bg-white transition-colors">
                              {!isCanceled && <AppointmentTimeBadge event={event} size="sm" />}
                              {tag && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${tag.badgeClass}`}>
                                  {tag.label}
                                </span>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEditEvent) onEditEvent(event);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-all cursor-pointer border border-amber-100"
                                  title="تعديل هذا الموعد"
                                >
                                  <Pencil size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Clean empty state (Part 1.C: Individual doctor hides empty days) */
                <div className="py-8 px-3 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 my-2">
                  <CalendarIcon size={22} className="mx-auto text-slate-400 mb-1.5" />
                  <p className="text-xs sm:text-sm font-black text-slate-700">
                    لا توجد مواعيد مسجلة للطبيب خلال هذا الأسبوع
                  </p>
                  <span className="text-[10.5px] text-slate-400 font-medium mt-1 block">
                    استخدم أزرار "السابق" و "التالي" بالأعلى للاطلاع على مواعيد الأسابيع الأخرى
                  </span>
                </div>
              )}

              {/* Discreet Footer for Exported Schedule Image */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[9.5px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Phone size={11} className="text-brand-blue" />
                  <span>للحجز: أرضي <strong className="text-slate-600" dir="ltr">{CONTACT_LANDLINE}</strong> | موبايل <strong className="text-slate-600" dir="ltr">{CONTACT_MOBILE}</strong></span>
                </div>
                <span className="font-mono">{format(new Date(), "yyyy/MM/dd")}</span>
              </div>
            </div>

          </div>

          {/* ============================================================ */}
          {/* SECTION D: FIXED BOTTOM ACTION BAR (shrink-0)                 */}
          {/* Compact font size & crisp icons for perfect mobile fit        */}
          {/* ============================================================ */}
          <div className="bg-white border-t border-slate-200/90 p-2 sm:p-3 shrink-0 z-20">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {/* Save as PNG Button */}
              <button
                onClick={handleSaveAsImage}
                disabled={isExporting}
                className="flex-1 min-w-0 px-2 py-1.5 sm:px-3 sm:py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                title="حفظ الجدول كصورة"
              >
                {isExporting ? (
                  <Loader2 size={12} className="animate-spin shrink-0" />
                ) : exportSuccess ? (
                  <Check size={12} className="text-emerald-300 shrink-0" />
                ) : (
                  <Download size={12} className="shrink-0" />
                )}
                <span className="truncate">{exportSuccess ? "تم الحفظ" : "حفظ كصورة"}</span>
              </button>

              {/* Share Schedule Button */}
              <button
                onClick={handleShareSchedule}
                disabled={isExporting}
                className="flex-1 min-w-0 px-2 py-1.5 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                title="مشاركة الجدول"
              >
                {shareSuccess ? (
                  <Check size={12} className="text-emerald-600 shrink-0" />
                ) : (
                  <Share2 size={12} className="shrink-0" />
                )}
                <span className="truncate">{shareSuccess ? "تمت المشاركة" : "مشاركة"}</span>
              </button>

              {/* Direct Booking Shortcut */}
              <a
                href={`tel:${CONTACT_LANDLINE}`}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-brand-red hover:bg-brand-red/90 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition-all shrink-0"
                title="الاتصال بالحجز"
              >
                <Phone size={12} className="shrink-0" />
                <span className="whitespace-nowrap">احجز الآن</span>
              </a>

              {/* Compact Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 sm:px-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                title="إغلاق"
                aria-label="إغلاق"
              >
                <X size={14} className="shrink-0" />
                <span className="hidden xs:inline">إغلاق</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
