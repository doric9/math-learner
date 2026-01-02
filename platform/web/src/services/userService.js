import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, writeBatch, limit } from 'firebase/firestore';

/**
 * XP Constants
 */
export const XP_VALUES = {
    DAILY_LOGIN: 10,
    PRACTICE_CORRECT: 10,
    GUIDED_STEP: 5,
    MOCK_TEST_CORRECT: 20,
    MOCK_TEST_COMPLETION: 50
};

/**
 * Calculates level based on XP
 * Level 1: 0-99 XP
 * Level 2: 100-249 XP
 * Level 3: 250-499 XP (Incremental scaling)
 */
export const calculateLevel = (xp) => {
    return Math.floor(Math.sqrt(xp / 25)) + 1;
};

/**
 * Updates user XP and checks for level up
 */
export const addXP = async (uid, amount, reason) => {
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : { xp: 0, level: 1 };

    const currentXP = userData.xp || 0;
    const newXP = currentXP + amount;
    const newLevel = calculateLevel(newXP);
    const oldLevel = userData.level || 1;

    const updates = {
        xp: increment(amount),
        lastActivity: serverTimestamp()
    };

    if (newLevel > oldLevel) {
        updates.level = newLevel;
    }

    await setDoc(userRef, updates, { merge: true });

    // Log activity
    await addDoc(collection(userRef, 'activities'), {
        type: 'xp_gain',
        amount,
        reason,
        timestamp: serverTimestamp()
    });

    return { leveledUp: newLevel > oldLevel, newLevel, newXP };
};

/**
 * Updates user streak logic
 */
export const updateStreak = async (uid) => {
    if (!uid) return;

    const today = new Date().toISOString().split('T')[0];
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    const streakData = userData.streak || { current: 0, lastActivityDate: null };

    if (streakData.lastActivityDate === today) {
        return streakData;
    }

    let newStreak = 1;
    if (streakData.lastActivityDate) {
        const lastDate = new Date(streakData.lastActivityDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            newStreak = (streakData.current || 0) + 1;
        }
    }

    const newStreakData = {
        current: newStreak,
        lastActivityDate: today
    };

    await setDoc(userRef, {
        streak: newStreakData
    }, { merge: true });

    // Award Daily Login XP if first time today
    await addXP(uid, XP_VALUES.DAILY_LOGIN, 'daily_streak_update');

    return newStreakData;
};

/**
 * Check and unlock achievements
 */
export const checkAchievements = async (uid) => {
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return [];

    const userData = userSnap.data();
    const existingBadges = userData.badges || [];
    const newBadges = [];

    // 1. Streak Badges
    const streak = userData.streak?.current || 0;
    if (streak >= 3 && !existingBadges.includes('streak_3')) newBadges.push('streak_3');
    if (streak >= 7 && !existingBadges.includes('streak_7')) newBadges.push('streak_7');
    if (streak >= 30 && !existingBadges.includes('streak_30')) newBadges.push('streak_30');

    // 2. XP Badges
    const xp = userData.xp || 0;
    if (xp >= 100 && !existingBadges.includes('xp_100')) newBadges.push('xp_100');
    if (xp >= 1000 && !existingBadges.includes('xp_1000')) newBadges.push('xp_1000');

    // 3. Exam Completion Badges
    try {
        const resultsRef = collection(db, 'users', uid, 'results');
        const resultsSnap = await getDocs(resultsRef);
        const examCount = resultsSnap.size;

        if (examCount >= 1 && !existingBadges.includes('exam_1')) newBadges.push('exam_1');
        if (examCount >= 5 && !existingBadges.includes('exam_5')) newBadges.push('exam_5');

        // 4. Perfect Score Badge
        const hasPerfectScore = resultsSnap.docs.some(doc => doc.data().score >= 25);
        if (hasPerfectScore && !existingBadges.includes('perfect_score')) newBadges.push('perfect_score');
    } catch (e) {
        console.error("Error checking exam badges:", e);
    }

    if (newBadges.length > 0) {
        await updateDoc(userRef, {
            badges: [...existingBadges, ...newBadges]
        });
    }

    return newBadges;
};

/**
 * Log a missed problem to the user's mistake journal
 */
export const logMistake = async (uid, problem) => {
    if (!uid || !problem) return;

    const year = problem.year || problem.examYear;
    if (!year) return;

    const problemId = `${year}_${problem.problemNumber}`;
    const mistakeRef = doc(db, 'users', uid, 'mistakeJournal', problemId);
    const mistakeSnap = await getDoc(mistakeRef);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (mistakeSnap.exists()) {
        await updateDoc(mistakeRef, {
            missedCount: increment(1),
            lastMissed: serverTimestamp(),
            nextReviewDate: tomorrow,
            status: 'learning',
            // Update content in case it's missing from old logs
            problemHtml: problem.problemHtml || null,
            problemText: problem.problemText || null,
            correctAnswer: problem.correctAnswer || null,
            solutionHtml: problem.solutionHtml || null,
            topic: problem.topic || 'General'
        });
    } else {
        await setDoc(mistakeRef, {
            problemId,
            year: parseInt(year),
            problemNumber: parseInt(problem.problemNumber),
            missedCount: 1,
            lastMissed: serverTimestamp(),
            nextReviewDate: tomorrow,
            status: 'learning',
            reviewInterval: 1,
            topic: problem.topic || 'General',
            problemHtml: problem.problemHtml || null,
            problemText: problem.problemText || null,
            correctAnswer: problem.correctAnswer || null,
            solutionHtml: problem.solutionHtml || null
        });
    }
};

/**
 * Update mistake journal after a successful review
 */
