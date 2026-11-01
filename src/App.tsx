/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import { format, addDays, subDays, startOfToday, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { AlertCircle, Printer, Calendar as CalendarIcon, Filter, Settings as SettingsIcon } from "lucide-react";
import Header from "./components/Header.tsx";
import Hero from "./components/Hero.tsx";
import FilterSidebar, { FilterState } from "./components/FilterSidebar.tsx";
import SettingsPanel from "./components/SettingsPanel.tsx";
import ScheduleDisplay from "./components/ScheduleDisplay.tsx";
import SearchModal from "./components/SearchModal.tsx";
import SearchResultsView from "./components/SearchResultsView.tsx";
import NavDrawer from "./components/NavDrawer.tsx";
import AdminPanel from "./components/AdminPanel.tsx";
import Footer from "./components/Footer.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import DatePickerModal from "./components/DatePickerModal.tsx";
import { CALENDARS } from "./constants.ts";
import { CalendarResponse, AppSettings, CalendarInfo } from "./types.ts";
import { auth, getCachedToken, setCachedToken } from "./lib/firebase.ts";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getDefaultCustomEvents } from "./lib/defaultData.ts";

export default function App() {
  const [page, setPage] = useState<"home" | "search" | "admin">("home");
  const [viewMode, setViewMode] = useState<"today" | "week">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalData, setGlobalData] = useState<CalendarResponse[]>([]);
  const [activeDate, setActiveDate] = useState(startOfToday());
  const [startDate, setStartDate] = useState(format(startOfToday(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(startOfToday(), "yyyy-MM-dd"));
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(CALENDARS.map(c => c.id));
  
  // Advanced Filter State
  const [filters, setFilters] = useState<FilterState>({
    doctorQuery: "",
    shift: "all",
    selectedCalendars: CALENDARS.map(c => c.id),
    activeOnly: false,
    dayOfWeek: "all",
  });

  const [loading, setLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<CalendarResponse[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedSpecialties, setExpandedSpecialties] = useState<Record<string, boolean>>({});
  const [selectedDoctor, setSelectedDoctor] = useState<{ name: string; specialty: string } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Admin and Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [dynamicCalendars, setDynamicCalendars] = useState<CalendarInfo[]>(CALENDARS);

  useEffect(() => {
    const fetchColors = async () => {
      if (!googleAccessToken) return;
      try {
        const response = await axios.get("/api/schedule?token=" + googleAccessToken);
        const calendarList = response.data;
        
        const updated = CALENDARS.map(cal => {
          const match = calendarList.find((c: any) => c.id === cal.id);
          if (match) {
            return {
              ...cal,
              backgroundColor: match.backgroundColor,
              foregroundColor: match.foregroundColor,
              color: match.backgroundColor
            };
          }
          return cal;
        });
        setDynamicCalendars(updated);
        setFilters(prev => ({ ...prev, selectedCalendars: updated.map(c => c.id) }));
      } catch (err) {
        console.error("Error fetching dynamic colors:", err);
      }
    };
    fetchColors();
  }, [googleAccessToken]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const response = await axios.post("/api/check-admin", { email: user.email });
          setIsAdmin(response.data.isAdmin);
        } catch (err) {
          console.warn("Admin check failed:", err);
          setIsAdmin(false);
        }
        // Try to recover token if we just signed in
        const token = getCachedToken();
        if (token) setGoogleAccessToken(token);
      } else {
        setIsAdmin(false);
        setGoogleAccessToken(null);
        setCachedToken(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleSelectDoctor = (name: string, specialty: string) => {
    setPage("home");
    setViewMode("week");
    setSelectedDoctor({ name, specialty });
    setIsSearchModalOpen(false);
  };

  const handleSelectSpecialty = (specialty: string) => {
    setPage("home");
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

  const cacheRef = useRef<Record<string, { data: CalendarResponse[]; timestamp: number }>>({});

  const fetchGlobalSearchData = useCallback(async () => {
    if (globalData.length > 0) return; 
    
    setGlobalLoading(true);
    const { start, end } = getWeekRange();
    try {
      const response = await axios.post("/api/schedule", {
        calendarIds: CALENDARS.map(c => c.id),
        timeMin: new Date(start).toISOString(),
        timeMax: new Date(end + "T23:59:59Z").toISOString(),
      });
      const data = response.data;

      setGlobalData(data);
    } catch (err) {
      console.error("Global search fetch error:", err);
    } finally {
      setGlobalLoading(false);
    }
  }, [getWeekRange, globalData.length]);

  useEffect(() => {
    if (isSearchModalOpen) {
      fetchGlobalSearchData();
    }
  }, [isSearchModalOpen, fetchGlobalSearchData]);

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setPage("search");
    setIsSearchModalOpen(false);
    fetchGlobalSearchData();
  };

  const fetchSchedule = useCallback(async (startOverride?: string, endOverride?: string) => {
    const displayStart = startOverride || startDate;
    const displayEnd = endOverride || endDate;

    const targetCalendars = filters.selectedCalendars.length > 0 
      ? filters.selectedCalendars 
      : selectedCalendars;

    if (targetCalendars.length === 0) {
      alert("يرجى اختيار عيادة واحدة على الأقل");
      return;
    }

    const { start: fetchStart, end: fetchEnd } = getWeekRange(parseISO(displayStart));
    const cacheKey = `${fetchStart}_${fetchEnd}_${targetCalendars.sort().join(",")}`;
    
    // Simple 60s cache using ref
    const cached = cacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < 60000) {
      setScheduleData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/schedule", {
        calendarIds: targetCalendars,
        timeMin: new Date(fetchStart).toISOString(),
        timeMax: new Date(fetchEnd + "T23:59:59Z").toISOString(),
      });
      
      const apiData = response.data;

      setScheduleData(apiData);
      cacheRef.current[cacheKey] = { data: apiData, timestamp: Date.now() };
    } catch (err: any) {
      console.error("Fetch error:", err);
      const serverMessage = err.response?.data?.error;
      const statusText = err.response?.statusText;
      setError(serverMessage || (err.response?.status === 404 ? "فشل الوصول إلى خدمة المواعيد (404)" : `عذراً، حدث خطأ أثناء تحميل البيانات (${statusText || err.message}). يرجى المحاولة لاحقاً.`));
    } finally {
      setLoading(false);
      setIsSidebarOpen(false);
    }
  }, [filters.selectedCalendars, selectedCalendars, startDate, endDate, getWeekRange]);

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

  const handlePrint = () => {
    window.print();
  };

  const displayDateText = useMemo(() => {
    if (viewMode === "today") {
      return format(activeDate, "eeee، d MMMM yyyy", { locale: ar });
    }
    try {
      const { start, end } = getWeekRange(activeDate);
      const s = parseISO(start);
      const e = parseISO(end);
      return `${format(s, "EEEE d MMMM", { locale: ar })} - ${format(e, "EEEE d MMMM yyyy", { locale: ar })}`;
    } catch {
      return "الجدول الأسبوعي الكامل";
    }
  }, [viewMode, activeDate, getWeekRange]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-main" dir="rtl">
      <Header 
        onSearchClick={() => setIsSearchModalOpen(true)} 
        onMenuClick={() => setIsNavMenuOpen(true)} 
        onOpenAdmin={() => setPage("admin")} 
        onNavigateHome={() => {
          setPage("home");
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
      {page === "home" && <Hero />}
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-6 gap-3 sm:gap-6 flex flex-col min-w-0">
        {page === "admin" ? (
          <AdminPanel 
            onRefresh={() => fetchSchedule()}
            onTokenReceived={setGoogleAccessToken}
            onBackToHome={() => setPage("home")}
            scheduleData={scheduleData}
            calendars={dynamicCalendars}
          />
        ) : page === "search" ? (
          <SearchResultsView 
            query={searchQuery}
            onBack={() => setPage("home")}
            onSelectDoctor={handleSelectDoctor}
            onSelectSpecialty={handleSelectSpecialty}
            allData={globalData}
            loading={globalLoading}
            calendars={dynamicCalendars}
          />
        ) : (
          <div className="space-y-4 sm:space-y-6 w-full">
            {/* View Controls Toolbar Sticky Container */}
            <div className="sticky top-14 sm:top-16 z-40 bg-bg-main/95 backdrop-blur-xs py-1.5 sm:py-0 transition-all">
              <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
                  {/* View Modes Toggle */}
                  <div className="flex p-0.5 bg-slate-100 rounded-lg sm:rounded-xl shrink-0 w-full md:w-auto">
                    <button
                      onClick={() => setViewMode("today")}
                      className={`flex-1 md:flex-none px-4 sm:px-5 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-black text-xs transition-all cursor-pointer ${viewMode === "today" ? "bg-white text-brand-blue shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      جدول اليوم
                    </button>
                    <button
                      onClick={() => setViewMode("week")}
                      className={`flex-1 md:flex-none px-4 sm:px-5 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-black text-xs transition-all cursor-pointer ${viewMode === "week" ? "bg-white text-brand-blue shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      جدول الأسبوع
                    </button>
                  </div>

                  {/* Middle: Centered Date Info Pill */}
                  <div 
                    onClick={() => setIsDatePickerOpen(true)}
                    className="flex items-center justify-center gap-2 text-navy cursor-pointer bg-slate-50 hover:bg-blue-50/70 px-4 py-2 rounded-xl border border-slate-200/80 transition-all shadow-2xs w-full md:w-auto text-center"
                    title="انقر لفتح التقويم والانتقال لتاريخ محدد"
                  >
                    <CalendarIcon className="text-brand-red w-4 h-4 shrink-0" />
                    <span className="font-black text-xs sm:text-sm leading-tight text-navy">
                      {displayDateText}
                    </span>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full md:w-auto">
                    <button 
                      onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${isSettingsOpen ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600 hover:text-brand-blue'}`}
                      title="إعدادات العرض"
                      aria-label="إعدادات العرض"
                    >
                      <SettingsIcon size={15} />
                    </button>
                    <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${isSidebarOpen ? 'bg-brand-blue text-white shadow-xs' : 'bg-brand-blue text-white hover:bg-brand-blue-dark shadow-2xs'}`}
                    >
                      <Filter size={13} />
                      <span>تصفية المواعيد</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div id="schedule" className="w-full scroll-mt-24">
              <div className="space-y-6 w-full">
                <SettingsPanel 
                  isOpen={isSettingsOpen} 
                  onClose={() => setIsSettingsOpen(false)} 
                  settings={settings} 
                  onSettingsChange={setSettings} 
                />

                {error && (
                  <div className="bg-brand-red-light border border-brand-red/20 text-brand-red p-5 rounded-2xl flex items-center gap-3 animate-in fade-in">
                    <AlertCircle size={22} className="shrink-0" />
                    <p className="font-bold text-xs sm:text-sm">{error}</p>
                  </div>
                )}

                <div className="relative">
                  {loading && (
                    <div className="space-y-4 animate-pulse">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 h-20 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 rounded-xl"></div>
                            <div className="space-y-1.5">
                              <div className="h-4 w-28 bg-slate-100 rounded-md"></div>
                              <div className="h-3 w-16 bg-slate-100 rounded-md"></div>
                            </div>
                          </div>
                          <div className="h-8 w-24 bg-slate-100 rounded-xl"></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!loading && scheduleData.length > 0 && (
                    <div className="animate-in fade-in duration-300">
                      <ScheduleDisplay 
                        data={scheduleData}
                        startDate={startDate}
                        endDate={endDate}
                        settings={settings}
                        viewMode={viewMode}
                        onPrevDay={handlePrevDay}
                        onNextDay={handleNextDay}
                        onDateSelect={(date) => setActiveDate(date)}
                        onOpenDatePicker={() => setIsDatePickerOpen(true)}
                        activeDate={activeDate}
                        expandedSpecialties={expandedSpecialties}
                        setExpandedSpecialties={setExpandedSpecialties}
                        selectedDoctor={selectedDoctor}
                        setSelectedDoctor={setSelectedDoctor}
                        isAdmin={isAdmin}
                        googleAccessToken={googleAccessToken}
                        onRefresh={() => {
                          cacheRef.current = {};
                          fetchSchedule();
                        }}
                        calendars={dynamicCalendars}
                        filters={filters}
                        onViewModeChange={setViewMode}
                      />
                    </div>
                  )}

                  {!loading && scheduleData.length === 0 && !error && (
                    <div className="text-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
                      <div className="max-w-xs mx-auto space-y-3">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                          <CalendarIcon size={28} />
                        </div>
                        <p className="text-navy font-black text-sm">لم يتم العثور على مواعيد مع معايير التصفية الحالية.</p>
                        <p className="text-slate-400 font-bold text-xs">جرب تغيير اسم الطبيب، الفترة الزمنية، أو اختيار جميع العيادات.</p>
                        <button
                          onClick={() => {
                            setFilters({
                              doctorQuery: "",
                              shift: "all",
                              selectedCalendars: dynamicCalendars.map(c => c.id),
                              activeOnly: false,
                              dayOfWeek: "all",
                            });
                            fetchSchedule();
                          }}
                          className="mt-2 bg-brand-blue text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-brand-blue-dark transition-all cursor-pointer"
                        >
                          عرض كافة العيادات والمواعيد
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modern Slide-Over Filter Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end p-2 sm:p-4 bg-navy/60 backdrop-blur-xs transition-all" dir="rtl">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative w-full max-w-md h-full z-10 animate-in slide-in-from-left-4 duration-300">
            <FilterSidebar
              startDate={startDate}
              endDate={endDate}
              filters={filters}
              onFilterChange={(newF) => setFilters(prev => ({ ...prev, ...newF }))}
              onDateChange={handleDateChange}
              onResetFilters={() => {
                setFilters({
                  doctorQuery: "",
                  shift: "all",
                  selectedCalendars: dynamicCalendars.map(c => c.id),
                  activeOnly: false,
                  dayOfWeek: "all",
                });
              }}
              onApply={() => {
                setSelectedCalendars(filters.selectedCalendars);
                fetchSchedule();
                setIsSidebarOpen(false);
              }}
              calendars={dynamicCalendars}
              onClose={() => setIsSidebarOpen(false)}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Floating Scroll To Top Button */}
      <ScrollToTop />

      <Footer />
      
      <NavDrawer 
        isOpen={isNavMenuOpen} 
        onClose={() => setIsNavMenuOpen(false)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenFilters={() => setIsSidebarOpen(true)}
        onOpenAdmin={() => setPage("admin")}
        calendars={dynamicCalendars}
        onSelectSpecialty={handleSelectSpecialty}
        onSelectViewMode={setViewMode}
      />

      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        data={globalData.length > 0 ? globalData : scheduleData}
        onSelectDoctor={handleSelectDoctor}
        onSelectSpecialty={handleSelectSpecialty}
        onSearchSubmit={handleSearchSubmit}
        loading={globalLoading}
        calendars={dynamicCalendars}
      />

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={activeDate}
        onSelectDate={(date) => setActiveDate(date)}
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
