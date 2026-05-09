/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { format, addDays, subDays, startOfToday, parseISO, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { Loader2, AlertCircle, Printer, Calendar as CalendarIcon, Filter, Shield } from "lucide-react";
import Header from "./components/Header.tsx";
import Hero from "./components/Hero.tsx";
import FilterSidebar from "./components/FilterSidebar.tsx";
import SettingsPanel from "./components/SettingsPanel.tsx";
import ScheduleDisplay from "./components/ScheduleDisplay.tsx";
import SearchModal from "./components/SearchModal.tsx";
import NavDrawer from "./components/NavDrawer.tsx";
import AdminPanel from "./components/AdminPanel.tsx";
import Footer from "./components/Footer.tsx";
import { CALENDARS } from "./constants.ts";
import { CalendarResponse, AppSettings } from "./types.ts";
import { auth, db } from "./lib/firebase.ts";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function App() {
  const [viewMode, setViewMode] = useState<"today" | "week">("today");
  const [activeDate, setActiveDate] = useState(startOfToday());
  const [startDate, setStartDate] = useState(format(startOfToday(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(startOfToday(), "yyyy-MM-dd"));
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(CALENDARS.map(c => c.id));
  const [loading, setLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<CalendarResponse[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Toggleable on desktop
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [expandedSpecialties, setExpandedSpecialties] = useState<Record<string, boolean>>({});
  const [selectedDoctor, setSelectedDoctor] = useState<{ name: string; specialty: string } | null>(null);

  // Admin and Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        setIsAdmin(adminDoc.exists());
      } else {
        setIsAdmin(false);
        setGoogleAccessToken(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleSelectDoctor = (name: string, specialty: string) => {
    setViewMode("week");
    setSelectedDoctor({ name, specialty });
    setIsSearchModalOpen(false);
  };

  const handleSelectSpecialty = (specialty: string) => {
    setViewMode("week");
    setExpandedSpecialties(prev => ({ ...prev, [specialty]: true }));
    setIsSearchModalOpen(false);
    setTimeout(() => {
      const element = document.getElementById(`specialty-${specialty}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

  const [settings, setSettings] = useState<AppSettings>({
    globalFontSize: 100,
    showDatesRow: true,
    showDayNamesRow: true,
    showDayAndDate: false,
    headlineFontSize: 100,
    headlineWidth: 200,
  });

  // Cache for API responses
  const [cache, setCache] = useState<Record<string, { data: CalendarResponse[], timestamp: number }>>({});

  const getWeekRange = useCallback((targetDate?: Date) => {
    const baseDate = targetDate || startOfToday();
    const dayOfWeek = baseDate.getDay(); 
    
    const diffToSat = (dayOfWeek + 1) % 7;
    const saturday = addDays(baseDate, -diffToSat);
    const friday = addDays(saturday, 6);
    
    return {
      start: format(saturday, "yyyy-MM-dd"),
      end: format(friday, "yyyy-MM-dd")
    };
  }, []);

  const fetchSchedule = useCallback(async (startOverride?: string, endOverride?: string) => {
    const displayStart = startOverride || startDate;
    const displayEnd = endOverride || endDate;

    if (selectedCalendars.length === 0) {
      alert("يرجى اختيار عيادة واحدة على الأقل");
      return;
    }

    const { start: fetchStart, end: fetchEnd } = getWeekRange(parseISO(displayStart));
    const cacheKey = `${fetchStart}_${fetchEnd}_${selectedCalendars.sort().join(",")}`;
    
    // Simple 60s cache
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.timestamp < 60000) {
      setScheduleData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/schedule", {
        calendarIds: selectedCalendars,
        timeMin: new Date(fetchStart).toISOString(),
        timeMax: new Date(fetchEnd + "T23:59:59Z").toISOString(),
      });
      
      setScheduleData(response.data);
      setCache(prev => ({
        ...prev,
        [cacheKey]: { data: response.data, timestamp: Date.now() }
      }));
    } catch (err: any) {
      console.error("Fetch error:", err);
      const serverMessage = err.response?.data?.error;
      const statusText = err.response?.statusText;
      setError(serverMessage || `فشل تحميل المواعيد (${statusText || err.message}). يرجى المحاولة مرة أخرى.`);
    } finally {
      setLoading(false);
      setIsSidebarOpen(false); // Close sidebar on mobile after search
    }
  }, [selectedCalendars, startDate, endDate, getWeekRange, cache]);

  // Sync activeDate to startDate/endDate in today mode
  useEffect(() => {
    if (viewMode === "today") {
      const todayStr = format(activeDate, "yyyy-MM-dd");
      setStartDate(todayStr);
      setEndDate(todayStr);
      fetchSchedule(todayStr, todayStr);
    } else if (viewMode === "week") {
      const { start, end } = getWeekRange();
      setStartDate(start);
      setEndDate(end);
      fetchSchedule(start, end);
    }
  }, [viewMode, activeDate, fetchSchedule, getWeekRange]);

  const handlePrevDay = () => {
    setActiveDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setActiveDate(prev => addDays(prev, 1));
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleCalendarToggle = (id: string) => {
    setSelectedCalendars((prev: string[]) => 
      prev.includes(id) ? prev.filter((c: string) => c !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-main" dir="rtl">
      <Header onSearchClick={() => setIsSearchModalOpen(true)} onMenuClick={() => setIsNavMenuOpen(true)} />
      <Hero />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* View Controls Toolbar */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-slate/10 shadow-sm mb-8 sm:mb-12 print:hidden sticky top-4 z-[40]">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
            {/* Left: View Modes */}
            <div className="flex p-1 bg-slate/5 rounded-xl sm:rounded-2xl w-full lg:w-auto">
              <button
                onClick={() => setViewMode("today")}
                className={`flex-1 lg:px-8 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-black text-[13px] sm:text-sm transition-all ${viewMode === "today" ? "bg-white text-brand-blue shadow-lg shadow-brand-blue/5" : "text-slate/40 hover:text-slate"}`}
              >
                جدول اليوم
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`flex-1 lg:px-8 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-black text-[13px] sm:text-sm transition-all ${viewMode === "week" ? "bg-white text-brand-blue shadow-lg shadow-brand-blue/5" : "text-slate/40 hover:text-slate"}`}
              >
                جدول الأسبوع
              </button>
            </div>

            {/* Middle: Date Info */}
            <div className="flex items-center gap-3 sm:gap-4 text-navy">
              <CalendarIcon className="text-brand-blue w-5 h-5 sm:w-6 sm:h-6" />
              <div className="flex flex-col text-right">
                <span className="font-black text-sm sm:text-lg leading-tight">
                  {viewMode === "today" 
                    ? format(activeDate, "eeee، d MMMM yyyy", { locale: ar })
                    : "الجدول الأسبوعي الكامل"
                  }
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate/40 uppercase tracking-widest whitespace-nowrap">
                  {viewMode === "today" ? "عرض المواعيد الحالية" : "عرض مواعيد العيادات التخصصية"}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <button 
                onClick={handlePrint}
                className="flex-1 lg:flex-none p-3 sm:p-4 bg-slate/5 text-slate hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl sm:rounded-2xl transition-all"
                title="طباعة الجدول"
              >
                <Printer className="mx-auto w-[18px] h-[18px] sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`flex-1 lg:flex-none px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[13px] sm:text-sm flex items-center justify-center gap-2 sm:gap-3 transition-all ${isSidebarOpen ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/20' : 'bg-slate/5 text-slate hover:bg-slate/10'}`}
              >
                <Filter className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                <span>خيارات الفلترة</span>
              </button>
            </div>
          </div>
        </div>

        <div id="schedule" className="flex flex-col lg:flex-row gap-8 scroll-mt-32">
          {/* Sidebar */}
          <aside className={`
            fixed inset-0 z-50 lg:relative lg:z-0 shrink-0 transition-all duration-300
            ${isSidebarOpen ? "translate-x-0 w-full lg:w-80 opacity-100 visible" : "translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 invisible lg:pointer-events-none"}
          `}>
            {/* Overlay for mobile */}
            {isSidebarOpen && (
              <div 
                className="absolute inset-0 bg-navy/60 backdrop-blur-sm lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            
            <div className="relative h-full lg:h-auto bg-white lg:bg-transparent overflow-y-auto lg:overflow-visible">
              <FilterSidebar
                startDate={startDate}
                endDate={endDate}
                selectedCalendars={selectedCalendars}
                onDateChange={handleDateChange}
                onCalendarToggle={handleCalendarToggle}
                onSelectAll={() => setSelectedCalendars(CALENDARS.map(c => c.id))}
                onClearAll={() => setSelectedCalendars([])}
                onSearch={fetchSchedule}
                onToday={() => {
                  setViewMode("today");
                  setIsSidebarOpen(false);
                }}
                onClose={() => setIsSidebarOpen(false)}
                loading={loading}
              />
            </div>
          </aside>

          {/* content Area */}
          <div className="flex-1 space-y-8 overflow-hidden">
            <SettingsPanel settings={settings} onSettingsChange={setSettings} />

            {error && (
              <div className="bg-brand-red-light border border-brand-red/20 text-brand-red p-6 rounded-3xl flex items-center gap-4 animate-in fade-in zoom-in-95">
                <AlertCircle size={24} />
                <p className="font-bold">{error}</p>
              </div>
            )}

            <div className="relative">
              {loading && (
                <div className="space-y-6 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate/5 h-24 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate/10 rounded-2xl"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-slate/10 rounded-full"></div>
                          <div className="h-3 w-20 bg-slate/10 rounded-full"></div>
                        </div>
                      </div>
                      <div className="h-10 w-40 bg-slate/10 rounded-2xl"></div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && scheduleData.length > 0 && (
                <div className="animate-in fade-in duration-700">
                  <ScheduleDisplay 
                    data={scheduleData}
                    startDate={startDate}
                    endDate={endDate}
                    settings={settings}
                    viewMode={viewMode}
                    onPrevDay={handlePrevDay}
                    onNextDay={handleNextDay}
                    expandedSpecialties={expandedSpecialties}
                    setExpandedSpecialties={setExpandedSpecialties}
                    selectedDoctor={selectedDoctor}
                    setSelectedDoctor={setSelectedDoctor}
                    isAdmin={isAdmin}
                    googleAccessToken={googleAccessToken}
                    onRefresh={() => fetchSchedule()}
                  />
                  
                  {/* Action Buttons */}
                  <div className="mt-8 flex justify-end gap-4 print:hidden">
                    <button
                      onClick={handlePrint}
                      className="bg-brand-blue/10 text-brand-blue px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-brand-blue hover:text-white transition-all"
                    >
                      <Printer size={18} />
                      طباعة الجدول
                    </button>
                  </div>
                </div>
              )}

              {!loading && scheduleData.length === 0 && !error && (
                <div className="text-center py-32 bg-white border border-gray-100 rounded-3xl card-shadow">
                  <div className="max-w-xs mx-auto space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                      <CalendarIcon size={32} />
                    </div>
                    <p className="text-gray-400 font-bold text-lg">لم يتم العثور على مواعيد للتخصصات المختارة.</p>
                    <p className="text-gray-400 text-sm">حاول تغيير نطاق البحث أو إضافة تخصصات جديدة.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      
      <NavDrawer 
        isOpen={isNavMenuOpen} 
        onClose={() => setIsNavMenuOpen(false)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenFilters={() => setIsSidebarOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
      />

      <AdminPanel 
        isOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)}
        onRefresh={() => fetchSchedule()}
        onTokenReceived={setGoogleAccessToken}
      />

      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        data={scheduleData}
        onSelectDoctor={handleSelectDoctor}
        onSelectSpecialty={handleSelectSpecialty}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          header, aside, .settings-panel, button, section, footer, [id="map"] {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
          }
          main {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .card-shadow {
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
          #schedule {
            margin-top: 0 !important;
          }
          .rounded-3xl {
            border-radius: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
