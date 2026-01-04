import { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const AIAccessContext = createContext();

export function useAIAccess() {
    return useContext(AIAccessContext);
}

export function AIAccessProvider({ children }) {
    const { currentUser } = useAuth();
    const [hasAIAccess, setHasAIAccess] = useState(false);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    useEffect(() => {
        async function checkAIAccess() {
            if (!currentUser?.email) {
                setHasAIAccess(false);
                setIsCheckingAccess(false);
                return;
            }

            try {
                const configDoc = await getDoc(doc(db, 'config', 'aiAccess'));
                if (configDoc.exists()) {
                    const allowedUsers = configDoc.data()?.allowedUsers || [];
                    setHasAIAccess(allowedUsers.includes(currentUser.email));
                } else {
                    setHasAIAccess(false);
                }
            } catch (error) {
                console.error('Error checking AI access:', error);
                setHasAIAccess(false);
            } finally {
                setIsCheckingAccess(false);
            }
        }

        setIsCheckingAccess(true);
        checkAIAccess();
    }, [currentUser]);

    const value = {
        hasAIAccess,
        isCheckingAccess
    };

    return (
        <AIAccessContext.Provider value={value}>
            {children}
        </AIAccessContext.Provider>
    );
}
