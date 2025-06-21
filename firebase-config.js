const firebaseConfig = {
  apiKey: "AIzaSyA_tZjHXi9RbvwDIbIz-GCDQV-qzcq3M",
  authDomain: "hm-tutoring-8d2b5.firebaseapp.com",
  projectId: "hm-tutoring-8d2b5",
  storageBucket: "hm-tutoring-8d2b5.firebasestorage.app",
  messagingSenderId: "490174137603",
  appId: "1:490174137603:web:1e511b2e26d465de61536",
  measurementId: "G-PYB715Q4YY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);