export const resolveMistake = async (uid, problemId) => {
    if (!uid || !problemId) return;

    const mistakeRef = doc(db, 'users', uid, 'mistakeJournal', problemId);
    const mistakeSnap = await getDoc(mistakeRef);

    if (!mistakeSnap.exists()) return;

    const data = mistakeSnap.data();
    const intervals = [1, 3, 7, 14, 30];
    const currentInterval = data.reviewInterval || 1;
    const currentIdx = intervals.indexOf(currentInterval);
    const nextInterval = intervals[Math.min(currentIdx + 1, intervals.length - 1)];

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextInterval);

    await updateDoc(mistakeRef, {
        reviewInterval: nextInterval,
        nextReviewDate: nextDate,
        status: nextInterval === 30 ? 'mastered' : 'learning',
        lastCorrectReview: serverTimestamp()
    });
};

/**
 * Fetch mistakes due for review
 */
export const getDueMistakes = async (uid) => {
    if (!uid) return [];

    const now = new Date();
    const mistakesRef = collection(db, 'users', uid, 'mistakeJournal');
    const q = query(
        mistakesRef,
        where('status', '==', 'learning')
    );

    const snapshot = await getDocs(q);
    const mistakes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter and sort in memory to avoid needing a combined index in Firestore
    return mistakes
        .filter(m => m.nextReviewDate && m.nextReviewDate.toDate() <= now)
        .sort((a, b) => a.nextReviewDate.toDate() - b.nextReviewDate.toDate());
};

/**
 * Repair existing mistakes in the journal that are missing content
 */
export const repairMistakeJournal = async (uid) => {
    if (!uid) return { success: false, error: 'No user ID' };

    try {
        const mistakesRef = collection(db, 'users', uid, 'mistakeJournal');
        const snapshot = await getDocs(mistakesRef);

        let repairedCount = 0;
        const batchSize = 500;
        let batch = writeBatch(db);
        let operationCount = 0;

        for (const mistakeDoc of snapshot.docs) {
            const data = mistakeDoc.data();
            // Check if essential content is missing
            if (!data.problemHtml && !data.problemText) {
                const year = (data.year || data.examYear)?.toString();
                const problemNum = data.problemNumber?.toString();

                if (year && problemNum) {
                    const problemRef = doc(db, 'competitions', 'amc8', 'exams', year, 'problems', problemNum);
                    const problemSnap = await getDoc(problemRef);

                    if (problemSnap.exists()) {
                        const problemData = problemSnap.data();
                        batch.update(mistakeDoc.ref, {
                            problemHtml: problemData.problemHtml || null,
                            problemText: problemData.problemText || null,
                            correctAnswer: problemData.correctAnswer || null,
                            solutionHtml: problemData.solutionHtml || null,
                            lastRepaired: serverTimestamp()
                        });

                        operationCount++;
                        repairedCount++;

                        if (operationCount >= batchSize) {
                            await batch.commit();
                            batch = writeBatch(db);
                            operationCount = 0;
                        }
                    }
                }
            }
        }

        if (operationCount > 0) {
            await batch.commit();
        }

        return { success: true, count: repairedCount };
    } catch (error) {
        console.error("Repair error:", error);
        return { success: false, error: error.message };
    }
};

export const backfillMistakes = async (uid) => {
    if (!uid) return { success: false, error: 'No user ID' };

    try {
        const resultsRef = collection(db, 'users', uid, 'results');
        const resultsSnap = await getDocs(resultsRef);

        let mistakesIdentified = 0;
        const batchSize = 500;
        let batch = writeBatch(db);
        let operationCount = 0;

        for (const resultDoc of resultsSnap.docs) {
            const data = resultDoc.data();
            const year = data.examYear;
            const answers = data.answers || {};
            const correctAnswers = data.correctAnswers || {};
            const problemTopics = data.problemTopics || {};

            if (!year || Object.keys(answers).length === 0) continue;

            const indices = Object.keys(answers);
            for (const idxStr of indices) {
                const idx = parseInt(idxStr);
                const userAns = answers[idxStr];
                const correctAns = correctAnswers[idxStr] || correctAnswers[idx]; // Support both string and num keys

                if (correctAns && userAns !== correctAns) {
                    const problemNumber = idx + 1;
                    const problemId = `${year}_${problemNumber}`;
                    const topic = problemTopics[idxStr] || problemTopics[idx] || 'General';

                    const mistakeRef = doc(db, 'users', uid, 'mistakeJournal', problemId);

                    // Fetch full problem data for the backfill
                    let problemContent = {};
                    try {
                        const problemRef = doc(db, 'competitions', 'amc8', 'exams', year.toString(), 'problems', problemNumber.toString());
                        const problemSnap = await getDoc(problemRef);
                        if (problemSnap.exists()) {
                            problemContent = problemSnap.data();
                        }
                    } catch (e) {
                        console.error(`Error fetching content for ${problemId}:`, e);
                    }

                    batch.set(mistakeRef, {
                        problemId,
                        year: parseInt(year),
                        problemNumber,
                        missedCount: increment(1),
                        lastMissed: serverTimestamp(),
                        nextReviewDate: new Date(), // Due immediately
                        status: 'learning',
                        reviewInterval: 1,
                        topic,
                        correctAnswer: correctAns,
                        // Include full content
                        problemHtml: problemContent.problemHtml || null,
                        problemText: problemContent.problemText || null,
                        solutionHtml: problemContent.solutionHtml || null
                    }, { merge: true });

                    operationCount++;
                    mistakesIdentified++;

                    if (operationCount >= batchSize) {
                        await batch.commit();
                        batch = writeBatch(db);
                        operationCount = 0;
                    }
                }
            }
        }

        if (operationCount > 0) {
            await batch.commit();
        }

        return { success: true, count: mistakesIdentified };
    } catch (error) {
        console.error("Backfill error:", error);
        return { success: false, error: error.message };
    }
};
