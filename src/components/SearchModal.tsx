/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Search, X, User, ArrowLeft, Stethoscope, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarResponse } from "../types.ts";
import { CALENDARS } from "../constants.ts";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CalendarResponse[];
  onSelectDoctor: (name: string, specialty: string) => void;
  onSelectSpecialty: (specialty: string) => void;
}

export default function SearchModal({ isOpen, onClose, data, onSelectDoctor, onSelectSpecialty }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const results = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    
    const term = searchTerm.toLowerCase();
    const matches: Array<{ type: 'doctor' | 'specialty', name: string, specialty?: string, color?: string }> = [];

    // Search Specialties
    CALENDARS.forEach(cal => {
      if (cal.name.toLowerCase().includes(term)) {
        matches.push({ type: 'specialty', name: cal.name, color: cal.color });
      }
    });

    // Search Doctors
    const seenDoctors = new Set();
    data.forEach(calRes => {
      const calInfo = CALENDARS.find(c => c.id === calRes.calendarId);
      calRes.events.forEach(event => {
        const title = (event.summary || "").trim();
        if (!title) return;

        const rawDoctorName = title.split("-")[0].trim();
        // Normalize name: lowercase, remove titles, remove emojis, remove dots/slashes
        const normalizedName = rawDoctorName
          .replace(/[❌✔️⚠️❗]/g, "")
          .replace(/^(د\/|د\.|دكتور |Dr\.|Prof\.)\s?/gi, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        if (normalizedName && normalizedName.includes(term) && !seenDoctors.has(normalizedName)) {
          matches.push({ type: 'doctor', name: rawDoctorName, specialty: calInfo?.name || "غير محدد" });
          seenDoctors.add(normalizedName);
        }
      });
    });

    return matches.slice(0, 10);
  }, [searchTerm, data]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 sm:pt-32" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate/5 bg-slate/5">
              <div className="relative">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate/30" size={24} />
                <input
                  autoFocus
                  type="text"
                  placeholder="ابحث عن اسم طبيب أو عيادة..."
                  className="w-full bg-white pr-16 pl-6 py-6 rounded-2xl text-xl font-black text-brand-blue placeholder:text-slate/20 outline-none ring-2 ring-transparent focus:ring-brand-blue/10 transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                  onClick={onClose}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate/20 hover:text-brand-red transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {results.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate/30 uppercase tracking-[0.2em] px-2 mb-4">نتائج البحث</p>
                  {results.map((res, idx) => (
                    <button
                      key={idx}
                      className="w-full flex items-center justify-between p-5 rounded-2xl hover:bg-brand-blue/5 transition-all text-right group border border-transparent hover:border-brand-blue/10"
                      onClick={() => {
                        if (res.type === 'doctor') {
                          onSelectDoctor(res.name, res.specialty || "");
                        } else {
                          onSelectSpecialty(res.name);
                        }
                      }}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${res.type === 'doctor' ? 'bg-brand-blue-light text-brand-blue' : 'bg-brand-red-light text-brand-red'}`}>
                          {res.type === 'doctor' ? <User size={24} /> : <Stethoscope size={24} />}
                        </div>
                        <div>
                          <h4 className="font-black text-navy text-lg">{res.name}</h4>
                          <p className="text-xs font-bold text-slate/40 uppercase tracking-widest">{res.type === 'doctor' ? res.specialty : 'عيادة تخصصية'}</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate/20 group-hover:text-brand-blue transition-colors" />
                    </button>
                  ))}
                </div>
              ) : searchTerm.trim().length >= 2 ? (
                <div className="text-center py-20 opacity-20">
                  <Search size={48} className="mx-auto mb-4" strokeWidth={1} />
                  <p className="font-black text-xl">لا توجد نتائج مطابقة</p>
                </div>
              ) : (
                <div className="text-center py-20 opacity-20">
                  <Search size={48} className="mx-auto mb-4" strokeWidth={1} />
                  <p className="font-black text-xl">ابدأ بالبحث...</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate/5 border-t border-slate/5 flex justify-center">
               <p className="text-[10px] font-black text-slate/30 uppercase tracking-widest">مركز أم النور الطبي - بحث سريع</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
