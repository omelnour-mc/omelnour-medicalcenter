import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, inMemoryPersistence, setPersistence } from "firebase/auth";
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Clean up any legacy persistent supervisor keys from browser storage immediately
try {
  localStorage.removeItem("omelnour_supervisor_logged_in");
  localStorage.removeItem("google_calendar_token");
  sessionStorage.removeItem("omelnour_supervisor_logged_in");
  sessionStorage.removeItem("google_calendar_token");
} catch (_) {}

// Enforce inMemoryPersistence so user login/tokens are NEVER written to IndexedDB or disk
setPersistence(auth, inMemoryPersistence).catch((err) => {
  console.warn("inMemoryPersistence setup warning:", err);
});

// Add calendar scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');

// Strict In-Memory Session (never saved to localStorage or IndexedDB)
let inMemoryAccessToken: string | null = null;
let inMemorySupervisorLoggedIn = false;

export const setCachedToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getCachedToken = (): string | null => {
  return inMemoryAccessToken;
};

export const setSupervisorSession = (isAdmin: boolean, token?: string | null) => {
  inMemorySupervisorLoggedIn = isAdmin;
  if (token !== undefined) {
    inMemoryAccessToken = token;
  }
};

export const isSupervisorSessionActive = (): boolean => {
  return inMemorySupervisorLoggedIn;
};

export const clearSupervisorSession = () => {
  inMemorySupervisorLoggedIn = false;
  inMemoryAccessToken = null;
  try {
    localStorage.removeItem("omelnour_supervisor_logged_in");
    localStorage.removeItem("google_calendar_token");
    sessionStorage.removeItem("omelnour_supervisor_logged_in");
    sessionStorage.removeItem("google_calendar_token");
  } catch (_) {}
};

export const googleSignIn = async () => {
  try {
    await setPersistence(auth, inMemoryPersistence);
    const { signInWithPopup } = await import('firebase/auth');
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedToken(credential.accessToken);
      setSupervisorSession(true, credential.accessToken);
      return { user: result.user, token: credential.accessToken };
    }
    setSupervisorSession(true);
    return { user: result.user, token: null };
  } catch (error) {
    console.error("Sign-in error:", error);
    throw error;
  }
};
