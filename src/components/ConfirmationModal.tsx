/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Check, X, Trash2, Save } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "danger" | "primary" | "success";
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  type = "primary"
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const themes = {
    danger: {
      icon: <Trash2 className="text-red-600" size={24} />,
      iconBg: "bg-red-50",
      button: "bg-red-600 hover:bg-red-700 shadow-red-200",
      border: "border-red-100"
    },
    primary: {
      icon: <Save className="text-brand-blue" size={24} />,
      iconBg: "bg-blue-50",
      button: "bg-brand-blue hover:bg-brand-blue-dark shadow-blue-200",
      border: "border-blue-100"
    },
    success: {
      icon: <Check className="text-green-600" size={24} />,
      iconBg: "bg-green-50",
      button: "bg-green-600 hover:bg-green-700 shadow-green-200",
      border: "border-green-100"
    }
  };

  const theme = themes[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-navy/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col p-6 sm:p-8"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`w-16 h-16 ${theme.iconBg} rounded-[1.2rem] flex items-center justify-center shadow-inner`}>
              {theme.icon}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-navy leading-tight">{title}</h3>
              <p className="text-slate-400 font-bold text-xs leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`w-full py-3.5 rounded-xl text-white font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer ${theme.button}`}
            >
              {confirmLabel}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs transition-all active:scale-95 cursor-pointer"
            >
              {cancelLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
