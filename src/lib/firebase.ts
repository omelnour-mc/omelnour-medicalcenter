import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Add calendar scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');

// Token management
let cachedAccessToken: string | null = null;

export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getCachedToken = () => cachedAccessToken;

export const googleSignIn = async () => {
  try {
    const { signInWithPopup } = await import('firebase/auth');
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedToken(credential.accessToken);
      return { user: result.user, token: credential.accessToken };
    }
    return { user: result.user, token: null };
  } catch (error) {
    console.error("Sign-in error:", error);
    throw error;
  }
};
