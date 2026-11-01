/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { X, Calendar, Clock, Stethoscope, Shield, Check, AlertTriangle, Loader2 } from "lucide-react";
import { CALENDARS } from "../constants.ts";
import { stripStatusEmojis } from "../lib/utils.ts";
import axios from "axios";
import { db } from "../lib/firebase.ts";
import { doc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import ConfirmationModal from "./ConfirmationModal.tsx";

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  calendarId: string;
  googleAccessToken?: string | null;
  onRefresh: () => void;
}

export default function EditEventModal({ isOpen, onClose, event, calendarId, googleAccessToken, onRefresh }: EditEventModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "danger" | "primary";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "primary",
    onConfirm: () => {},
  });

  const rawSummary = event?.summary || "";
  const doctorNameClean = stripStatusEmojis(rawSummary).split(" - ")[0].trim();
  
  const [doctorName, setDoctorName] = useState(doctorNameClean);
  const [selectedCalendarId, setSelectedCalendarId] = useState(calendarId);
  const [appointmentDate, setAppointmentDate] = useState(event?.start?.dateTime ? event.start.dateTime.split("T")[0] : (event?.start?.date || new Date().toISOString().split("T")[0]));
  const [startTime, setStartTime] = useState(event?.start?.dateTime ? event.start.dateTime.split("T")[1]?.substring(0, 5) : "18:00");
  const [endTime, setEndTime] = useState(event?.end?.dateTime ? event.end.dateTime.split("T")[1]?.substring(0, 5) : "20:00");
  
  // Status
  const currentStatusMatch = rawSummary.includes("❌") ? "apologized" : rawSummary.includes("⚠️") ? "exception" : rawSummary.includes("✔️") ? "substitute" : "normal";
  const [appointmentStatus, setAppointmentStatus] = useState<"normal" | "apologized" | "exception" | "substitute">(currentStatusMatch);

  // Recurrence & Scope State
  const [editScope, setEditScope] = useState<"single" | "upcoming" | "all">("single");
  const [isRecurring, setIsRecurring] = useState(event?.recurrence && event.recurrence.length > 0);
  const [selectedDays, setSelectedDays] = useState<number[]>([new Date(appointmentDate).getDay()]);
  const [untilDate, setUntilDate] = useState(event?.recurrence?.[0]?.split("UNTIL=")[1]?.substring(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") || new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  if (!isOpen || !event) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim()) {
      setError("يرجى إدخال اسم الطبيب");
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "تأكيد حفظ التعديلات",
      message: `هل أنت متأكد من حفظ التعديلات الجديدة للطبيب ${doctorName}؟`,
      type: "primary",
      onConfirm: async () => {
        setSaving(true);
        setError(null);

        try {
          const cleanDocName = stripStatusEmojis(doctorName.trim()).split(" - ")[0].trim();
          let statusPrefix = "";
          if (appointmentStatus === "apologized") statusPrefix = " - ❌ معتذر";
          else if (appointmentStatus === "exception") statusPrefix = " - ⚠️ استثناء";
          else if (appointmentStatus === "substitute") statusPrefix = " - ✔️ بديل";

          const newSummary = `${cleanDocName}${statusPrefix}`;
          const startDateTime = `${appointmentDate}T${startTime}:00`;
          const endDateTime = `${appointmentDate}T${endTime}:00`;

          // Recurrence Rule construction
          let recurrence: string[] | undefined = undefined;
          if (isRecurring) {
            const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
            const byDay = selectedDays.map(d => dayNames[d]).join(",");
            const untilStr = untilDate.replace(/-/g, "") + "T235959Z";
            recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilStr}`];
          }

          const updatedEventData = {
            id: event.id,
            calendarId: selectedCalendarId,
            summary: newSummary,
            start: { dateTime: startDateTime },
            end: { dateTime: endDateTime }
          };

          // Save to Firestore for cross-device sync
          try {
            await setDoc(doc(db, "custom_events", event.id), updatedEventData, { merge: true });
          } catch (fbErr) {
            console.warn("Firestore save custom event error:", fbErr);
          }

          // 2. If Google Calendar Event & token exists, update via Google Calendar API
          if (googleAccessToken && event.id && !event.id.startsWith("local_")) {
            try {
              const targetEventId = (editScope === "all" && event.recurringEventId) ? event.recurringEventId : event.id;
              
              const patchBody: any = {
                summary: newSummary,
                start: { dateTime: startDateTime, timeZone: "Africa/Cairo" },
                end: { dateTime: endDateTime, timeZone: "Africa/Cairo" }
              };

              if (editScope === "all") {
                patchBody.recurrence = recurrence;
              }

              await axios.patch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedCalendarId)}/events/${targetEventId}`,
                patchBody,
                {
                  headers: {
                    Authorization: `Bearer ${googleAccessToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

            } catch (apiErr: any) {
              console.warn("Google Calendar API update warning:", apiErr);
            }
          }

          onRefresh();
          onClose();
        } catch (err: any) {
          console.error("Error saving event:", err);
          setError("فشل حفظ التعديلات: " + err.message);
        } finally {
          setSaving(false);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[1005] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-navy/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] z-10">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-brand-blue text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Stethoscope size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">تعديل موعد الطبيب</h3>
              <p className="text-[10px] opacity-75 font-bold">خيارات متوافقة مع تقويم Google (Series & Scope)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          
          <div className="space-y-1.5">
            <label className="text-xs font-black text-navy block">العيادة التخصصية</label>
            <select
              value={selectedCalendarId}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50/50 focus:outline-none focus:border-brand-blue transition-all"
            >
              {CALENDARS.map(cal => (
                <option key={cal.id} value={cal.id}>{cal.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-navy block">اسم الطبيب مع اللقب</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-white focus:outline-none focus:border-brand-blue transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-navy block">تاريخ الموعد</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-white focus:outline-none focus:border-brand-blue transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-navy block">من</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-white focus:outline-none focus:border-brand-blue transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-navy block">إلى</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-white focus:outline-none focus:border-brand-blue transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Recurrence Control in Edit */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
             <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isRecurring} 
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="accent-brand-blue w-4 h-4"
                />
                <span className="text-xs font-black text-navy">جدولة كموعد متكرر أسبوعياً</span>
             </label>
             {isRecurring && (
                <div className="space-y-4 pt-3 border-t border-slate-200/50 animate-in fade-in slide-in-from-top-1 duration-300">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase">أيام التكرار:</p>
                      <div className="grid grid-cols-7 gap-1">
                         {["ح", "ن", "ث", "ر", "خ", "ج", "س"].map((day, idx) => (
                            <button
                               key={idx}
                               type="button"
                               onClick={() => {
                                  if (selectedDays.includes(idx)) setSelectedDays(prev => prev.filter(d => d !== idx));
                                  else setSelectedDays(prev => [...prev, idx].sort());
                               }}
                               className={`py-2 rounded-lg font-black text-[10px] border transition-all ${selectedDays.includes(idx) ? "bg-brand-blue text-white border-brand-blue shadow-sm" : "bg-white text-slate-400 border-slate-100"}`}
                            >
                               {day}
                            </button>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">تاريخ النهاية:</label>
                      <input
                         type="date"
                         value={untilDate}
                         onChange={(e) => setUntilDate(e.target.value)}
                         className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs bg-white focus:outline-none focus:border-brand-blue"
                      />
                   </div>
                </div>
             )}
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-navy block">حالة الموعد</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "normal", label: "عادية", icon: "🟢" },
                { id: "apologized", label: "معتذر", icon: "❌" },
                { id: "exception", label: "استثناء", icon: "⚠️" },
                { id: "substitute", label: "بديل", icon: "✔️" },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setAppointmentStatus(st.id as any)}
                  className={`py-2.5 px-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-1 border transition-all cursor-pointer ${appointmentStatus === st.id ? "bg-brand-blue text-white border-brand-blue shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                >
                  <span>{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Google Calendar Recurrence Scope Options */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-brand-blue">
              <Calendar size={16} />
              <label className="text-xs font-black">نطاق تطبيق التعديلات (Scope)</label>
            </div>
            <div className="space-y-2">
              {[
                { id: "single", label: "هذا الموعد فقط (This event only)", desc: "تعديل مثيل واحد فقط من المواعيد المتكررة" },
                { id: "upcoming", label: "هذا الموعد وكافة المواعيد القادمة (Upcoming)", desc: "تعديل المواعيد من هذا التاريخ فصاعداً" },
                { id: "all", label: "كافة مواعيد السلسلة (All events)", desc: "تعديل السلسلة الكاملة (الماضي والمستقبل)" },
              ].map(scope => (
                <label 
                  key={scope.id}
                  className={`flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-all ${editScope === scope.id ? "bg-blue-50/80 border-brand-blue text-brand-blue shadow-sm" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"}`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editScope"
                      checked={editScope === scope.id}
                      onChange={() => setEditScope(scope.id as any)}
                      className="accent-brand-blue w-3.5 h-3.5"
                    />
                    <span className="text-xs font-black">{scope.label}</span>
                  </div>
                  <p className={`text-[10px] pr-5.5 font-bold ${editScope === scope.id ? "text-brand-blue/70" : "text-slate-400"}`}>{scope.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-brand-red p-3 rounded-xl flex items-center gap-2 border border-red-200 font-bold text-xs">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand-blue text-white py-3.5 rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-dark transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              <span>تثبيت وحفظ التعديلات</span>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setConfirmConfig({
                    isOpen: true,
                    title: "تأكيد حذف الموعد",
                    message: "هل أنت متأكد من حذف هذا الموعد نهائياً؟ لا يمكن التراجع عن هذه العملية.",
                    type: "danger",
                    onConfirm: async () => {
                      setSaving(true);
                      try {
                        // Delete from Google if applicable
                        if (googleAccessToken && event.id && !event.id.startsWith("local_")) {
                          const targetEventId = (editScope === "all" && event.recurringEventId) ? event.recurringEventId : event.id;
                          await axios.delete(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedCalendarId)}/events/${targetEventId}`, {
                            headers: { Authorization: `Bearer ${googleAccessToken}` }
                          });
                        }
                        
                        // Delete from Firestore if applicable
                        try {
                          await deleteDoc(doc(db, "custom_events", event.id));
                        } catch (e) {
                          console.warn("Firestore delete warning:", e);
                        }

                        onRefresh();
                        onClose();
                      } catch (err: any) {
                        setError("فشل الحذف: " + err.message);
                      } finally {
                        setSaving(false);
                      }
                    }
                  });
                }}
                className="flex-1 sm:flex-none px-6 py-3.5 bg-red-50 hover:bg-red-100 text-brand-red rounded-xl font-black text-xs transition-all cursor-pointer border border-red-100 active:scale-95"
              >
                حذف
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs transition-all cursor-pointer border border-slate-200 active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>

        </form>
      </div>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </div>
  );
}
