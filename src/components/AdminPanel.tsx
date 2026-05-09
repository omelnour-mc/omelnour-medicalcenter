/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { LogIn, LogOut, Shield, Check, X, AlertTriangle, AlertCircle, Save, Loader2, Calendar } from "lucide-react";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase.ts";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onTokenReceived: (token: string) => void;
}

export default function AdminPanel({ isOpen, onClose, onRefresh, onTokenReceived }: AdminPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check admin status in Firestore
        const adminDoc = await getDoc(doc(db, "admins", u.uid));
        
        // Bootstrap: If specific email, auto-make admin
        if (u.email === "omelnour.medicalcenter@gmail.com" && !adminDoc.exists()) {
          await setDoc(doc(db, "admins", u.uid), {
            email: u.email,
            createdAt: serverTimestamp()
          });
          setIsAdmin(true);
        } else {
          setIsAdmin(adminDoc.exists());
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      // @ts-ignore - access token is in the credential
      const credential = googleProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        onTokenReceived(credential.accessToken);
      }
    } catch (err: any) {
      setError("فشل تسجيل الدخول: " + err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 sm:p-8" dir="rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-navy/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 bg-brand-blue text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">لوحة تحكم المشرف</h2>
                <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">تعديل مواعيد الأطباء مباشرة</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-brand-blue" size={40} />
                <p className="font-black text-slate/40">جاري التحقق من الصلاحيات...</p>
              </div>
            ) : !user ? (
              <div className="text-center py-10 space-y-8">
                <div className="w-24 h-24 bg-brand-blue/5 rounded-full flex items-center justify-center mx-auto">
                  <LogIn size={48} className="text-brand-blue/20" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-navy">تسجيل دخول المشرف</h3>
                  <p className="text-slate/60 font-bold max-w-sm mx-auto">يرجى تسجيل الدخول باستخدام حساب Google المعتمد لإدارة المواعيد.</p>
                </div>
                <button
                  onClick={handleLogin}
                  className="bg-brand-blue text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand-blue/20 flex items-center gap-4 mx-auto hover:scale-105 active:scale-95 transition-all"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
                  تسجيل الدخول بجوجل
                </button>
              </div>
            ) : !isAdmin ? (
              <div className="text-center py-10 space-y-6">
                <AlertCircle size={64} className="text-brand-red mx-auto opacity-20" />
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-brand-red">عذراً، لا تمتلك صلاحيات كافية</h3>
                  <p className="text-slate/60 font-bold">حسابك ({user.email}) غير مدرج في قائمة المشرفين.</p>
                </div>
                <button onClick={handleLogout} className="text-brand-blue font-black underline">تسجيل خروج</button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-slate/5 p-6 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={user.photoURL || ""} className="w-12 h-12 rounded-xl shadow-sm" alt="Profile" />
                    <div>
                      <p className="font-black text-navy">{user.displayName}</p>
                      <p className="text-[10px] font-bold text-slate/40 uppercase">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="p-3 text-slate/40 hover:text-brand-red transition-colors">
                    <LogOut size={20} />
                  </button>
                </div>

                <div className="bg-brand-blue/5 border border-brand-blue/10 p-6 rounded-3xl">
                  <h4 className="font-black text-brand-blue mb-4 flex items-center gap-2">
                    <Calendar size={18} />
                    طريقة التعديل
                  </h4>
                  <ul className="text-sm font-bold text-navy/70 space-y-3 list-disc pr-4">
                    <li>تعديل المواعيد يتم من خلال الضغط على اسم الطبيب في الجدول الرئيسي واختيار "تعديل الحالة".</li>
                    <li>يتم تحديث Google Calendar مباشرة بالحالة المختارة.</li>
                    <li>تأكد من اختيار الحالة المناسبة (متواجد، اعتذر، تأخير، إلخ).</li>
                  </ul>
                </div>

                {error && (
                  <div className="bg-brand-red/10 text-brand-red p-4 rounded-2xl flex items-center gap-3 border border-brand-red/20 font-bold text-sm">
                    <AlertTriangle size={18} />
                    {error}
                  </div>
                )}

                <div className="pt-4 flex justify-center">
                  <p className="text-[10px] font-black text-slate/30 uppercase tracking-[0.2em]">أنت الآن في وضع الإدارة</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
