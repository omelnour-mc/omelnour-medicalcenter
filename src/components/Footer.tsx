/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phone, MapPin, Clock, Facebook, Instagram, ChevronLeft, ShieldCheck, Smartphone } from "lucide-react";
import { CONTACT_LANDLINE, CONTACT_MOBILE, CENTER_ADDRESS, CENTER_NAME } from "../constants.ts";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleScrollToSchedule = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("schedule");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-700 mt-16 sm:mt-24 transition-colors font-sans" dir="rtl">
      {/* Top Accent Strip */}
      <div className="h-1 bg-gradient-to-r from-brand-blue via-brand-red to-brand-blue w-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* 1. Medical Center Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center p-1 shrink-0">
                <img 
                  src="/assets/om-elnour-logo.png" 
                  alt="شعار مركز أم النور الطبي" 
                  className="h-9 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-navy tracking-tight leading-tight">
                  مركز أم النور الطبي
                </h3>
                <span className="text-[11px] font-bold text-brand-blue">العصافرة قبلي • رعاية صحية متكاملة</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              صرح طبي متكامل في الإسكندرية يقدم أفضل معايير الرعاية الصحية التخصصية بأحدث التجهيزات الطبية وبإشراف نخبة من كبار الأطباء والاستشاريين.
            </p>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 py-2 rounded-xl border border-slate-200/60 shadow-xs">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>جودة ورعاية طبية معتمدة على مدار الأسبوع</span>
            </div>
          </div>

          {/* 2. Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm sm:text-base font-black text-navy relative pb-2 inline-block">
              روابط سريعة
              <span className="absolute bottom-0 right-0 w-8 h-0.5 bg-brand-red rounded-full"></span>
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-600">
              <li>
                <a 
                  href="#schedule" 
                  onClick={handleScrollToSchedule}
                  className="hover:text-brand-blue transition-colors flex items-center gap-2 group"
                >
                  <ChevronLeft size={14} className="text-brand-red group-hover:-translate-x-1 transition-transform" />
                  بحث المواعيد والعيادات
                </a>
              </li>
              <li>
                <a 
                  href="#schedule" 
                  onClick={handleScrollToSchedule}
                  className="hover:text-brand-blue transition-colors flex items-center gap-2 group"
                >
                  <ChevronLeft size={14} className="text-brand-red group-hover:-translate-x-1 transition-transform" />
                  جدول أطباء الأسبوع
                </a>
              </li>
              <li>
                <a 
                  href="#about"
                  className="hover:text-brand-blue transition-colors flex items-center gap-2 group"
                >
                  <ChevronLeft size={14} className="text-brand-red group-hover:-translate-x-1 transition-transform" />
                  عن المركز الطبي
                </a>
              </li>
            </ul>
          </div>

          {/* 3. Contact Info (Part 8: Confirmed Landline, Mobile, and Address) */}
          <div className="space-y-4">
            <h4 className="text-sm sm:text-base font-black text-navy relative pb-2 inline-block">
              تواصل معنا
              <span className="absolute bottom-0 right-0 w-8 h-0.5 bg-brand-red rounded-full"></span>
            </h4>
            <div className="space-y-2.5">
              {/* Landline */}
              <a 
                href={`tel:${CONTACT_LANDLINE}`} 
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-blue hover:shadow-md transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                  <Phone size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 font-bold">تليفون أرضي</p>
                  <p className="text-xs sm:text-sm font-black text-navy tracking-tight group-hover:text-brand-blue transition-colors" dir="ltr">
                    {CONTACT_LANDLINE}
                  </p>
                </div>
              </a>

              {/* Mobile */}
              <a 
                href={`tel:${CONTACT_MOBILE}`} 
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-red hover:shadow-md transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-red-50 text-brand-red flex items-center justify-center shrink-0 group-hover:bg-brand-red group-hover:text-white transition-colors">
                  <Smartphone size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 font-bold">موبايل للحجز</p>
                  <p className="text-xs sm:text-sm font-black text-navy tracking-tight group-hover:text-brand-red transition-colors" dir="ltr">
                    {CONTACT_MOBILE}
                  </p>
                </div>
              </a>

              {/* Address */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 font-bold">العنوان</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">{CENTER_ADDRESS}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Location Preview & Socials */}
          <div className="space-y-4">
            <h4 className="text-sm sm:text-base font-black text-navy relative pb-2 inline-block">
              موقع المركز والمتابعة
              <span className="absolute bottom-0 right-0 w-8 h-0.5 bg-brand-red rounded-full"></span>
            </h4>
            
            <div className="h-28 rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 relative group">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3412.3456789!2d29.1234567!3d31.1234567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDA3JzM0LjQiTiAyOcKwMDInNDIuNCJF!5e0!3m2!1sar!2seg!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full object-cover filter contrast-[0.95]"
                title="خريطة موقع مركز أم النور الطبي"
              ></iframe>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-2">تابع صفحاتنا الرسمية:</p>
              <div className="flex items-center gap-2">
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="فيسبوك"
                  className="w-9 h-9 flex items-center justify-center bg-white text-slate-600 hover:text-white hover:bg-[#1877F2] rounded-xl border border-slate-200/80 shadow-xs transition-all"
                >
                  <Facebook size={16} />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="انستغرام"
                  className="w-9 h-9 flex items-center justify-center bg-white text-slate-600 hover:text-white hover:bg-[#E4405F] rounded-xl border border-slate-200/80 shadow-xs transition-all"
                >
                  <Instagram size={16} />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <p className="text-xs font-semibold text-slate-500">
            © {currentYear} مركز أم النور الطبي. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <span>Developed by: Dr. Peter Ramsis</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-brand-red font-bold bg-brand-red/10 px-2.5 py-0.5 rounded-full text-[10px]">
              V1.0.028
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
