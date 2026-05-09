/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Stethoscope, ClipboardList, PhoneCall, ShieldCheck } from "lucide-react";

export default function Hero() {
  const services = [
    { title: "عيادات تخصصية", icon: Stethoscope, color: "bg-brand-blue/10 text-brand-blue" },
    { title: "متابعة المواعيد", icon: ClipboardList, color: "bg-brand-red/10 text-brand-red" },
    { title: "دعم الحجز", icon: PhoneCall, color: "bg-amber-50 text-amber-600" },
    { title: "رعاية آمنة", icon: ShieldCheck, color: "bg-green-50 text-green-600" },
  ];

  return (
    <section className="bg-white border-b border-slate/5 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-right space-y-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-blue/5 rounded-full text-brand-blue font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em]"
          >
            <span className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
            مركز أم النور الطبي التخصصي
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-navy leading-tight tracking-tight max-w-3xl"
          >
            دقة في المواعيد، <span className="text-brand-blue">رعاية</span> طبية تثق بها
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate/60 font-bold max-w-2xl leading-relaxed"
          >
            نظام عرض مواعيد العيادات التخصصية المطور. تابع تواجد الأطباء مباشرة وحافظ على دقة جدولك الصحي معنا.
          </motion.p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pb-4">
          {services.map((service, idx) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * idx }}
              className="bg-slate/5 hover:bg-white hover:shadow-xl hover:shadow-slate/10 p-5 sm:p-6 rounded-3xl border border-transparent hover:border-slate/10 transition-all group flex flex-col items-center md:items-start text-center md:text-right gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${service.color} group-hover:scale-110 transition-transform`}>
                <service.icon size={24} />
              </div>
              <h3 className="text-sm sm:text-base font-black text-navy">{service.title}</h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
