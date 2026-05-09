/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phone, MapPin, Mail, Globe, Facebook, Instagram, Twitter } from "lucide-react";
import { CONTACT_PHONE } from "../constants.ts";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          {/* Brand Info */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-blue font-black text-2xl shadow-xl shadow-white/5">ON</div>
              <h3 className="text-2xl font-black tracking-tight">مركز أم النور</h3>
            </div>
            <p className="text-slate/60 text-sm leading-relaxed font-bold">
              نلتزم في مركز أم النور الطبي بتقديم أفضل الرعاية الصحية المتكاملة عبر نخبة من أمهر الأطباء والاستشاريين في كافة التخصصات الطبية.
            </p>
            <div className="flex gap-4">
              {[Facebook, Instagram, Twitter].map((Icon, idx) => (
                <a key={idx} href="#" className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-brand-blue transition-all rounded-xl border border-white/5 shadow-lg group">
                  <Icon size={18} className="group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-8">
            <h4 className="text-lg font-black relative pb-2 inline-block">
              روابط هامة
              <span className="absolute bottom-0 right-0 w-12 h-1 bg-brand-red rounded-full"></span>
            </h4>
            <ul className="space-y-4 text-sm font-black text-slate text-opacity-50">
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-brand-red rounded-full"></span> عن المركز</a></li>
              <li><a href="#schedule" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-brand-red rounded-full"></span> بحث المواعيد</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-brand-red rounded-full"></span> فريقنا الطبي</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-brand-red rounded-full"></span> الأسئلة الشائعة</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <h4 className="text-lg font-black relative pb-2 inline-block">
              تواصل مباشر
              <span className="absolute bottom-0 right-0 w-12 h-1 bg-brand-red rounded-full"></span>
            </h4>
            <div className="space-y-6">
              <a href={`tel:${CONTACT_PHONE}`} className="flex items-center gap-4 group bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                <div className="w-12 h-12 rounded-xl bg-brand-red flex items-center justify-center text-white shadow-lg shadow-brand-red/20 group-hover:scale-110 transition-transform">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-brand-red font-black uppercase tracking-widest pb-1">احصل على استشارة</p>
                  <p className="text-md font-black italic tracking-tighter" dir="ltr">{CONTACT_PHONE}</p>
                </div>
              </a>
              <div className="flex items-center gap-4 group bg-white/5 p-4 rounded-2xl border border-white/5 cursor-default">
                <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-brand-blue font-black uppercase tracking-widest pb-1">الموقع الجغرافي</p>
                  <p className="text-sm font-bold opacity-80">الإسكندرية، مصر</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="space-y-8">
            <h4 className="text-lg font-black relative pb-2 inline-block">
              موقعنا
              <span className="absolute bottom-0 right-0 w-12 h-1 bg-brand-red rounded-full"></span>
            </h4>
            <div id="map" className="h-[200px] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
               <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3412.3456789!2d29.1234567!3d31.1234567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDA3JzM0LjQiTiAyOcKwMDInNDIuNCJF!5e0!3m2!1sen!2seg!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
              ></iframe>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-right">
          <div className="space-y-2">
            <p className="text-[11px] font-black tracking-[0.2em] text-slate/40 uppercase">© {currentYear} Om ElNour Medical Center. All rights reserved.</p>
            <p className="text-[12px] font-bold text-slate/50">Developed by: Dr. Peter Ramsis all right reserved 2024</p>
          </div>
          <div className="flex items-center gap-8 text-[11px] font-black text-slate/40 uppercase tracking-widest">
            <a href="#" className="hover:text-brand-blue transition-colors text-slate/40">Privacy Policy</a>
            <span className="text-brand-red bg-brand-red/10 px-3 py-1 rounded-full">إصدار V1.0.016</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
