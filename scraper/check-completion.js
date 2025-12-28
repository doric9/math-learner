import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkCompletion() {
  const examsSnapshot = await db.collection('competitions').doc('amc8').collection('exams').get();
  let totalProblems = 0;
  let problemsWithAnswer = 0;
  let missingAnswers = [];

  for (const examDoc of examsSnapshot.docs) {
    const year = examDoc.id;
    const problemsSnapshot = await examDoc.ref.collection('problems').get();
    for (const problemDoc of problemsSnapshot.docs) {
      totalProblems++;
      const data = problemDoc.data();
      if (data.correctAnswer && data.correctAnswer !== '') {
        problemsWithAnswer++;
      } else {
        missingAnswers.push(`${year} #${problemDoc.id}`);
      }
    }
  }

  console.log(`Total problems in Firestore: ${totalProblems}`);
  console.log(`Problems with correctAnswer: ${problemsWithAnswer}`);
  console.log(`Completion rate: ${(problemsWithAnswer / totalProblems * 100).toFixed(2)}%`);
  if (missingAnswers.length > 0) {
    console.log('Missing answers:', missingAnswers.slice(0, 10).join(', '), missingAnswers.length > 10 ? '...' : '');
  }
}

checkCompletion();
