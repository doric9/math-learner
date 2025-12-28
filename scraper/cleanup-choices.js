import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function removeChoicesField() {
    try {
        console.log('🧹 Starting cleanup: Removing "choices" field from all problems...\n');

        // Get all exams
        const examsSnapshot = await db
            .collection('competitions')
            .doc('amc8')
            .collection('exams')
            .get();

        console.log(`Found ${examsSnapshot.docs.length} exams to process.\n`);

        let totalProblems = 0;
        let updatedProblems = 0;

        for (const examDoc of examsSnapshot.docs) {
            const year = examDoc.id;
            console.log(`Processing ${year}...`);

            // Get all problems for this exam
            const problemsSnapshot = await examDoc.ref.collection('problems').get();

            for (const problemDoc of problemsSnapshot.docs) {
                totalProblems++;
                const data = problemDoc.data();

                // Check if choices field exists
                if (data.choices !== undefined) {
                    // Remove the choices field
                    await problemDoc.ref.update({
                        choices: FieldValue.delete()
                    });
                    updatedProblems++;
                    console.log(`  ✓ Problem ${problemDoc.id}: Removed choices field`);
                } else {
                    console.log(`  - Problem ${problemDoc.id}: No choices field (skipped)`);
                }
            }
        }

        console.log('\n============================================================');
        console.log('✅ CLEANUP COMPLETE');
        console.log('============================================================');
        console.log(`📊 Total problems scanned: ${totalProblems}`);
        console.log(`🧹 Problems updated: ${updatedProblems}`);
        console.log(`⏭️  Problems skipped (no choices): ${totalProblems - updatedProblems}`);
        console.log('============================================================\n');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
}

removeChoicesField();
