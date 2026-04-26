import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// ⚠️ تنبيه: استبدل القيم اللي تحت بالقيم الحقيقية من Firebase Console
// تروح لـ Project Settings -> General -> Your apps -> Firebase SDK snippet
const firebaseConfig = {
  apiKey: "AIzaSyA...", // ضع هنا الـ Web API Key الحقيقي
  authDomain: "rnote-b0d30.firebaseapp.com",
  projectId: "rnote-b0d30",
  storageBucket: "rnote-b0d30.firebasestorage.app",
  messagingSenderId: "123456789012", // ضع هنا الـ Messaging Sender ID الحقيقي
  appId: "1:123456789012:web:abcdef123456" // ضع هنا الـ App ID الحقيقي
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// تفعيل ميزة التخزين المحلي (Offline Persistence)
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    // تفتح أكثر من تبويب بنفس الوقت - الميزة تشتغل بتبويب واحد فقط
    console.warn('Offline persistence disabled: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // المتصفح مالتك قديم أو ما يدعم هذي الميزة
    console.warn('Offline persistence not supported in this browser.');
  }
});