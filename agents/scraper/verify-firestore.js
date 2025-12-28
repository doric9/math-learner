import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function verify() {
    try {
        const docRef = db.collection('competitions').doc('amc8').collection('exams').doc('2022').collection('problems').doc('25');
        const doc = await docRef.get();

        if (doc.exists) {
            console.log('✅ Document found:', doc.data());
        } else {
            console.log('❌ Document not found!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

verify();
