import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';

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
