import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export class IngestionAgent {
    constructor(config = {}) {
        this.serviceAccountPath = config.serviceAccountPath || './serviceAccountKey.json';
        this.db = null;
    }

    initialize() {
        if (!existsSync(this.serviceAccountPath)) {
            throw new Error(`Service account key not found at ${this.serviceAccountPath}`);
        }

        const serviceAccount = JSON.parse(readFileSync(this.serviceAccountPath, 'utf8'));

        initializeApp({
            credential: cert(serviceAccount)
        });

        this.db = getFirestore();
        console.log('Ingestion Agent initialized and connected to Firestore.');
    }

    async ingest(dataPath) {
        if (!this.db) this.initialize();

        if (!existsSync(dataPath)) {
            throw new Error(`Data file not found at ${dataPath}`);
        }

        const data = JSON.parse(readFileSync(dataPath, 'utf8'));
        console.log(`Ingesting competition: ${data.competitionName} (${data.competitionId})`);

        const compRef = this.db.collection('competitions').doc(data.competitionId);
        await compRef.set({
            name: data.competitionName,
            id: data.competitionId,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        for (const exam of data.exams) {
            console.log(`Processing ${exam.year}...`);
            const examRef = compRef.collection('exams').doc(exam.year.toString());

            await examRef.set({
                year: exam.year,
                totalProblems: exam.problems.length
            }, { merge: true });

            const batch = this.db.batch();
            let count = 0;

            for (const problem of exam.problems) {
                const probRef = examRef.collection('problems').doc(problem.problemNumber.toString());
                batch.set(probRef, problem);
                count++;

                if (count >= 400) { // Firestore batch limit is 500
                    await batch.commit();
                    count = 0;
                }
            }

            if (count > 0) {
                await batch.commit();
            }
            console.log(`  Uploaded ${exam.problems.length} problems for ${exam.year}`);
        }
        console.log('Ingestion complete.');
    }
}
