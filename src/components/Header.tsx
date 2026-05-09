/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phone, Menu, X, Search, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CONTACT_PHONE } from "../constants.ts";

interface HeaderProps {
  onSearchClick: () => void;
  onMenuClick: () => void;
}

export default function Header({ onSearchClick, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Name */}
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-blue/10 overflow-hidden group-hover:rotate-3 transition-transform">
              <img 
                src="/logo.png" 
                alt="Om ElNour Logo" 
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  // Fallback if logo.png is missing
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<span class="font-black text-brand-blue text-2xl tracking-tighter">ON</span>';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-brand-blue font-black text-xl leading-none tracking-tight">OMELNOUR</span>
              <span className="text-slate font-bold text-xs uppercase tracking-[0.2em] opacity-60">Medical Center</span>
              <span className="text-brand-blue font-black text-[11px] mt-1 border-t border-brand-blue/10 pt-1">مركز أم النور الطبي</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            <nav className="flex gap-8 text-[13px] font-black text-slate uppercase tracking-widest">
              <a href="#" className="hover:text-brand-blue transition-colors border-b-2 border-transparent hover:border-brand-blue pb-1">الرئيسية</a>
              <a href="#schedule" className="hover:text-brand-blue transition-colors border-b-2 border-transparent hover:border-brand-blue pb-1">مواعيد الأطباء</a>
              <a href="#map" className="hover:text-brand-blue transition-colors border-b-2 border-transparent hover:border-brand-blue pb-1">موقعنا</a>
            </nav>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={onSearchClick}
                className="p-3 bg-slate/5 text-slate hover:text-brand-blue hover:bg-brand-blue/5 rounded-2xl transition-all"
                title="بحث عن طبيب"
              >
                <Search size={20} />
              </button>

              <a
                href={`tel:${CONTACT_PHONE}`}
                className="group bg-brand-red text-white pl-8 pr-6 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-red-dark transition-all shadow-xl shadow-brand-red/20 active:scale-95"
              >
                <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                  <Phone size={18} />
                </div>
                <span className="text-sm">اتصل بنا الآن</span>
              </a>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={onSearchClick}
              className="p-3 bg-slate/5 text-slate rounded-xl hover:bg-slate/10"
            >
              <Search size={22} />
            </button>
            <button 
              onClick={onMenuClick}
              className="p-3 bg-brand-blue text-white rounded-xl shadow-lg shadow-brand-blue/20"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
