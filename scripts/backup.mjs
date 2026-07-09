/**
 * Backup completo do Firestore para JSON local.
 *
 * Pré-requisitos:
 *   1. Chave de service account em ./serviceAccountKey.json
 *      (Console Firebase → Configurações do projeto → Contas de serviço
 *       → Gerar nova chave privada). NUNCA commitar esse arquivo.
 *   2. npm install (instala firebase-admin como devDependency)
 *
 * Uso:
 *   npm run backup
 *
 * Saída: backups/firestore-backup-<timestamp>.json
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const KEY_PATH = resolve('serviceAccountKey.json');
const COLLECTIONS = ['transactions', 'modules', 'feedback'];

let credentials;
try {
  credentials = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
} catch {
  console.error(
    'serviceAccountKey.json não encontrado na raiz do projeto.\n' +
    'Gere em: Console Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave privada.',
  );
  process.exit(1);
}

initializeApp({ credential: cert(credentials) });
const db = getFirestore();

const backup = {
  exportedAt: new Date().toISOString(),
  project: credentials.project_id,
  collections: {},
};

let totalDocs = 0;
for (const name of COLLECTIONS) {
  const snapshot = await db.collection(name).get();
  backup.collections[name] = {};
  snapshot.forEach((doc) => {
    backup.collections[name][doc.id] = doc.data();
  });
  totalDocs += snapshot.size;
  console.log(`${name}: ${snapshot.size} documentos`);
}

mkdirSync('backups', { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outPath = `backups/firestore-backup-${stamp}.json`;
writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf8');

console.log(`\nBackup salvo: ${outPath} (${totalDocs} documentos)`);
