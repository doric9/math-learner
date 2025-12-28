import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function compareSample() {
    const year = '1999';
    const problemNumber = '1';

    const docRef = db.collection('competitions').doc('amc8').collection('exams').doc(year).collection('problems').doc(problemNumber);
    const doc = await docRef.get();
    const firestoreData = doc.data();

    const rawData = readFileSync('./amc8_data_improved.json', 'utf8');
    const localData = JSON.parse(rawData);
    const localExam = localData.exams.find(e => e.year.toString() === year);
    const localProblem = localExam.problems.find(p => p.problemNumber.toString() === problemNumber);

    console.log('--- Firestore Data (1999 #1) ---');
    console.log(JSON.stringify(firestoreData, null, 2));
    console.log('\n--- Local Data (1999 #1) ---');
    console.log(JSON.stringify(localProblem, null, 2));

    const firestoreKeys = Object.keys(firestoreData || {});
    const localKeys = Object.keys(localProblem || {});

    const missingInLocal = firestoreKeys.filter(k => !localKeys.includes(k));
    console.log('\nKeys in Firestore but missing in local JSON:', missingInLocal);
}

compareSample();
