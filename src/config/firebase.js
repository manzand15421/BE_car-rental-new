const firebaseApp = require("firebase/app");
const firebaseConfig = {
    apiKey: "AIzaSyCbVeJo6mH3-WDw8aHP1s8G09EVef5Ac0Q",
    authDomain: "dias-as-beruk.firebaseapp.com",
    projectId: "dias-as-beruk",
    storageBucket: "dias-as-beruk.firebasestorage.app",
    messagingSenderId: "860407756449",
    appId: "1:860407756449:web:97384cc739fb0f4ff2e2e0",
    measurementId: "G-0G14N71VWF"
  };

  const firebase = firebaseApp.initializeApp(firebaseConfig);

  module.exports = firebase;