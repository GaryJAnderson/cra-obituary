/* ============================================================
   firebase-config.js

   Config for the "CRA-Obituary" Firebase project, from
   Firebase console -> Project settings -> General -> Your apps.

   These values are NOT secret — they ship in the page on purpose.
   Google documents Firebase web config as public; access is controlled
   by the Firestore security rules (see firestore.rules), not by hiding
   this config.

   GitHub secret scanning WILL flag the apiKey below as a "Google API
   Key". That alert is a pattern match, not a breach: the same AIza…
   format is used for billable Google Cloud APIs where exposure does
   matter. Do NOT revoke this key — it would just break the site, and a
   replacement would be equally public.

   The correct hardening (done in Google Cloud Console → APIs & Services
   → Credentials → the Firebase browser key) is to RESTRICT it:
     • Application restrictions → Websites → cra-obituary.netlify.app/*
     • API restrictions → only Identity Toolkit, Token Service,
       Firebase Installations, Cloud Firestore
   ============================================================ */
window.CRA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA84lJlhbFU4Z_bbQctKUrwqeEIFFekxYI",
  authDomain: "cra-obituary.firebaseapp.com",
  projectId: "cra-obituary",
  storageBucket: "cra-obituary.firebasestorage.app",
  messagingSenderId: "667444559905",
  appId: "1:667444559905:web:be8b59ffbe15bd4fd22360"
};
