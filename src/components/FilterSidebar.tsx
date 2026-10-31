/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  Check, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import SpecialtyIcon, { getCleanSpecialtyName } from "./SpecialtyIcon.tsx";

export interface FilterState {
  doctorQuery: string;
  shift: "all" | "morning" | "afternoon" | "evening";
  selectedCalendars: string[];
  activeOnly: boolean;
  dayOfWeek: "all" | string;
}

interface FilterSidebarProps {
  startDate: string;
  endDate: string;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onDateChange: (start: string, end: string) => void;
  onResetFilters: () => void;
  onApply: () => void;
  onClose?: () => void;
  loading: boolean;
  calendars?: any[];
}

export default function FilterSidebar({
  startDate,
  endDate,
  filters,
  onFilterChange,
  onDateChange,
  onResetFilters,
  onApply,
  onClose,
  loading,
  calendars = []
}: FilterSidebarProps) {
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [isSpecialtiesExpanded, setIsSpecialtiesExpanded] = useState(true);

  const filteredCalendars = calendars.filter(cal => 
    !specialtySearch || cal.name.toLowerCase().includes(specialtySearch.toLowerCase())
  );

  const shifts = [
    { id: "all", label: "جميع الأوقات", icon: "🌟" },
    { id: "morning", label: "صباحية (08:00–12:00)", icon: "🌅" },
    { id: "afternoon", label: "بعد الظهر (12:00–17:00)", icon: "☀️" },
    { id: "evening", label: "مسائية (17:00–23:00)", icon: "🌙" },
  ];

  const daysOfWeek = [
    { id: "all", label: "جميع الأيام" },
    { id: "6", label: "السبت" },
    { id: "0", label: "الأحد" },
    { id: "1", label: "الإثنين" },
    { id: "2", label: "الثلاثاء" },
    { id: "3", label: "الأربعاء" },
    { id: "4", label: "الخميس" },
    { id: "5", label: "الجمعة" },
  ];

  const handleToggleCalendar = (id: string) => {
    const current = filters.selectedCalendars;
    const updated = current.includes(id) 
      ? current.filter(c => c !== id) 
      : [...current, id];
    onFilterChange({ selectedCalendars: updated });
  };

  const handleSelectAllCalendars = () => {
    onFilterChange({ selectedCalendars: calendars.map(c => c.id) });
  };

  const handleClearAllCalendars = () => {
    onFilterChange({ selectedCalendars: [] });
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl p-4 sm:p-5 space-y-4 flex flex-col h-full overflow-hidden text-right" dir="rtl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
            <Filter size={18} />
          </div>
          <div>
            <h3 className="font-black text-navy text-sm sm:text-base leading-tight">تصفية المواعيد والعيادات</h3>
            <p className="text-slate-400 text-[11px] font-bold">خصص عرض الجداول والأطباء والأوقات</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onResetFilters}
            className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            title="إعادة ضبط الفلاتر"
          >
            <RotateCcw size={13} />
            <span className="hidden xs:inline">إعادة ضبط</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-brand-red flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              aria-label="إغلاق التصفية"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Filter Options */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        {/* 1. Search Doctor Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-navy flex items-center gap-1.5">
            <User size={13} className="text-brand-blue" />
            <span>البحث باسم الطبيب</span>
          </label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="اكتب اسم الطبيب (مثلاً: د. بيتر، د. مينا)..."
              value={filters.doctorQuery}
              onChange={(e) => onFilterChange({ doctorQuery: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-8 py-2 text-xs font-bold text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
            />
            {filters.doctorQuery && (
              <button
                onClick={() => onFilterChange({ doctorQuery: "" })}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-red cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 2. Filter by Time Period / Shift */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-navy flex items-center gap-1.5">
            <Clock size={13} className="text-amber-500" />
            <span>الفترة الزمنية (المواعيد)</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {shifts.map((s) => {
              const isSelected = filters.shift === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onFilterChange({ shift: s.id as any })}
                  className={`p-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all text-right border cursor-pointer ${
                    isSelected
                      ? "bg-brand-blue text-white border-brand-blue shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-sm shrink-0">{s.icon}</span>
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Filter by Day of Week */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-navy flex items-center gap-1.5">
            <CalendarIcon size={13} className="text-emerald-600" />
            <span>يوم الأسبوع</span>
          </label>
          <div className="flex flex-wrap gap-1">
            {daysOfWeek.map((d) => {
              const isSelected = filters.dayOfWeek === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => onFilterChange({ dayOfWeek: d.id })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Filter Active Appointments Only */}
        <div 
          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between cursor-pointer select-none" 
          onClick={() => onFilterChange({ activeOnly: !filters.activeOnly })}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className={filters.activeOnly ? "text-emerald-600" : "text-slate-400"} />
            <div>
              <span className="text-xs font-black text-navy block">المواعيد النشطة فقط</span>
              <span className="text-[10px] font-bold text-slate-400">إخفاء اعتذارات الأطباء</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={filters.activeOnly}
            onChange={(e) => onFilterChange({ activeOnly: e.target.checked })}
            className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
          />
        </div>

        {/* 5. Date Range */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-navy flex items-center gap-1.5">
            <CalendarIcon size={13} className="text-brand-blue" />
            <span>النطاق الزمني (التواريخ)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9.5px] font-bold text-slate-400 block mb-0.5">من تاريخ</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onDateChange(e.target.value, endDate)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-400 block mb-0.5">إلى تاريخ</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onDateChange(startDate, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>
        </div>

        {/* 6. Filter by Specialty / Clinic */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsSpecialtiesExpanded(!isSpecialtiesExpanded)}
              className="flex items-center gap-1.5 text-xs font-black text-navy hover:text-brand-blue transition-colors cursor-pointer"
            >
              <span>العيادات والتخصصات</span>
              <span className="bg-blue-100 text-brand-blue text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {filters.selectedCalendars.length} / {calendars.length}
              </span>
              {isSpecialtiesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <div className="flex items-center gap-2 text-[10px] font-bold">
              <button
                type="button"
                onClick={handleSelectAllCalendars}
                className="text-brand-blue hover:underline cursor-pointer"
              >
                تحديد الكل
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleClearAllCalendars}
                className="text-slate-400 hover:text-brand-red hover:underline cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>

          {isSpecialtiesExpanded && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="تصفية العيادات..."
                value={specialtySearch}
                onChange={(e) => setSpecialtySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] font-bold text-navy placeholder:text-slate-400"
              />

              <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {filteredCalendars.map((cal) => {
                  const isChecked = filters.selectedCalendars.includes(cal.id);
                  const cleanSpec = getCleanSpecialtyName(cal.name);
                  return (
                    <button
                      key={cal.id}
                      type="button"
                      onClick={() => handleToggleCalendar(cal.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all text-right border cursor-pointer ${
                        isChecked
                          ? "bg-blue-50/70 border-brand-blue/30 text-navy"
                          : "bg-slate-50/50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SpecialtyIcon specialty={cal.name} size="sm" showBackground />
                        <span className="truncate">{cleanSpec}</span>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked ? "bg-brand-blue border-brand-blue text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            onApply();
            if (onClose) onClose();
          }}
          disabled={loading}
          className="flex-1 bg-brand-blue hover:bg-brand-blue-dark text-white py-2.5 px-4 rounded-xl text-xs font-black shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Filter size={15} />
          )}
          <span>تطبيق التصفية</span>
        </button>

        <button
          onClick={onResetFilters}
          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          title="إعادة ضبط كافة الفلاتر"
        >
          إعادة ضبط
        </button>
      </div>
    </div>
  );
}
