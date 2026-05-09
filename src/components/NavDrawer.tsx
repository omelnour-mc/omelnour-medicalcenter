/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, ChevronLeft, Phone, Home, Calendar, MapPin, Search, Filter, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CONTACT_PHONE } from "../constants.ts";

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenFilters: () => void;
  onOpenAdmin: () => void;
}

export default function NavDrawer({ isOpen, onClose, onOpenSearch, onOpenFilters, onOpenAdmin }: NavDrawerProps) {
  const menuItems = [
    { label: "الرئيسية", icon: Home, href: "#" },
    { label: "البحث عن طبيب", icon: Search, onClick: onOpenSearch },
    { label: "فلترة العيادات", icon: Filter, onClick: onOpenFilters },
    { label: "مواعيد الأطباء", icon: Calendar, href: "#schedule" },
    { label: "موقعنا", icon: MapPin, href: "#map" },
    { label: "لوحة التحكم (Admin)", icon: Settings, onClick: onOpenAdmin, className: "text-brand-red" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1001]" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 bg-brand-blue text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <span className="font-black text-xl">ON</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-lg leading-tight uppercase">OMELNOUR</span>
                  <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Medical Center</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-brand-red transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Menu */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {menuItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href || "javascript:void(0)"}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      onClose();
                    }}
                    className={`flex items-center justify-between p-5 rounded-2xl hover:bg-brand-blue/5 group transition-all ${item.className || ''}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl bg-slate/5 text-slate group-hover:bg-brand-blue/10 group-hover:text-brand-blue flex items-center justify-center transition-all ${item.className ? 'bg-red-50 text-brand-red' : ''}`}>
                        <item.icon size={22} />
                      </div>
                      <span className={`font-black text-navy text-lg group-hover:text-brand-blue transition-colors ${item.className ? 'text-brand-red' : ''}`}>{item.label}</span>
                    </div>
                    <ChevronLeft size={20} className="text-slate/20 group-hover:text-brand-blue transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate/5 border-t border-slate/5">
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="w-full bg-brand-red text-white py-5 rounded-3xl font-black flex items-center justify-center gap-4 shadow-xl shadow-brand-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Phone size={24} />
                تواصل معنا الآن
              </a>
              <p className="text-center text-[10px] mt-6 font-black text-slate/30 uppercase tracking-[0.3em]">© 2026 Om ElNour Medical Center</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
