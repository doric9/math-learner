import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function uploadData() {
  try {
    console.log('Reading data file...');
    const rawData = readFileSync('../amc8_data_improved.json', 'utf8');
    const data = JSON.parse(rawData);

    console.log(`Found ${data.exams.length} exams to upload.`);

    const batchSize = 500;
    let batch = db.batch();
    let operationCount = 0;

    for (const exam of data.exams) {
      console.log(`Processing ${exam.year}...`);

      // Create exam document
      const examRef = db.collection('competitions')
        .doc('amc8')
        .collection('exams')
        .doc(exam.year.toString());

      batch.set(examRef, {
        year: exam.year,
        competitionId: 'amc8',
        uploadedAt: new Date()
      });
      operationCount++;

      // Upload problems
      for (const problem of exam.problems) {
        const problemRef = examRef.collection('problems').doc(problem.problemNumber.toString());

        batch.set(problemRef, {
          ...problem,
          uploadedAt: new Date()
        }, { merge: true });
        operationCount++;

        if (operationCount >= batchSize) {
          console.log('  Committing batch...');
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      }
    }

    if (operationCount > 0) {
      console.log('  Committing final batch...');
      await batch.commit();
    }

    console.log('✅ Upload complete!');

  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}

uploadData();
