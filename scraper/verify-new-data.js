import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function verify() {
  const docRef = db.collection('competitions').doc('amc8').collection('exams').doc('2024').collection('problems').doc('1');
  const doc = await docRef.get();

  if (doc.exists) {
    const data = doc.data();
    console.log('✅ Data format verified:');
    console.log('Has problemText:', data.problemText ? 'Yes' : 'No');
    console.log('Has choices:', data.choices ? 'Yes' : 'No');
    console.log('Has correctAnswer:', data.correctAnswer ? 'Yes' : 'No');
    console.log('Has solutionText:', data.solutionText ? 'Yes' : 'No');
    console.log('\nSample:');
    console.log('Problem:', data.problemText?.substring(0, 80) + '...');
    console.log('Choices:', Object.keys(data.choices || {}));
    console.log('Answer:', data.correctAnswer);
  } else {
    console.log('❌ Document not found');
  }
}

verify();
