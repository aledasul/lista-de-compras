// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB2YaVUMw1YTj31SIQ5YHoR6XDNNt7MjF8",
  authDomain: "lista-de-compras-a0af2.firebaseapp.com",
  projectId: "lista-de-compras-a0af2",
  storageBucket: "lista-de-compras-a0af2.firebasestorage.app",
  messagingSenderId: "1006196126683",
  appId: "1:1006196126683:web:71e86eeb6397f668696dfe",
  measurementId: "G-BKNT243YDR"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
