import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Class, Task, Quiz, Assignment, Note, Priority, SubmissionStatus, AnyItem } from '../types';
import { db, auth } from '../src/lib/firebase';
import { sendNotification } from '../src/utils/notifications';
import { useLanguage } from '../LanguageContext';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, setDoc, doc, query, orderBy, Timestamp, where, serverTimestamp, writeBatch, getDoc, getDocs, increment, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../src/context/AuthContext';

export const useDataManagement = (skipSubscription: boolean = false) => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [classes, setClasses] = useState<Class[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [streak, setStreak] = useState<number>(0);
    const [totalXp, setTotalXp] = useState<number>(0);
    const [totalMinutes, setTotalMinutes] = useState<number>(0);
    const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);
    const [deepSessionsCount, setDeepSessionsCount] = useState<number>(0);
    const [achievements, setAchievements] = useState<string[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [activeRooms, setActiveRooms] = useState<any[]>([]);
    const [lastStudyDate, setLastStudyDate] = useState<string | null>(null);
    const notifiedIds = useRef<Set<string>>(new Set());
    
    // Centralized Helper for Streak Logic
    const updateDailyActivityStreak = async (userId: string) => {
        const today = new Date().toDateString();
        // 1. If today already counted, return
        if (lastStudyDate === today) return;

        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let newStreak = 1;

        // 2. If yesterday was the last activity, increment
        if (lastStudyDate === yesterday) {
            newStreak = streak + 1;
        } 
        // 3. Otherwise (older or null), reset to 1

        // 4. Update Firestore with user profile details for Leaderboard
        await setDoc(doc(db, 'user_stats', userId), {
            streak: newStreak,
            lastStudyDate: today,
            displayName: user?.displayName || user?.email?.split('@')[0] || 'Unknown Student',
            email: user?.email?.toLowerCase() || null,
            photoURL: user?.photoURL || null,
        }, { merge: true });
    };

    // Real-time Sync with Firestore
    useEffect(() => {
        if (!user || skipSubscription) {
            setClasses([]);
            setTasks([]);
            setQuizzes([]);
            setAssignments([]);
            setNotes([]);
            return;
        }

        const qClasses = query(collection(db, 'classes'), where('userId', '==', user.uid));
        const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        const qQuizzes = query(collection(db, 'quizzes'), where('userId', '==', user.uid));
        const qAssignments = query(collection(db, 'assignments'), where('userId', '==', user.uid));
        const qNotes = query(collection(db, 'notes'), where('userId', '==', user.uid));

        // Streak is a bit special, usually stored in a user profile, but let's assume a 'streaks' collection or just local calculation based on tasks for now.
        // Or we can store it in a 'user_stats' collection. For simplicity, let's keep it local or derive it.
        // The prompt didn't specify where streak is stored, but "all data" implies streak too.
        // Let's assume streak is derived or stored in a specific doc. 
        // For now, I will skip persistent storage for streak unless I create a user profile doc.
        // Actually, the previous implementation stored streak in localStorage.
        // I'll create a 'user_stats' collection for it.
        const qStats = doc(db, 'user_stats', user.uid);
        const qAchievements = collection(db, 'user_stats', user.uid, 'achievements');

        const unsubClasses = onSnapshot(qClasses, (snapshot) => {
            setClasses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Class)));
        });

        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
            fetchedTasks.sort((a, b) => {
                const getDate = (date: any) => {
                    if (!date) return 0;
                    if (date.toDate) return date.toDate().getTime();
                    return new Date(date).getTime();
                };
                return getDate(b.createdAt) - getDate(a.createdAt);
            });
            setTasks(fetchedTasks);
        }, (error) => {
            console.error("[DataManagement] Tasks Snapshot Error:", error);
        });

        const unsubQuizzes = onSnapshot(qQuizzes, (snapshot) => {
            setQuizzes(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Quiz)));
        });

        const unsubAssignments = onSnapshot(qAssignments, (snapshot) => {
            setAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
        });

        const unsubNotes = onSnapshot(qNotes, (snapshot) => {
            setNotes(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Note)));
        });

        const unsubStats = onSnapshot(qStats, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setStreak(data.streak || 0);
                setTotalXp(data.total_xp || 0);
                setTotalMinutes(data.total_minutes_studied || 0);
                setCompletedTasksCount(data.completed_tasks_count || 0);
                setDeepSessionsCount(data.deep_sessions_count || 0);
                setLastStudyDate(data.lastStudyDate || null);

                // Sync name or email if missing
                if ((!data.displayName || !data.email) && user) {
                    setDoc(doc(db, 'user_stats', user.uid), {
                        displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'Unknown Student',
                        email: user.email?.toLowerCase() || null,
                        photoURL: data.photoURL || user.photoURL || null,
                    }, { merge: true }).catch(console.error);
                }
            } else if (user) {
                // Initialize
                setDoc(doc(db, 'user_stats', user.uid), {
                    streak: 0,
                    total_xp: 0,
                    completed_tasks_count: 0,
                    deep_sessions_count: 0,
                    displayName: user.displayName || user.email?.split('@')[0] || 'Unknown Student',
                    email: user.email?.toLowerCase() || null,
                    photoURL: user.photoURL || null,
                }, { merge: true }).catch(console.error);
            }
        });

        // Invitations & Rooms Subscription
        let unsubInvites = () => {};
        let unsubRooms = () => {};

        if (user) {
            const qInvites = query(collection(db, 'study_invites'), where('receiverEmail', '==', user.email), where('status', '==', 'pending'));
            unsubInvites = onSnapshot(qInvites, (snapshot) => {
                setInvites(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });

            const qRooms = query(collection(db, 'active_rooms'), where('participants', 'array-contains', user.uid));
            unsubRooms = onSnapshot(qRooms, (snapshot) => {
                setActiveRooms(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
        }

        const unsubAchievements = onSnapshot(qAchievements, (snapshot) => {
            setAchievements(snapshot.docs.map(doc => doc.id));
        });

        return () => {
            unsubClasses();
            unsubTasks();
            unsubQuizzes();
            unsubAssignments();
            unsubNotes();
            unsubStats();
            unsubInvites();
            unsubRooms();
            unsubAchievements();
        };
    }, [user, skipSubscription]);

    // --- ACHIEVEMENT ENGINE ---
    useEffect(() => {
        if (!user || achievements.length === 0 && totalXp === 0) return;

        const checkCondition = async (id: string, condition: boolean, name: string) => {
            if (condition && !achievements.includes(id)) {
                try {
                    const achievementRef = doc(db, 'user_stats', user.uid, 'achievements', id);
                    await setDoc(achievementRef, {
                        unlockedAt: serverTimestamp(),
                        badgeId: id,
                        name: name
                    });
                    
                    // Update topBadgeId for Leaderboard
                    await updateDoc(doc(db, 'user_stats', user.uid), {
                        topBadgeId: id
                    });

                    // Trigger UI Celebration
                    window.dispatchEvent(new CustomEvent('achievement-unlocked', { 
                        detail: { id, name } 
                    }));
                } catch (e) {
                    console.error("Error unlocking achievement:", e);
                }
            }
        };

        checkCondition('streak_master', streak >= 30, 'streakMaster');
        checkCondition('xp_titan', totalXp >= 5000, 'xpTitan');
        checkCondition('task_slayer', completedTasksCount >= 100, 'taskSlayer');
        checkCondition('deep_diver', deepSessionsCount >= 20, 'deepDiver');

    }, [streak, totalXp, completedTasksCount, deepSessionsCount, achievements, user]);

    const handleDelete = async (id: string, type: 'schedule' | 'tasks' | 'quizzes' | 'assignments' | 'notes') => {
        if (!user) return;
        try {
            let collectionName = '';
            switch (type) {
                case 'schedule': collectionName = 'classes'; break;
                case 'tasks': collectionName = 'tasks'; break;
                case 'quizzes': collectionName = 'quizzes'; break;
                case 'assignments': collectionName = 'assignments'; break;
                case 'notes': collectionName = 'notes'; break;
            }
            await deleteDoc(doc(db, collectionName, id));
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    };

    const handleSave = async (view: 'schedule' | 'tasks' | 'quizzes' | 'assignments' | 'notes', originalItem?: AnyItem, currentItem?: Partial<AnyItem>) => {
        if (!user) {
            console.error('[DataManagement] handleSave failed: User is not authenticated');
            throw new Error('User is not authenticated');
        }
        if (!currentItem) {
            console.error('[DataManagement] handleSave failed: Check currentItem is null');
            return;
        }

        let collectionName = '';
        switch (view) {
            case 'schedule': collectionName = 'classes'; break;
            case 'tasks': collectionName = 'tasks'; break;
            case 'quizzes': collectionName = 'quizzes'; break;
            case 'assignments': collectionName = 'assignments'; break;
            case 'notes': collectionName = 'notes'; break;
        }

        try {
            if (originalItem && originalItem.id) { // Update
                const docRef = doc(db, collectionName, originalItem.id);
                // Exclude id from update data
                const startUpdate = { ...currentItem };
                delete (startUpdate as any).id;
                await updateDoc(docRef, startUpdate);
                await updateDailyActivityStreak(user.uid);

            } else { // Add
                // Add timestamp and userId
                const newItem: any = {
                    ...currentItem,
                    userId: user.uid,
                    createdAt: serverTimestamp()
                };

                // Enforce defaults for Tasks if missing
                if (view === 'tasks') {
                    if (typeof newItem.completed === 'undefined') newItem.completed = false;
                    if (!newItem.priority) newItem.priority = Priority.Medium;
                    if (!newItem.title) {
                        console.error('[DataManagement] Task Title is MISSING. Aborting save.');
                        throw new Error('Task title is required');
                    }
                }



                try {
                    const docRef = await addDoc(collection(db, collectionName), newItem);
                    await updateDailyActivityStreak(user.uid);

                    // --- XP FOR ADDING EXAMS/ASSIGNMENTS (+20 Commit Bonus) ---
                    if (view === 'quizzes' || view === 'assignments') {
                        await updateDoc(doc(db, 'user_stats', user.uid), {
                            total_xp: increment(20)
                        });
                        window.dispatchEvent(new CustomEvent('xp-earned', { detail: { amount: 20 } }));
                    }

                } catch (innerError) {
                    console.error(`[DataManagement] CRITICAL ERROR adding to ${collectionName}:`, innerError);
                    throw innerError;
                }
            }
        } catch (error) {
            console.error(`[DataManagement] Error saving document to ${collectionName}: `, error);
            throw error; // Re-throw to be caught by the UI
        }
    };

    const handleToggleTask = async (id: string) => {
        if (!user) return;
        const task = tasks.find(t => t.id === id);
        if (task) {
            try {
                const newCompleted = !task.completed;
                await updateDoc(doc(db, 'tasks', id), { completed: newCompleted });

                // Handle centralized streak logic
                if (newCompleted) {
                    await updateDailyActivityStreak(user.uid);
                }

                // --- XP FOR TASKS (+50 / +25 / +10) ---
                let xpAmount = 10;
                if (task.priority === Priority.High) xpAmount = 50;
                else if (task.priority === Priority.Medium) xpAmount = 25;

                const finalXP = newCompleted ? xpAmount : -xpAmount;
                await updateDoc(doc(db, 'user_stats', user.uid), {
                    total_xp: increment(finalXP),
                    completed_tasks_count: increment(newCompleted ? 1 : -1)
                });
                window.dispatchEvent(new CustomEvent('xp-earned', { detail: { amount: finalXP } }));

            } catch (error) {
                console.error("Error toggling task: ", error);
            }
        }
    };

    const handleToggleAssignment = async (id: string) => {
        if (!user) return;
        const assignment = assignments.find(a => a.id === id);
        if (assignment) {
            try {
                const newStatus = assignment.status === SubmissionStatus.Submitted ? SubmissionStatus.NotSubmitted : SubmissionStatus.Submitted;
                await updateDoc(doc(db, 'assignments', id), { status: newStatus });

                // Handle centralized streak logic
                if (newStatus === SubmissionStatus.Submitted) {
                    await updateDailyActivityStreak(user.uid);
                }

                // --- XP FOR ASSIGNMENTS (+150) ---
                const isSubmitted = newStatus === SubmissionStatus.Submitted;
                const xpAmount = isSubmitted ? 150 : -150;
                
                await updateDoc(doc(db, 'user_stats', user.uid), {
                    total_xp: increment(xpAmount)
                });
                window.dispatchEvent(new CustomEvent('xp-earned', { detail: { amount: xpAmount } }));

            } catch (error) {
                console.error("Error toggling assignment: ", error);
            }
        }
    };

    const handleToggleQuiz = async (id: string) => {
        if (!user) return;
        const quiz = quizzes.find(q => q.id === id);
        if (quiz) {
            try {
                const newCompleted = !quiz.completed;
                await updateDoc(doc(db, 'quizzes', id), { completed: newCompleted });

                // Handle centralized streak logic
                if (newCompleted) {
                    await updateDailyActivityStreak(user.uid);
                }

                // --- XP FOR QUIZZES/EXAMS (+150) ---
                const xpAmount = newCompleted ? 150 : -150;
                
                await updateDoc(doc(db, 'user_stats', user.uid), {
                    total_xp: increment(xpAmount)
                });
                window.dispatchEvent(new CustomEvent('xp-earned', { detail: { amount: xpAmount } }));

            } catch (error) {
                console.error("Error toggling quiz: ", error);
            }
        }
    };

    const handleNoteUpdate = async (updatedNote: Note) => {
        if (!user) return;
        try {
            const docRef = doc(db, 'notes', updatedNote.id);
            const { id, ...data } = updatedNote;
            await updateDoc(docRef, { ...data, lastUpdated: new Date().toISOString() });
        } catch (error) {
            console.error("Error updating note: ", error);
        }
    };

    const clearAllData = async () => {
        if (!user) return;
        const collections = ['classes', 'tasks', 'quizzes', 'assignments', 'notes'];
        for (const col of collections) {
            const q = query(collection(db, col), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            let batch = writeBatch(db);
            let count = 0;
            for (const docSnap of snapshot.docs) {
                batch.delete(docSnap.ref);
                count++;
                if (count >= 450) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }
            if (count > 0) await batch.commit();
        }
        // Reset user stats
        await setDoc(doc(db, 'user_stats', user.uid), { streak: 0, lastStudyDate: null }, { merge: true });
    };

    // Notifications for upcoming tasks, quizzes, and assignments
    useEffect(() => {
        const checkUpcomingItems = () => {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;

            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
            const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // 1. Tasks (Due in 1 hour)
            tasks.forEach(task => {
                if (!task.completed && task.id && !notifiedIds.current.has(task.id)) {
                    const dueDate = new Date(task.dueDate);
                    if (dueDate > now && dueDate <= oneHourLater) {
                        notifiedIds.current.add(task.id);
                        sendNotification('Upcoming Task', { body: `Task "${task.title}" is due soon!`, icon: '/logo.png' });
                    }
                }
            });

            // 2. Quizzes (Due in 1 hour)
            quizzes.forEach(quiz => {
                if (quiz.id && !notifiedIds.current.has(quiz.id)) {
                    const quizDate = new Date(quiz.date);
                    if (quizDate > now && quizDate <= oneHourLater) {
                        notifiedIds.current.add(quiz.id);
                        sendNotification('Upcoming Quiz', { body: `Quiz "${quiz.subject}" is starting soon!`, icon: '/logo.png' });
                    }
                }
            });

            // 3. Assignments (Due in 1 hour)
            assignments.forEach(assignment => {
                if (assignment.status !== 'Submitted' && assignment.id && !notifiedIds.current.has(assignment.id)) {
                    const dueDate = new Date(assignment.dueDate);
                    if (dueDate > now && dueDate <= oneHourLater) {
                        notifiedIds.current.add(assignment.id);
                        sendNotification('Assignment Due', { body: `Assignment "${assignment.title}" is due soon!`, icon: '/logo.png' });
                    }
                }
            });
        };

        const interval = setInterval(checkUpcomingItems, 60 * 1000 * 5); // Check every 5 minutes to avoid spamming too much in dev
        checkUpcomingItems(); // Check immediately

        return () => clearInterval(interval);
    }, [tasks, quizzes, assignments]);

    const getPublicNote = useCallback(async (noteId: string): Promise<Note | null> => {
        try {
            const docRef = doc(db, 'notes', noteId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (!data.isPublic) return null; // منع الوصول لو الملاحظة مش عامة
                return { ...data, id: docSnap.id } as Note;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error fetching public note:", error);
            return null;
        }
    }, []);

    const getPublicSchedule = useCallback(async (userId: string): Promise<Class[]> => {
        try {
            const q = query(
                collection(db, 'classes'), 
                where('userId', '==', userId),
                where('isPublic', '==', true)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Class));
        } catch (error) {
            console.error("Error fetching public schedule:", error);
            return [];
        }
    }, []);

    const makeSchedulePublic = useCallback(async (userId: string, isPublic: boolean) => {
        try {
            const q = query(collection(db, 'classes'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
                batch.update(docSnap.ref, { isPublic });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error making schedule public:", error);
        }
    }, []);

    const importData = async (jsonData: any) => {
        if (!user) throw new Error("User must be logged in to import data.");

        let batch = writeBatch(db);
        let operationCount = 0;
        const MAX_BATCH_SIZE = 450;

        const processCollection = async (items: any[], collectionName: string) => {
            if (!items || !Array.isArray(items)) return;

            for (const item of items) {
                const docRef = doc(collection(db, collectionName));
                const { id, userId, ...data } = item; // Exclude original ID and userId

                // Sanitize undefined values
                const sanitizedData = Object.fromEntries(
                    Object.entries(data).filter(([_, v]) => v !== undefined)
                );

                batch.set(docRef, {
                    ...sanitizedData,
                    userId: user.uid,
                    createdAt: serverTimestamp()
                });

                operationCount++;

                if (operationCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(db); // Create a new batch
                    operationCount = 0;
                }
            }
        };

        try {
            if (jsonData.classes) await processCollection(jsonData.classes, 'classes');
            if (jsonData.tasks) await processCollection(jsonData.tasks, 'tasks');
            if (jsonData.quizzes) await processCollection(jsonData.quizzes, 'quizzes');
            if (jsonData.assignments) await processCollection(jsonData.assignments, 'assignments');
            if (jsonData.notes) await processCollection(jsonData.notes, 'notes');

            if (operationCount > 0) {
                await batch.commit();
            }
        } catch (error) {
            console.error("Error importing data:", error);
            throw error;
        }
    };

    const importSchedule = async (classesToImport: Class[]) => {
        if (!user) throw new Error('User must be logged in to import schedule.');
        let batch = writeBatch(db);
        let count = 0;
        for (const cls of classesToImport) {
            const { id, userId, ...data } = cls as any;
            const docRef = doc(collection(db, 'classes'));
            batch.set(docRef, { ...data, userId: user.uid, createdAt: serverTimestamp() });
            count++;
            if (count >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) await batch.commit();
    };

    const sendInvitation = async (email: string) => {
        if (!user) return;
        try {
            // Check if user exists in user_stats (where we store names/emails)
            const q = query(collection(db, 'user_stats'), where('email', '==', email.toLowerCase()));
            const snap = await getDocs(q);
            if (snap.empty) throw new Error("USER_NOT_REGISTERED");

            // Get Receiver UID
            const receiverDoc = snap.docs[0];
            const receiverId = receiverDoc.id;

            // Host's persistent Room ID (one per host)
            const targetRoomId = `room_${user.uid}`;

            await addDoc(collection(db, 'study_invites'), {
                senderId: user.uid,
                senderName: user.displayName || user.email?.split('@')[0],
                senderPhoto: user.photoURL || null,
                receiverId,
                receiverEmail: email.toLowerCase(),
                targetRoomId,
                status: 'pending',
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Invite Error:", error);
            throw error;
        }
    };

    const acceptInvitation = async (inviteId: string) => {
        if (!user) return;
        try {
            const inviteRef = doc(db, 'study_invites', inviteId);
            const inviteSnap = await getDoc(inviteRef);
            if (!inviteSnap.exists()) return;

            const inviteData = inviteSnap.data();
            const hostId = inviteData.senderId;
            // Fallback for old invites lacking targetRoomId
            const roomId = inviteData.targetRoomId || `room_${hostId}_${user.uid}`;

            const roomRef = doc(db, 'active_rooms', roomId);
            const roomSnap = await getDoc(roomRef);

            // Fetch current user data for member profile
            const myMemberData = {
                uid: user.uid,
                name: user.displayName || (language === 'ar' ? 'ضيف' : 'Guest'),
                photo: user.photoURL || null,
                joinedAt: Date.now()
            };

            if (roomSnap.exists()) {
                const roomData = roomSnap.data();
                if (roomData.participants?.length >= 5) {
                    throw new Error("ROOM_FULL");
                }
                // Join existing room
                await updateDoc(roomRef, {
                    participants: arrayUnion(user.uid),
                    [`members.${user.uid}`]: myMemberData,
                    lastUpdated: serverTimestamp()
                });
            } else {
                // Create new Group Room
                // Fetch Host Profile
                const hostSnap = await getDoc(doc(db, 'user_stats', hostId));
                const hostData = hostSnap.exists() ? hostSnap.data() : {};
                const hostMemberData = {
                    uid: hostId,
                    name: hostData.displayName || (language === 'ar' ? 'المضيف' : 'Host'),
                    photo: hostData.photoURL || null,
                    joinedAt: Date.now()
                };

                await setDoc(roomRef, {
                    hostId,
                    members: {
                        [hostId]: hostMemberData,
                        [user.uid]: myMemberData
                    },
                    participants: [hostId, user.uid],
                    activeNow: [user.uid],
                    timerStatus: 'idle',
                    isBreak: false,
                    targetDuration: 1500,
                    startTime: null,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp()
                });
            }

            // Update Invite Status
            await updateDoc(inviteRef, { status: 'accepted' });

            return roomId;
        } catch (error) {
            console.error("Accept Error:", error);
            throw error;
        }
    };

    const declineInvitation = async (inviteId: string) => {
        try {
            await updateDoc(doc(db, 'study_invites', inviteId), { status: 'declined' });
        } catch (error) {
            console.error("Decline Error:", error);
        }
    };

    return {
        classes,
        tasks,
        quizzes,
        assignments,
        notes,
        streak,
        totalXp,
        totalMinutes,
        completedTasksCount,
        deepSessionsCount,
        achievements,
        invites,
        activeRooms,
        handleDelete,
        handleSave,
        handleToggleTask,
        handleToggleAssignment,
        handleToggleQuiz,
        handleNoteUpdate,
        clearAllData,
        getPublicNote,
        getPublicSchedule,
        makeSchedulePublic,
        importData,
        importSchedule,
        sendInvitation,
        acceptInvitation,
        declineInvitation
    };
};