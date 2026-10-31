/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phone, Menu, X, Search, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CONTACT_LANDLINE, CENTER_NAME_SHORT } from "../constants.ts";

interface HeaderProps {
  onSearchClick: () => void;
  onMenuClick: () => void;
}

export default function Header({ onSearchClick, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[60] bg-white border-b border-slate-200 shadow-xs h-14 sm:h-16 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex gap-6 text-[12px] font-black text-slate-600 uppercase tracking-widest">
              <a href="#" className="hover:text-brand-blue transition-colors">الرئيسية</a>
              <a href="#schedule" className="hover:text-brand-blue transition-colors">مواعيد الأطباء</a>
            </nav>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={onSearchClick}
                className="p-2 bg-slate-100 text-slate-700 hover:text-brand-blue hover:bg-brand-blue/10 rounded-xl transition-all"
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
              onClick={onSearchClick}
              className="p-2 bg-slate-100 text-slate-700 hover:text-brand-blue rounded-lg transition-colors"
              title="بحث"
              aria-label="بحث"
            >
              <Search size={16} />
            </button>
            <a 
              href={`tel:${CONTACT_LANDLINE}`}
              className="p-2 bg-red-50 text-brand-red rounded-lg transition-colors"
              title="اتصل بنا"
              aria-label="اتصل بنا"
            >
              <Phone size={16} />
            </a>
            <button 
              onClick={onMenuClick}
              className="p-2 bg-brand-blue text-white rounded-lg transition-colors"
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
