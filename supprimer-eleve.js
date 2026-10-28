// supprimer-eleve.js
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialisation avec les identifiants par défaut (ADC)
initializeApp({
  credential: applicationDefault(),
  projectId: 'lfakm-87dec'
});

// ⚠️ MODIFIEZ CETTE LIGNE AVEC L'EMAIL DE L'ÉLÈVE À SUPPRIMER
const emailASupprimer = 'tall115djiby@gmail.com'; 

async function supprimerUtilisateur() {
  try {
    const auth = getAuth();
    const db = getFirestore();

    // 1. On cherche l'utilisateur dans Firebase Auth
    const userRecord = await auth.getUserByEmail(emailASupprimer);
    console.log(`Utilisateur trouvé : ${userRecord.email} (UID: ${userRecord.uid})`);

    // 2. On supprime son compte Auth
    await auth.deleteUser(userRecord.uid);
    console.log(`✅ Compte Auth supprimé.`);

    // 3. On supprime son profil dans Firestore
    await db.collection('utilisateurs').doc(userRecord.uid).delete();
    console.log(`✅ Profil Firestore supprimé.`);

  } catch (error) {
    console.error("❌ Erreur :", error.message);
  }
}

supprimerUtilisateur();