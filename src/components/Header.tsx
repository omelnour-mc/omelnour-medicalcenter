/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phone, Menu, X, Search, ChevronRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CONTACT_LANDLINE, CENTER_NAME_SHORT } from "../constants.ts";

interface HeaderProps {
  onSearchClick: () => void;
  onMenuClick: () => void;
  onOpenAdmin: () => void;
  onNavigateHome?: () => void;
  isAdmin?: boolean;
}

export default function Header({ onSearchClick, onMenuClick, onOpenAdmin, onNavigateHome, isAdmin }: HeaderProps) {
  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScheduleClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    }
    setTimeout(() => {
      const element = document.getElementById("schedule");
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <header className="sticky top-0 z-[60] bg-white border-b border-slate-200 shadow-xs h-14 sm:h-16 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={handleHomeClick}>
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white flex items-center justify-center">
              <img 
                src="/assets/om-elnour-logo.png" 
                alt="شعار مركز أم النور الطبي" 
                className="h-full w-auto block object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-brand-blue font-black text-[13px] sm:text-[15px] leading-tight tracking-tight">
                مركز أم النور الطبي
              </span>
              <span className="text-slate-500 font-bold text-[10px] sm:text-[11px] leading-tight">
                العصافرة قبلي
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-6 text-[12px] font-black text-slate-600 uppercase tracking-widest">
              <button 
                onClick={handleHomeClick} 
                className="hover:text-brand-blue transition-colors cursor-pointer"
              >
                الرئيسية
              </button>
              <button 
                onClick={handleScheduleClick} 
                className="hover:text-brand-blue transition-colors cursor-pointer"
              >
                مواعيد الأطباء
              </button>
            </nav>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenAdmin}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer border ${
                  isAdmin 
                    ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200/80"
                }`}
                title={isAdmin ? "جلسة المشرف نشطة - تعديل المواعيد متاح" : "تسجيل دخول المشرف وتعديل المواعيد"}
              >
                {isAdmin && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                <ShieldCheck size={16} className={isAdmin ? "text-emerald-700" : "text-amber-700"} />
                <span>{isAdmin ? "المشرف (نشط)" : "إدارة المواعيد"}</span>
              </button>

              <button 
                onClick={onSearchClick}
                className="p-2 bg-slate-100 text-slate-700 hover:text-brand-blue hover:bg-brand-blue/10 rounded-xl transition-all cursor-pointer"
                title="بحث"
              >
                <Search size={18} />
              </button>

              <a
                href={`tel:${CONTACT_LANDLINE}`}
                className="group bg-brand-red text-white px-4 py-2 rounded-xl font-black flex items-center gap-2 hover:bg-brand-red/90 transition-all shadow-xs"
              >
                <Phone size={15} />
                <span className="text-xs">اتصل بنا</span>
              </a>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={onOpenAdmin}
              className={`p-2 rounded-lg transition-colors border cursor-pointer relative ${
                isAdmin 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-amber-50 text-amber-800 border-amber-200/80"
              }`}
              title={isAdmin ? "جلسة المشرف نشطة" : "إدارة المواعيد"}
              aria-label="إدارة المواعيد"
            >
              {isAdmin && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />}
              <ShieldCheck size={16} className={isAdmin ? "text-emerald-700" : "text-amber-700"} />
            </button>
            <button 
              onClick={onSearchClick}
              className="p-2 bg-slate-100 text-slate-700 hover:text-brand-blue rounded-lg transition-colors cursor-pointer"
              title="بحث"
              aria-label="بحث"
            >
              <Search size={16} />
            </button>
            <button 
              onClick={onMenuClick}
              className="p-2 bg-brand-blue text-white rounded-lg transition-colors cursor-pointer"
              title="القائمة"
              aria-label="القائمة"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
