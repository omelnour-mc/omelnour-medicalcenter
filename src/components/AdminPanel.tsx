/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { LogIn, LogOut, Shield, ShieldCheck, Building2, Check, X, AlertTriangle, Calendar, Plus, Trash2, Stethoscope, ArrowRight, Loader2, Search, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, Pencil } from "lucide-react";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleSignIn, setCachedToken, getCachedToken } from "../lib/firebase.ts";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { format, addDays } from "date-fns";
import { CALENDARS } from "../constants.ts";
import { stripStatusEmojis, normalizeArabicQuery } from "../lib/utils.ts";

import { CalendarResponse, CalendarInfo } from "../types.ts";
import EditEventModal from "./EditEventModal.tsx";
import ConfirmationModal from "./ConfirmationModal.tsx";
import CompactDoctorScheduleModal from "./CompactDoctorScheduleModal.tsx";

interface AdminPanelProps {
  onRefresh: () => void;
  onTokenReceived: (token: string) => void;
  onBackToHome: () => void;
  scheduleData?: CalendarResponse[];
  calendars?: CalendarInfo[];
}

export default function AdminPanel({ onRefresh, onTokenReceived, onBackToHome, scheduleData = [], calendars = CALENDARS }: AdminPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"add" | "manage">("add");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [editingEventInfo, setEditingEventInfo] = useState<{ event: any; calendarId: string } | null>(null);
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<{ name: string; specialty: string; calendarId: string } | null>(null);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [expandedClinics, setExpandedClinics] = useState<Record<string, boolean>>({});

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

  // New Doctor Form State
  const [selectedCalendarId, setSelectedCalendarId] = useState(calendars?.[0]?.id || CALENDARS[0].id);
  const [doctorName, setDoctorName] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [appointmentStatus, setAppointmentStatus] = useState<"normal" | "apologized" | "exception" | "substitute">("normal");
  const [customEventsList, setCustomEventsList] = useState<any[]>([]);

  // Recurrence State
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "daily">("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([new Date().getDay()]); // 0=Sun, 6=Sat
  const [untilDate, setUntilDate] = useState(format(addDays(new Date(), 90), "yyyy-MM-dd"));

  useEffect(() => {
    const savedPasswordAdmin = sessionStorage.getItem("omelnour_password_admin");
    if (savedPasswordAdmin === "true") {
      setIsAdmin(true);
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const adminDoc = await getDoc(doc(db, "admins", u.uid));
          if (u.email === "omelnour.medicalcenter@gmail.com" && !adminDoc.exists()) {
            await setDoc(doc(db, "admins", u.uid), {
              email: u.email,
              createdAt: serverTimestamp()
            });
            setIsAdmin(true);
          } else if (adminDoc.exists()) {
            setIsAdmin(true);
          }
        } catch (e) {
          console.warn("Admin check offline warning:", e);
          if (u.email === "omelnour.medicalcenter@gmail.com") {
            setIsAdmin(true);
          }
        }
      } else if (!savedPasswordAdmin) {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    fetchCustomEvents();
    return unsubscribe;
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result.token) {
        onTokenReceived(result.token);
        setIsAdmin(true);
        setActiveTab("add");
      }
    } catch (err: any) {
      setError("فشل تسجيل الدخول بجوجل: " + (err.message || "خطأ غير معروف"));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const fetchCustomEvents = async () => {
    try {
      const localEvents = JSON.parse(localStorage.getItem("omelnour_custom_events") || "[]");
      setCustomEventsList(localEvents);

      const querySnapshot = await getDocs(collection(db, "custom_events"));
      const events: any[] = [];
      querySnapshot.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (events.length > 0) {
        setCustomEventsList(events);
        localStorage.setItem("omelnour_custom_events", JSON.stringify(events));
      }
    } catch (err) {
      console.warn("Firestore fetch custom events failed, using local storage:", err);
      const localEvents = JSON.parse(localStorage.getItem("omelnour_custom_events") || "[]");
      setCustomEventsList(localEvents);
    }
  };

  const getGroupedDoctors = () => {
    const specialtyMap: Record<string, Record<string, { name: string; specialty: string; calendarId: string; events: any[] }>> = {};
    const searchNormalized = normalizeArabicQuery(doctorSearchQuery);
    
    scheduleData.forEach(calRes => {
      const calInfo = calendars.find(c => c.id === calRes.calendarId);
      if (!calInfo) return;

      const specialtyName = calInfo.name;
      
      calRes.events.forEach(ev => {
        const title = ev.summary || "";
        const cleanName = stripStatusEmojis(title).split("-")[0].trim();
        
        if (searchNormalized && !normalizeArabicQuery(cleanName).includes(searchNormalized)) {
            return;
        }

        if (!specialtyMap[specialtyName]) specialtyMap[specialtyName] = {};

        const key = `${cleanName}-${calRes.calendarId}`;
        
        if (!specialtyMap[specialtyName][key]) {
          specialtyMap[specialtyName][key] = { 
            name: cleanName, 
            specialty: specialtyName, 
            calendarId: calRes.calendarId,
            events: []
          };
        }
        specialtyMap[specialtyName][key].events.push(ev);
      });
    });

    return Object.entries(specialtyMap).sort((a, b) => a[0].localeCompare(b[0], "ar"));
  };

  const toggleClinic = (name: string) => {
    setExpandedClinics(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const expandAll = (clinics: any[]) => {
    const next: Record<string, boolean> = {};
    clinics.forEach(([name]) => next[name] = true);
    setExpandedClinics(next);
  };

  const collapseAll = () => {
    setExpandedClinics({});
  };

  const handleDeleteDoctor = (doctor: { name: string; specialty: string; calendarId: string; events: any[] }) => {
    setConfirmConfig({
      isOpen: true,
      title: "حذف الطبيب من العيادة",
      message: `هل أنت متأكد من حذف كافة مواعيد ${doctor.name} من عيادة ${doctor.specialty}؟ سيتم حذف ${doctor.events.length} موعد مسجل.`,
      type: "danger",
      onConfirm: async () => {
        try {
          const token = getCachedToken();
          const eventIds = doctor.events.map(e => e.id);

          // 1. Delete from Google Calendar
          if (token) {
            for (const ev of doctor.events) {
               if (!ev.id.startsWith("local_")) {
                 try {
                   await axios.delete(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(doctor.calendarId)}/events/${ev.id}`, {
                     headers: { Authorization: `Bearer ${token}` }
                   });
                 } catch (e) { console.warn("Google delete fail:", e); }
               }
            }
          }

          // 2. Delete from local storage
          const localEvents = JSON.parse(localStorage.getItem("omelnour_custom_events") || "[]");
          const filtered = localEvents.filter((ev: any) => !eventIds.includes(ev.id));
          localStorage.setItem("omelnour_custom_events", JSON.stringify(filtered));

          // 3. Delete from Firestore
          for (const id of eventIds) {
            if (!id.startsWith("local_")) {
              try { await deleteDoc(doc(db, "custom_events", id)); } catch (e) {}
            }
          }

          alert("تم حذف الطبيب وجدوله بنجاح");
          if (onRefresh) onRefresh();
        } catch (err: any) {
          alert("فشل الحذف: " + err.message);
        }
      }
    });
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const secretPassword = (import.meta as any).env.VITE_ADMIN_PASSWORD || "omelnour2026";
    
    if (passwordInput === secretPassword) {
      setIsAdmin(true);
      sessionStorage.setItem("omelnour_password_admin", "true");
      setActiveTab("manage"); 
      
      const token = getCachedToken();
      if (token) onTokenReceived(token);
    } else {
      setError("كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsAdmin(false);
    setCachedToken(null);
    sessionStorage.removeItem("omelnour_password_admin");
  };

  const handleAddDoctorAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim()) {
      setError("يرجى إدخال اسم الطبيب");
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "تأكيد إضافة موعد",
      message: `هل أنت متأكد من إضافة الموعد للطبيب ${doctorName}؟`,
      type: "primary",
      onConfirm: async () => {
        setSaving(true);
        setError(null);

        try {
          let statusPrefix = "";
          if (appointmentStatus === "apologized") statusPrefix = " - ❌ معتذر";
          else if (appointmentStatus === "exception") statusPrefix = " - ⚠️ استثناء";
          else if (appointmentStatus === "substitute") statusPrefix = " - ✔️ بديل";

          const summary = `${doctorName.trim()}${statusPrefix}`;
          const startDateTime = `${appointmentDate}T${startTime}:00`;
          const endDateTime = `${appointmentDate}T${endTime}:00`;

          // 1. Add to Google Calendar if token available
          const token = getCachedToken();
          if (token) {
            try {
              const body: any = {
                summary,
                description: "تمت الإضافة عبر لوحة تحكم مركز أم النور",
                start: { dateTime: startDateTime, timeZone: "Africa/Cairo" },
                end: { dateTime: endDateTime, timeZone: "Africa/Cairo" }
              };

              if (isRecurring) {
                const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
                const byDay = selectedDays.map(d => dayNames[d]).join(",");
                const untilStr = untilDate.replace(/-/g, "") + "T235959Z";
                body.recurrence = [`RRULE:FREQ=${frequency.toUpperCase()};BYDAY=${byDay};UNTIL=${untilStr}`];
              }

              await axios.post(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedCalendarId)}/events`,
                body,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
            } catch (googleErr) {
              console.warn("Failed to sync with Google Calendar:", googleErr);
            }
          }

          const newEventData = {
            id: "local_" + Date.now(),
            calendarId: selectedCalendarId,
            summary,
            start: { dateTime: startDateTime },
            end: { dateTime: endDateTime },
          };

          const localEvents = JSON.parse(localStorage.getItem("omelnour_custom_events") || "[]");
          localEvents.push(newEventData);
          localStorage.setItem("omelnour_custom_events", JSON.stringify(localEvents));

          try {
            await addDoc(collection(db, "custom_events"), {
              calendarId: selectedCalendarId,
              summary,
              start: { dateTime: startDateTime },
              end: { dateTime: endDateTime },
              createdAt: serverTimestamp()
            });
          } catch (fbErr) {
            console.warn("Firestore addDoc warning (saved locally):", fbErr);
          }

          setDoctorName("");
          alert("تم إضافة الموعد بنجاح وتحديث الجدول!");
          await fetchCustomEvents();
          if (onRefresh) onRefresh();
        } catch (err: any) {
          console.error("Error adding event:", err);
          setError("فشل إضافة الموعد: " + err.message);
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleDeleteCustomEvent = async (eventId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد حذف الموعد",
      message: "هل أنت متأكد من حذف هذا الموعد نهائياً من الجدول؟ لا يمكن التراجع عن هذا الإجراء.",
      type: "danger",
      onConfirm: async () => {
        try {
          const localEvents = JSON.parse(localStorage.getItem("omelnour_custom_events") || "[]");
          const filtered = localEvents.filter((ev: any) => ev.id !== eventId);
          localStorage.setItem("omelnour_custom_events", JSON.stringify(filtered));

          if (!eventId.startsWith("local_")) {
            try {
              await deleteDoc(doc(db, "custom_events", eventId));
            } catch (fbErr) {
              console.warn("Firestore delete warning:", fbErr);
            }
          }

          await fetchCustomEvents();
          if (onRefresh) onRefresh();
        } catch (err: any) {
          alert("فشل الحذف: " + err.message);
        }
      }
    });
  };

  return (
    <div className="py-2 px-2 sm:px-4 max-w-7xl mx-auto w-full" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col min-h-[600px]"
      >
        {/* Modern Compact Header */}
        <div className="px-4 py-4 sm:px-8 sm:py-6 bg-brand-blue text-white flex flex-col sm:flex-row items-center justify-between shrink-0 relative overflow-hidden gap-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="flex items-center gap-3 sm:gap-4 relative z-10 w-full sm:w-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <Shield size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-xl font-black leading-tight truncate">لوحة تحكم المشرف</h2>
              <p className="text-[9px] sm:text-xs opacity-80 font-bold mt-0.5">إدارة الأطباء وتعديل المواعيد والحالات</p>
            </div>
          </div>
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[10px] sm:text-xs transition-all cursor-pointer border border-white/20 active:scale-95 shrink-0 relative z-10 w-full sm:w-auto justify-center"
          >
            <ArrowRight size={14} className="sm:w-4 sm:h-4" />
            <span>العودة للجدول الرئيسي</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col p-3 sm:p-6 lg:p-8 space-y-6 bg-slate-50/30">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4">
              <div className="relative">
                <Loader2 className="animate-spin text-brand-blue" size={40} />
                <div className="absolute inset-0 bg-brand-blue/10 blur-xl rounded-full" />
              </div>
              <p className="font-black text-slate-400 text-[10px] sm:text-xs tracking-widest uppercase">جاري التحقق من الصلاحيات</p>
            </div>
          ) : !isAdmin ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full py-12 sm:py-16 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="mb-8 sm:mb-10 relative">
                 <div className="w-20 h-20 sm:w-24 sm:h-24 bg-brand-blue/5 rounded-3xl flex items-center justify-center text-brand-blue shadow-inner relative z-10">
                    <LogIn size={36} className="sm:w-10 sm:h-10" />
                 </div>
                 <div className="absolute -inset-6 bg-brand-blue/5 blur-3xl rounded-full animate-pulse" />
              </div>
              
              <div className="space-y-3 mb-8 sm:mb-10">
                <h3 className="text-xl sm:text-2xl font-black text-navy">تسجيل دخول المشرف</h3>
                <p className="text-slate-400 font-bold text-[10px] sm:text-xs leading-relaxed">
                  قم بتسجيل الدخول بكلمة المرور السرية المعتمدة للإدارة أو حساب Google.
                </p>
              </div>

              <form onSubmit={handlePasswordLogin} className="w-full space-y-4 sm:space-y-5">
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-blue transition-colors">
                    <Shield size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="أدخل كلمة المرور السرية"
                    className="w-full pr-10 sm:pr-12 pl-4 sm:pl-5 py-3.5 sm:py-4.5 rounded-xl sm:rounded-2xl border-2 border-slate-100 font-black text-base sm:text-lg bg-white focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 transition-all text-center placeholder:text-slate-200 placeholder:font-bold placeholder:text-xs sm:placeholder:text-sm shadow-sm"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-blue text-white py-3.5 sm:py-4.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-xl shadow-brand-blue/20 hover:bg-brand-blue-dark transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <span>تسجيل الدخول بكلمة المرور</span>
                </button>
              </form>

              {error && (
                <div className="mt-6 sm:mt-8 w-full bg-red-50 text-brand-red p-4 rounded-xl flex items-center gap-3 border border-red-100 font-bold text-[10px] sm:text-[11px] animate-in slide-in-from-top-2">
                  <AlertTriangle size={14} className="sm:w-4 sm:h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Admin Status & Controls - Optimized for Mobile */}
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between border border-slate-200 shadow-sm gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-blue border border-slate-100 shadow-inner shrink-0">
                    <Shield size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-navy text-xs sm:text-base truncate">
                      {user ? user.displayName || user.email : "مشرف النظام (كلمة المرور)"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${getCachedToken() ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        جوجل تقويم: {getCachedToken() ? "متصل" : "غير متصل"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row items-center gap-2 sm:gap-3">
                  {!getCachedToken() && (
                    <button 
                      onClick={handleGoogleLogin} 
                      disabled={isGoogleLoading}
                      className="flex-1 md:flex-none px-3 sm:px-5 py-2 sm:py-2.5 bg-white text-brand-blue border border-brand-blue/20 hover:bg-blue-50 transition-all rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {isGoogleLoading ? <Loader2 className="animate-spin" size={12} /> : <Calendar size={12} />}
                      <span>ربط جوجل</span>
                    </button>
                  )}
                  <button 
                    onClick={handleLogout} 
                    className="px-3 sm:px-5 py-2 sm:py-2.5 bg-red-50 text-brand-red hover:bg-brand-red hover:text-white border border-red-100 transition-all rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <LogOut size={12} />
                    <span>خروج</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs - Modern Sliding Look */}
              <div className="flex p-1 bg-slate-200/50 rounded-xl sm:rounded-2xl border border-slate-200">
                <button
                  onClick={() => setActiveTab("manage")}
                  className={`flex-1 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-sm transition-all cursor-pointer ${activeTab === "manage" ? "bg-white text-brand-blue shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                >
                  إدارة الجداول
                </button>
                <button
                  onClick={() => setActiveTab("add")}
                  className={`flex-1 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-sm transition-all cursor-pointer ${activeTab === "add" ? "bg-white text-brand-blue shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                >
                  إضافة طبيب
                </button>
              </div>

              {activeTab === "add" ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  <form onSubmit={handleAddDoctorAppointment} className="bg-white p-4 sm:p-10 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-md space-y-6 sm:space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-blue/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-blue shadow-inner shrink-0">
                        <Plus size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-navy text-sm sm:text-lg leading-tight">إضافة موعد جديد</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">أدخل بيانات الموعد لإدراجه في الجدول</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-[10px] sm:text-xs font-black text-slate-500 pr-1 flex items-center gap-1.5">
                          <Building2 size={10} className="text-brand-blue sm:w-3 sm:h-3" />
                          <span>التخصص / العيادة</span>
                        </label>
                        <select
                          value={selectedCalendarId}
                          onChange={(e) => setSelectedCalendarId(e.target.value)}
                          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-50 font-bold text-xs sm:text-sm bg-slate-50/50 focus:outline-none focus:border-brand-blue focus:bg-white transition-all cursor-pointer shadow-sm"
                        >
                          {calendars.map(cal => (
                            <option key={cal.id} value={cal.id}>{cal.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-[10px] sm:text-xs font-black text-slate-500 pr-1 flex items-center gap-1.5">
                          <Stethoscope size={10} className="text-brand-blue sm:w-3 sm:h-3" />
                          <span>اسم الطبيب</span>
                        </label>
                        <input
                          type="text"
                          value={doctorName}
                          onChange={(e) => setDoctorName(e.target.value)}
                          placeholder="مثال: د. أحمد محمد"
                          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-50 font-bold text-xs sm:text-sm bg-slate-50/50 focus:outline-none focus:border-brand-blue focus:bg-white transition-all shadow-sm"
                          required
                        />
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-[10px] sm:text-xs font-black text-slate-500 pr-1 flex items-center gap-1.5">
                          <Calendar size={10} className="text-brand-blue sm:w-3 sm:h-3" />
                          <span>تاريخ الموعد</span>
                        </label>
                        <input
                          type="date"
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-50 font-bold text-xs sm:text-sm bg-slate-50/50 focus:outline-none focus:border-brand-blue focus:bg-white transition-all shadow-sm"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                          <label className="text-[10px] sm:text-xs font-black text-slate-500 pr-1">البداية</label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-50 font-bold text-xs sm:text-sm bg-slate-50/50 focus:outline-none focus:border-brand-blue focus:bg-white transition-all shadow-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <label className="text-[10px] sm:text-xs font-black text-slate-500 pr-1">النهاية</label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-50 font-bold text-xs sm:text-sm bg-slate-50/50 focus:outline-none focus:border-brand-blue focus:bg-white transition-all shadow-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recurrence Control */}
                    <div className="bg-blue-50/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-blue-100/50 space-y-4 sm:space-y-6">
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 sm:gap-4 cursor-pointer group flex-1">
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isRecurring ? 'bg-brand-blue border-brand-blue shadow-lg shadow-brand-blue/20' : 'bg-white border-slate-300 group-hover:border-brand-blue'}`}>
                            {isRecurring && <Check size={12} className="text-white" />}
                          </div>
                          <input 
                            type="checkbox" 
                            checked={isRecurring} 
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="sr-only"
                          />
                          <div className="min-w-0">
                            <span className="text-[11px] sm:text-sm font-black text-navy block">تكرار الموعد</span>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold">إنشاء سلسلة مواعيد متكررة</p>
                          </div>
                        </label>
                        {isRecurring && (
                          <span className="text-[8px] sm:text-[10px] font-black text-white bg-brand-blue px-2 sm:px-4 py-1 rounded-full uppercase tracking-widest shadow-sm animate-in zoom-in-50 shrink-0">نشط</span>
                        )}
                      </div>

                      {isRecurring && (
                        <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t border-blue-100/50 animate-in fade-in slide-in-from-top-2 duration-400">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 sm:space-y-2">
                              <label className="text-[10px] sm:text-xs font-black text-slate-500 pr-1 uppercase tracking-wider">نظام التكرار:</label>
                              <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs bg-white outline-none focus:border-brand-blue"
                              >
                                <option value="weekly">أسبوعي</option>
                                <option value="daily">يومي</option>
                              </select>
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                              <label className="text-[10px] sm:text-xs font-black text-slate-500 pr-1 uppercase tracking-wider">تاريخ الانتهاء:</label>
                              <input
                                type="date"
                                value={untilDate}
                                onChange={(e) => setUntilDate(e.target.value)}
                                className="w-full px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 border-slate-50 font-bold text-xs sm:text-sm bg-white focus:outline-none focus:border-brand-blue transition-all shadow-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-[10px] sm:text-xs font-black text-slate-500 pr-1 uppercase tracking-wider">أيام التكرار:</p>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
                              {["ح", "ن", "ث", "ر", "خ", "ج", "س"].map((day, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (selectedDays.includes(idx)) setSelectedDays(prev => prev.filter(d => d !== idx));
                                    else setSelectedDays(prev => [...prev, idx].sort());
                                  }}
                                  className={`py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm border transition-all active:scale-90 ${selectedDays.includes(idx) ? "bg-brand-blue text-white border-brand-blue shadow-xl shadow-brand-blue/10" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-100"}`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] sm:text-xs font-black text-slate-500 pr-1 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle size={10} className="text-amber-500 sm:w-3 sm:h-3" />
                        <span>حالة الطبيب</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
                            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer active:scale-[0.97] flex flex-col items-center gap-1 sm:gap-1.5 ${appointmentStatus === st.id ? "bg-brand-blue text-white border-brand-blue shadow-xl shadow-brand-blue/10" : "bg-white text-slate-600 border-slate-100"}`}
                          >
                            <span className="text-base sm:text-lg">{st.icon}</span>
                            <span className="text-[10px] sm:text-xs font-black">{st.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-brand-blue text-white py-4 sm:py-5 rounded-xl sm:rounded-[2rem] font-black text-sm sm:text-base shadow-2xl shadow-brand-blue/20 flex items-center justify-center gap-3 sm:gap-4 hover:bg-brand-blue-dark transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                      <span>إضافة الطبيب وحفظ الموعد</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  {/* Stats Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-brand-blue/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-blue shadow-inner shrink-0">
                        <Stethoscope size={24} className="sm:w-7 sm:h-7" />
                      </div>
                      <div>
                        <h4 className="font-black text-navy text-sm sm:text-xl leading-tight">إدارة الجدول الحالية</h4>
                        <p className="text-[9px] sm:text-xs text-slate-400 font-bold mt-0.5">تعديل مواعيد وحالات الأطباء المسجلين</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="bg-slate-50 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-100 flex flex-col items-center">
                          <span className="text-sm sm:text-xl font-black text-brand-blue leading-none">
                            {getGroupedDoctors().reduce((acc, curr) => acc + Object.keys(curr[1]).length, 0)}
                          </span>
                          <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5 sm:mt-1">طبيب مسجل</span>
                       </div>
                    </div>
                  </div>

                  {/* Search and Controls */}
                  <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <Search size={16} />
                      </div>
                      <input
                        type="text"
                        value={doctorSearchQuery}
                        onChange={(e) => setDoctorSearchQuery(e.target.value)}
                        placeholder="ابحث عن طبيب بالاسم..."
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:outline-none focus:border-brand-blue focus:bg-white transition-all text-sm font-bold"
                      />
                      {doctorSearchQuery && (
                        <button onClick={() => setDoctorSearchQuery("")} className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-brand-red">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button onClick={() => expandAll(getGroupedDoctors())} className="flex-1 sm:flex-none px-4 py-2 bg-blue-50 text-brand-blue hover:bg-brand-blue hover:text-white rounded-xl font-black text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95">
                        <ChevronsDown size={14} />
                        <span>توسيع الكل</span>
                      </button>
                      <button onClick={collapseAll} className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-200 rounded-xl font-black text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95">
                        <ChevronsUp size={14} />
                        <span>طي الكل</span>
                      </button>
                    </div>
                  </div>

                  {/* Grouped Grid */}
                  <div className="space-y-4">
                    {getGroupedDoctors().map(([specialty, doctorsMap]) => (
                      <div key={specialty} className="space-y-3">
                        <button 
                          onClick={() => toggleClinic(specialty)}
                          className="w-full flex items-center gap-2 sm:gap-3 px-1 hover:opacity-80 transition-opacity"
                        >
                           <div className="w-1.5 h-5 sm:w-2 sm:h-6 bg-brand-blue rounded-full shadow-sm" />
                           <h5 className="font-black text-navy text-sm sm:text-lg tracking-tight">{specialty}</h5>
                           <div className="h-px flex-1 bg-slate-200/60" />
                           <div className="flex items-center gap-2">
                             <span className="text-[8px] sm:text-[10px] font-black text-slate-400 bg-white border border-slate-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm">
                               {Object.keys(doctorsMap).length} أطباء
                             </span>
                             <div className={`p-1 rounded-md bg-slate-100 text-slate-400 transition-transform ${expandedClinics[specialty] ? 'rotate-180' : ''}`}>
                               <ChevronDown size={14} />
                             </div>
                           </div>
                        </button>
                        
                        <AnimatePresence>
                          {expandedClinics[specialty] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-2 pt-1">
                                {Object.values(doctorsMap).map((doc, idx) => (
                                  <div key={idx} className="bg-white p-3 rounded-xl sm:rounded-2xl border border-slate-100 hover:bg-slate-50/50 transition-all flex items-center gap-3 group relative shadow-sm">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 text-brand-blue flex items-center justify-center font-black text-sm sm:text-base shrink-0 border border-slate-200 shadow-inner group-hover:scale-105 transition-transform">
                                      {doc.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-col">
                                         <h5 className="font-black text-navy text-[13px] sm:text-[15px] truncate leading-tight group-hover:text-brand-blue transition-colors">
                                           {doc.name}
                                         </h5>
                                         <div className="flex items-center gap-3 mt-1.5">
                                            <button 
                                              onClick={() => setSelectedDoctorForSchedule({ name: doc.name, specialty: doc.specialty, calendarId: doc.calendarId })}
                                              className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-amber-600 hover:text-white hover:bg-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 transition-all cursor-pointer active:scale-95"
                                            >
                                              <Pencil size={11} />
                                              <span>تعديل الجدول</span>
                                            </button>
                                            <button 
                                              onClick={() => handleDeleteDoctor(doc)}
                                              className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-red-500 hover:text-white hover:bg-red-500 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 transition-all cursor-pointer active:scale-95"
                                            >
                                              <Trash2 size={11} />
                                              <span>حذف</span>
                                            </button>
                                         </div>
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-left">
                                      <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                                        <span className="text-xs sm:text-sm font-black text-brand-blue">{doc.events.length}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">موعد</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}

                    {getGroupedDoctors().length === 0 && (
                      <div className="py-20 sm:py-32 text-center space-y-4 sm:space-y-5 bg-white rounded-2xl border border-dashed border-slate-200 shadow-inner">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200 shadow-sm">
                           <Stethoscope size={32} className="sm:w-10 sm:h-10" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-slate-500 font-black text-sm uppercase tracking-widest px-4">
                            لم يتم العثور على أطباء
                          </p>
                        </div>
                        <button 
                          onClick={() => setDoctorSearchQuery("")}
                          className="mt-2 px-6 py-2 bg-brand-blue text-white rounded-xl font-black text-xs hover:bg-brand-blue-dark transition-all cursor-pointer"
                        >
                          إلغاء البحث
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer info - Optimized */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-brand-blue sm:w-3.5 sm:h-3.5" />
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">لوحة التحكم الآمنة • إصدار 2.5</p>
           </div>
           <div className="flex items-center gap-1 sm:gap-1.5 opacity-20 hidden xs:flex">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-400" />
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-400" />
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-400" />
           </div>
        </div>
      </motion.div>

      {editingEventInfo && (
        <EditEventModal
          isOpen={true}
          onClose={() => setEditingEventInfo(null)}
          event={editingEventInfo.event}
          calendarId={editingEventInfo.calendarId}
          googleAccessToken={getCachedToken()}
          onRefresh={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {selectedDoctorForSchedule && (
        <CompactDoctorScheduleModal
          selectedDoctor={selectedDoctorForSchedule}
          onClose={() => setSelectedDoctorForSchedule(null)}
          initialData={scheduleData}
          calendars={calendars}
          isAdmin={true}
          googleAccessToken={getCachedToken()}
          onRefresh={onRefresh}
          onEditEvent={(ev) => setEditingEventInfo({ event: ev, calendarId: selectedDoctorForSchedule.calendarId })}
        />
      )}

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
