/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { format, startOfToday, addDays } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar as CalendarIcon, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function DatePickerModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}: DatePickerModalProps) {
  const [tempDate, setTempDate] = useState(format(selectedDate, "yyyy-MM-dd"));

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (tempDate) {
      const [year, month, day] = tempDate.split("-").map(Number);
      onSelectDate(new Date(year, month - 1, day));
    }
    onClose();
  };

  const today = startOfToday();
  const tomorrow = addDays(today, 1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl border border-slate-200/80 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h3 className="font-black text-navy text-base">اختر التاريخ للانتقال</h3>
                <p className="text-slate-400 font-bold text-xs">عرض جدول المواعيد لليوم المحدد</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectDate(today);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200/80 font-black text-xs bg-slate-50 hover:bg-blue-50 hover:text-brand-blue hover:border-blue-200 transition-all text-center cursor-pointer"
            >
              اليوم ({format(today, "EEEE", { locale: ar })})
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectDate(tomorrow);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200/80 font-black text-xs bg-slate-50 hover:bg-blue-50 hover:text-brand-blue hover:border-blue-200 transition-all text-center cursor-pointer"
            >
              غداً ({format(tomorrow, "EEEE", { locale: ar })})
            </button>
          </div>

          {/* Native Date Input Picker */}
          <div className="space-y-2">
            <label className="text-xs font-black text-navy block">أو حدد تاريخاً معيناً:</label>
            <input
              type="date"
              value={tempDate}
              onChange={(e) => setTempDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono font-bold text-navy bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm cursor-pointer"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-black text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 rounded-xl bg-brand-blue text-white font-black text-xs hover:bg-brand-blue-dark transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-brand-blue/20 cursor-pointer"
            >
              <Check size={16} />
              <span>انتقال</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
