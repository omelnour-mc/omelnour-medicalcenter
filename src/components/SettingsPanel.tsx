/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Type, Eye, Maximize2, Sliders, X, Settings as SettingsIcon } from "lucide-react";
import { AppSettings } from "../types.ts";
import { motion, AnimatePresence } from "motion/react";

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onSettingsChange, isOpen, onClose }: SettingsPanelProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const updateSetting = (key: keyof AppSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy/40 backdrop-blur-[2px] z-[100]"
          />
          
          {/* Popover / Bottom Sheet */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-0 left-0 right-0 lg:absolute lg:bottom-auto lg:top-full lg:left-0 lg:right-auto lg:mt-2 bg-white z-[101] shadow-2xl rounded-t-[2rem] lg:rounded-2xl border border-slate/10 overflow-hidden lg:w-80"
          >
            <div className="p-4 lg:p-5 flex items-center justify-between border-b border-slate/5 bg-slate/5">
              <div className="flex items-center gap-2 text-brand-blue">
                <SettingsIcon size={16} />
                <h3 className="font-black text-[13px] uppercase tracking-tight">إعدادات العرض</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-slate/10 rounded-lg text-slate/40 transition-colors"
                title="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 lg:p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Font Sizes */}
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-[11px] font-black text-slate/40 uppercase tracking-widest">
                  <Type size={12} className="text-brand-red" />
                  أحجام الخطوط
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate/60">
                      <span>خط الجدول</span>
                      <span className="text-brand-blue">{settings.globalFontSize}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={settings.globalFontSize}
                      onChange={(e) => updateSetting("globalFontSize", parseInt(e.target.value))}
                      className="w-full h-1 bg-slate/10 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate/60">
                      <span>خط العناوين</span>
                      <span className="text-brand-blue">{settings.headlineFontSize}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="250"
                      value={settings.headlineFontSize}
                      onChange={(e) => updateSetting("headlineFontSize", parseInt(e.target.value))}
                      className="w-full h-1 bg-slate/10 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                    />
                  </div>
                </div>
              </div>

              {/* Visibility Toggles */}
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-[11px] font-black text-slate/40 uppercase tracking-widest">
                  <Eye size={12} className="text-brand-red" />
                  خيارات الظهور
                </h4>
                <div className="space-y-2">
                  {[
                    { key: "showDatesRow", label: "إظهار التاريخ" },
                    { key: "showDayNamesRow", label: "إظهار أسماء الأيام" },
                    { key: "showDayAndDate", label: "دمج اليوم والتاريخ" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between cursor-pointer group py-1">
                      <span className="text-[13px] font-bold text-slate/70 group-hover:text-brand-blue transition-colors">
                        {item.label}
                      </span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={(settings as any)[item.key]}
                          onChange={(e) => updateSetting(item.key as any, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-blue"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
