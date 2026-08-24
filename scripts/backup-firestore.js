// Sauvegarde automatique de la base Firestore du site LFAKM
// Ce script tourne via GitHub Actions (voir .github/workflows/backup-firestore.yml)
// Il exporte les principales collections dans un fichier JSON horodaté,
// conservé dans le dossier /backups du dépôt.

const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
});
const db = admin.firestore();

async function dumpCollection(name) {
  const snap = await db.collection(name).get();
  const out = {};
  snap.forEach(doc => { out[doc.id] = doc.data(); });
  return out;
}

async function dumpCollectionGroup(name) {
  const snap = await db.collectionGroup(name).get();
  const out = [];
  snap.forEach(doc => { out.push({ chemin: doc.ref.path, donnees: doc.data() }); });
  return out;
}

async function dumpDoc(path) {
  const snap = await db.doc(path).get();
  return snap.exists ? snap.data() : null;
}

async function main() {
  console.log('Démarrage de la sauvegarde Firestore...');

  const backup = {
    date_sauvegarde: new Date().toISOString(),
    utilisateurs: await dumpCollection('utilisateurs'),
    actualites: await dumpCollection('actualites'),
    ines_autorises: await dumpCollection('ines_autorises'),
    ressources_cours: await dumpCollectionGroup('cours'),
    ressources_td: await dumpCollectionGroup('td'),
    devoirs: await dumpCollectionGroup('devoirs'),
    rendus_devoirs: await dumpCollectionGroup('rendus'),
    config_annee_scolaire: await dumpDoc('config/schoolYear'),
    config_stockage: await dumpDoc('config/usage'),
    config_contact_proviseur: await dumpDoc('config/contact'),
  };

  const dateStr = new Date().toISOString().slice(0, 10);
  fs.mkdirSync('backups', { recursive: true });
  const filename = `backups/backup-${dateStr}.json`;
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  console.log(`Sauvegarde écrite : ${filename}`);

  // On ne garde que les 10 dernières sauvegardes pour ne pas alourdir le dépôt indéfiniment
  const files = fs.readdirSync('backups').filter(f => f.startsWith('backup-')).sort();
  while (files.length > 10) {
    const old = files.shift();
    fs.unlinkSync(`backups/${old}`);
    console.log(`Ancienne sauvegarde supprimée : ${old}`);
  }

  console.log('Terminé.');
}

main().catch(err => {
  console.error('Erreur pendant la sauvegarde :', err);
  process.exit(1);
});
  
