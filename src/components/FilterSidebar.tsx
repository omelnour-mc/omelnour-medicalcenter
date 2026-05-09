/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar as CalendarIcon, Search, Check, Filter, X } from "lucide-react";
import { CALENDARS } from "../constants.ts";

interface FilterSidebarProps {
  startDate: string;
  endDate: string;
  selectedCalendars: string[];
  onDateChange: (start: string, end: string) => void;
  onCalendarToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSearch: () => void;
  onToday: () => void;
  onClose?: () => void;
  loading: boolean;
}

export default function FilterSidebar({
  startDate,
  endDate,
  selectedCalendars,
  onDateChange,
  onCalendarToggle,
  onSelectAll,
  onClearAll,
  onSearch,
  onToday,
  onClose,
  loading
}: FilterSidebarProps) {
  const [isSpecialtiesOpen, setIsSpecialtiesOpen] = useState(true);

  return (
    <div className="bg-white border rounded-3xl p-6 h-full lg:h-fit sticky top-24 card-shadow space-y-8 flex flex-col">
      {/* Search Header */}
      <div className="flex items-center justify-between gap-3 text-brand-blue">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-blue-light flex items-center justify-center text-brand-blue">
            <Search size={20} />
          </div>
          <div>
            <h3 className="font-black text-lg">بحث وفلترة</h3>
            <p className="text-gray-400 text-xs">خصص عرض المواعيد</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate/5 text-slate"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-1">
        {/* Date Range Section */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-blue uppercase px-1">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onDateChange(e.target.value, endDate)}
                className="w-full bg-slate/5 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-blue/20 transition-all font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-blue uppercase px-1">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onDateChange(startDate, e.target.value)}
                className="w-full bg-slate/5 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-blue/20 transition-all font-bold"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={onSearch}
              disabled={loading}
              className="w-full bg-brand-blue text-white py-5 px-6 rounded-2xl font-black hover:bg-brand-blue-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-blue/20 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={22} />}
              تحديث النتائج
            </button>
            <button
              onClick={onToday}
              className="w-full bg-brand-red/10 text-brand-red py-5 px-6 rounded-2xl font-black hover:bg-brand-red hover:text-white transition-all border border-brand-red/10"
            >
              عرض اليوم الحالي
            </button>
          </div>
        </section>

        <hr className="border-slate/5" />

        {/* Specialties Selection */}
        <section className="space-y-4">
          <button
            onClick={() => setIsSpecialtiesOpen(!isSpecialtiesOpen)}
            className="w-full flex items-center justify-between font-black text-brand-blue group"
          >
            <span className="flex items-center gap-2">
              <Filter size={18} className="text-brand-red" />
              التخصصات المتاحة
              <span className="bg-brand-blue-light text-brand-blue text-[10px] px-2 py-0.5 rounded-full">
                {selectedCalendars.length}
              </span>
            </span>
            {isSpecialtiesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {isSpecialtiesOpen && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-4">
                <button
                  onClick={onSelectAll}
                  className="text-[10px] font-black text-brand-blue hover:text-brand-red transition-colors"
                >
                  تحديد الكل
                </button>
                <button
                  onClick={onClearAll}
                  className="text-[10px] font-black text-slate/40 hover:text-brand-red transition-colors"
                 >
                  إلغاء التحديد
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pl-1 custom-scrollbar">
                {CALENDARS.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => onCalendarToggle(cal.id)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all text-right group ${
                      selectedCalendars.includes(cal.id) 
                        ? "bg-brand-blue/5 border border-brand-blue/10" 
                        : "hover:bg-slate/5 border border-transparent"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                      selectedCalendars.includes(cal.id)
                        ? "bg-brand-blue border-brand-blue text-white shadow-lg"
                        : "border-slate/10"
                    }`}>
                      {selectedCalendars.includes(cal.id) && <Check size={14} strokeWidth={4} />}
                    </div>
                    <span className={`text-xs flex-1 transition-colors ${
                      selectedCalendars.includes(cal.id) ? "text-brand-blue font-black" : "text-slate/60 font-bold"
                    }`}>
                      {cal.name}
                    </span>
                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: cal.color }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
