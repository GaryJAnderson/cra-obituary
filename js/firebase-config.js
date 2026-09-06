/* ============================================================
   firebase-config.js

   Paste the config object from the Firebase console here
   (Project settings -> Your apps -> Web app -> "SDK setup").

   These values are NOT secret — they ship in the page on purpose.
   Access is controlled by the Firestore security rules, not by
   hiding this config.
   ============================================================ */
window.CRA_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "cra-obituary.firebaseapp.com",
  projectId: "cra-obituary",
  storageBucket: "cra-obituary.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
