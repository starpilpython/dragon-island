// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCmX_uxyypb-97zupY8dtxyONANwDM3yoM",
    authDomain: "dragon-island-c080e.firebaseapp.com",
    projectId: "dragon-island-c080e",
    storageBucket: "dragon-island-c080e.firebasestorage.app",
    messagingSenderId: "291446458578",
    appId: "1:291446458578:web:8ee2052199f3e7b08d450b",
    measurementId: "G-ZS2L79VJTL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 인증 객체 및 구글 로그인 프로바이더 생성 및 내보내기
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
