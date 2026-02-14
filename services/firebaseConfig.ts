
// NOTE: This file is currently unused as the application uses a custom backend (see services/api.ts).
// The code is commented out to prevent build errors related to missing or incompatible firebase types.

/*
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ¡IMPORTANTE!
// Debes reemplazar estos valores con los que te da la consola de Firebase
// Ve a Project Settings > General > Your apps > SDK Setup and Configuration
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abcdef"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const db = getFirestore(app);
export const auth = getAuth(app);
*/

// Export placeholders
export const db = {};
export const auth = {};
