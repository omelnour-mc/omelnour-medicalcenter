/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, ChevronLeft, Phone, Home, Calendar, MapPin, Search, Filter, Settings, Stethoscope, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CONTACT_LANDLINE, CONTACT_MOBILE, CENTER_NAME, CENTER_ADDRESS, CALENDARS } from "../constants.ts";
import { CalendarInfo } from "../types.ts";
import SpecialtyIcon, { getCleanSpecialtyName } from "./SpecialtyIcon.tsx";

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenFilters: () => void;
  onOpenAdmin: () => void;
  calendars?: CalendarInfo[];
  onSelectSpecialty?: (specialtyName: string) => void;
  onSelectViewMode?: (mode: "today" | "week") => void;
}

export default function NavDrawer({ 
  isOpen, 
  onClose, 
  onOpenSearch, 
  onOpenFilters, 
  onOpenAdmin,
  calendars = CALENDARS,
  onSelectSpecialty,
  onSelectViewMode,
}: NavDrawerProps) {
  
  const mainNavItems = [
    { 
      label: "الرئيسية", 
      icon: Home, 
      onClick: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    { 
      label: "جدول مواعيد اليوم", 
      icon: Calendar, 
      onClick: () => {
        if (onSelectViewMode) onSelectViewMode("today");
        const element = document.getElementById("schedule");
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }
    },
    { 
      label: "الجدول الأسبوعي العام", 
      icon: Calendar, 
      onClick: () => {
        if (onSelectViewMode) onSelectViewMode("week");
        const element = document.getElementById("schedule");
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }
    },
    { label: "البحث عن طبيب", icon: Search, onClick: onOpenSearch },
    { label: "تصفية العيادات", icon: Filter, onClick: onOpenFilters },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1001]" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/60 backdrop-blur-xs"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            className="absolute top-0 right-0 h-full w-full max-w-xs sm:max-w-sm bg-white shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Professional Header */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gradient-to-r from-brand-blue-dark via-brand-blue to-navy text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  <img 
                    src="/assets/om-elnour-logo.png" 
                    alt="مركز أم النور الطبي" 
                    className="h-full w-auto object-contain" 
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs sm:text-sm leading-tight text-white truncate">
                    {CENTER_NAME}
                  </h3>
                  <span className="text-[10px] text-white/80 font-semibold block leading-tight mt-0.5">
                    قسم العيادات التخصصية • العصافرة قبلي
                  </span>
                </div>
              </div>

              <button 
                onClick={onClose}
                aria-label="إغلاق القائمة"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0 active:scale-95 border border-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Single Smooth Scroll Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-4 space-y-4">
              
              {/* Main Navigation Links */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2 px-1">
                  القائمة الرئيسية
                </span>
                <div className="space-y-1">
                  {mainNavItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        item.onClick();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all text-right group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue group-hover:bg-brand-blue group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                          <item.icon size={16} />
                        </div>
                        <span className="font-black text-navy text-xs sm:text-sm group-hover:text-brand-blue transition-colors truncate">
                          {item.label}
                        </span>
                      </div>
                      <ChevronLeft size={14} className="text-slate-300 group-hover:text-brand-blue transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Specialty / Clinic Jump Links */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2 px-1">
                  تصفح العيادات التخصصية
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {calendars.map((cal) => {
                    const cleanName = getCleanSpecialtyName(cal.name);
                    return (
                      <button
                        key={cal.id}
                        onClick={() => {
                          if (onSelectSpecialty) {
                            onSelectSpecialty(cal.name);
                          } else if (onSelectViewMode) {
                            onSelectViewMode("week");
                          }
                          onClose();
                        }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50/60 transition-colors text-right group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SpecialtyIcon specialty={cal.name} size="sm" showBackground className="shrink-0" />
                          <span className="text-xs font-black text-slate-700 group-hover:text-brand-blue transition-colors truncate">
                            {cleanName}
                          </span>
                        </div>
                        <ChevronLeft size={12} className="text-slate-300 group-hover:text-brand-blue transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Professional Contact Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200/80 shrink-0 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <a
                  href={`tel:${CONTACT_LANDLINE}`}
                  className="p-2 bg-white hover:bg-blue-50 border border-slate-200/80 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] font-black text-brand-blue active:scale-95 shadow-2xs"
                  title="اتصل بالتليفون الأرضي"
                >
                  <Phone size={13} className="text-brand-blue shrink-0" />
                  <span dir="ltr">{CONTACT_LANDLINE}</span>
                </a>

                <a
                  href={`tel:${CONTACT_MOBILE}`}
                  className="p-2 bg-brand-red hover:bg-brand-red/90 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] font-black active:scale-95 shadow-2xs"
                  title="اتصل بموبايل الحجز"
                >
                  <Phone size={13} className="shrink-0" />
                  <span dir="ltr">{CONTACT_MOBILE}</span>
                </a>
              </div>

              <div className="text-center pt-1">
                <span className="text-[9.5px] font-semibold text-slate-400 block leading-none">
                  {CENTER_ADDRESS}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
