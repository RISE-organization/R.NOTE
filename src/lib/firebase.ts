import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// إعدادات فايربيس الرسمية لمشروع R.Note - تم الحقن يدوياً للعمل على السيرفر
const firebaseConfig = {
  apiKey: "AIzaSyBuqrjzMKBISvEuGaB1VEarkf9QIK3e4Po",
  authDomain: "rnote-b0d30.firebaseapp.com",
  projectId: "rnote-b0d30",
  storageBucket: "rnote-b0d30.firebasestorage.app",
  messagingSenderId: "186446875970",
  appId: "1:186446875970:web:f8434b845c67aed5334cdb"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// تفعيل ميزة التخزين المحلي لضمان استمرارية العمل بدون إنترنت
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    // تظهر عند فتح التبويبات المتعددة
    console.warn('Offline persistence disabled: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // تظهر إذا كان المتصفح لا يدعم الميزة
    console.warn('Offline persistence not supported in this browser.');
  }
});