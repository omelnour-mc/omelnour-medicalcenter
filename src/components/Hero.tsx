/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { CENTER_NAME, CENTER_ADDRESS, CONTACT_LANDLINE, CONTACT_MOBILE } from "../constants.ts";
import { Phone, MapPin, ShieldCheck, Clock } from "lucide-react";

export default function Hero() {
  return (
    <section className="bg-white border-b border-slate-100 py-2.5 sm:py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Official Website Banner (Responsive, preserves aspect ratio without cropping) */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-full rounded-xl sm:rounded-3xl overflow-hidden shadow-xs border border-slate-200/80 bg-slate-50"
        >
          <img 
            src="/assets/om-elnour-banner.jpeg" 
            alt="مركز أم النور الطبي – العصافرة قبلي" 
            className="w-full h-auto object-contain block select-none max-h-[140px] sm:max-h-[200px] md:max-h-[260px] mx-auto"
            loading="eager"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </motion.div>

      </div>
    </section>
  );
}
