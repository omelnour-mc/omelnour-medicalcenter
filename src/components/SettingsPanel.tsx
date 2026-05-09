/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Settings, ChevronDown, ChevronUp, Type, Eye, Maximize2, Sliders } from "lucide-react";
import { AppSettings } from "../types.ts";

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export default function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = (key: keyof AppSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden card-shadow border border-gray-100 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors font-black text-brand-blue"
      >
        <span className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-blue-light flex items-center justify-center text-brand-blue">
            <Sliders size={20} />
          </div>
          تخصيص عرض الجدول
        </span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-top-2 border-t border-gray-50">
          {/* Font Sizes */}
          <div className="space-y-6">
            <h4 className="flex items-center gap-2 text-xs font-black text-brand-blue-dark">
              <Type size={14} className="text-brand-red" />
              أحجام الخطوط
            </h4>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold text-gray-500">
                  <span>خط الجدول</span>
                  <span className="text-brand-blue">{settings.globalFontSize}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={settings.globalFontSize}
                  onChange={(e) => updateSetting("globalFontSize", parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold text-gray-500">
                  <span>خط العناوين</span>
                  <span className="text-brand-blue">{settings.headlineFontSize}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="250"
                  value={settings.headlineFontSize}
                  onChange={(e) => updateSetting("headlineFontSize", parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="space-y-6">
            <h4 className="flex items-center gap-2 text-xs font-black text-brand-blue-dark">
              <Eye size={14} className="text-brand-red" />
              خيارات الظهور
            </h4>
            <div className="space-y-3">
              {[
                { key: "showDatesRow", label: "إظهار التاريخ" },
                { key: "showDayNamesRow", label: "إظهار أسماء الأيام" },
                { key: "showDayAndDate", label: "دمج اليوم والتاريخ" },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-gray-600 group-hover:text-brand-blue transition-colors">
                    {item.label}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={(settings as any)[item.key]}
                      onChange={(e) => updateSetting(item.key as any, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Layout Controls */}
          <div className="space-y-6">
            <h4 className="flex items-center gap-2 text-xs font-black text-brand-blue-dark">
              <Maximize2 size={14} className="text-brand-red" />
              أبعاد العرض
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-bold text-gray-500">
                <span>عرض عمود التخصص</span>
                <span className="text-brand-blue">{settings.headlineWidth}px</span>
              </div>
              <input
                type="range"
                min="100"
                max="400"
                value={settings.headlineWidth}
                onChange={(e) => updateSetting("headlineWidth", parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
