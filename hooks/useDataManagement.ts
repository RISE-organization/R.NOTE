import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Class, Task, Quiz, Assignment, Note, Priority, SubmissionStatus, AnyItem } from '../types';
import { db, auth } from '../src/lib/firebase';
import { sendNotification } from '../src/utils/notifications';
import { useLanguage } from '../LanguageContext';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, setDoc, doc, query, orderBy, Timestamp, where, serverTimestamp, writeBatch, getDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../src/context/AuthContext';

export const useDataManagement = (skipSubscription: boolean = false) => {
    const { user } = useAuth();
    const [classes, setClasses] = useState<Class[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [streak, setStreak] = useState<number>(0);
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

        // 4. Update Firestore
        await setDoc(doc(db, 'user_stats', userId), {
            streak: newStreak,
            lastStudyDate: today
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

        const unsubClasses = onSnapshot(qClasses, (snapshot) => {
            setClasses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Class)));
        });
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
            fetchedTasks.sort((a, b) => {
                const getDate = (date: any) => {
                    if (!date) return 0;
                    // Handle Firestore Timestamp
                    if (date.toDate) return date.toDate().getTime();
                    // Handle string/number
                    return new Date(date).getTime();
                };
                const dateA = getDate(a.createdAt);
                const dateB = getDate(b.createdAt);
                return dateB - dateA;
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

        const unsubStats = onSnapshot(qStats, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setStreak(data.streak || 0);
                setLastStudyDate(data.lastStudyDate || null);
            } else {
                setStreak(0);
                setLastStudyDate(null);
            }
        });

        return () => {
            unsubClasses();
            unsubTasks();
            unsubQuizzes();
            unsubAssignments();
            unsubNotes();
            unsubStats();
        };
    }, [user, skipSubscription]);

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
            } catch (error) {
                console.error("Error toggling task: ", error);
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
            const q = query(collection(db, 'classes'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Class));
        } catch (error) {
            console.error("Error fetching public schedule:", error);
            return [];
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

    return {
        classes,
        tasks,
        quizzes,
        assignments,
        notes,
        streak,
        handleDelete,
        handleSave,
        handleToggleTask,
        handleNoteUpdate,
        clearAllData,
        getPublicNote,
        getPublicSchedule,
        importData,
        importSchedule
    };
};