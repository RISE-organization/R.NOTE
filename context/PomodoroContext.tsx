
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLanguage } from '../LanguageContext';
import { sendNotification } from '../src/utils/notifications';
import { db, auth } from '../src/lib/firebase';
import { doc, setDoc, getDoc, increment, onSnapshot, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface PomodoroContextType {
    workMin: number;
    breakMin: number;
    timeLeft: number;
    isActive: boolean;
    isBreak: boolean;
    sessions: number;
    setWorkMin: (val: number) => void;
    setBreakMin: (val: number) => void;
    toggleTimer: () => void;
    resetTimer: () => void;
    roomId: string | null;
    setRoomId: (id: string | null) => void;
    roomData: any | null;
    isHost: boolean;
    setRoomDuration: (min: number, type: 'work' | 'break') => Promise<void>;
    deleteRoom: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);
const getLocalDate = () => new Date().toLocaleDateString('en-CA'); // Force YYYY-MM-DD in Local Time

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t, language } = useLanguage();

    const [workMin, setWorkMinState] = useState(() => Number(localStorage.getItem('pomodoroWork')) || 25);
    const [breakMin, setBreakMinState] = useState(() => Number(localStorage.getItem('pomodoroBreak')) || 10);

    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = localStorage.getItem('pomodoroTimeLeft');
        return saved !== null ? Number(saved) : workMin * 60;
    });
    const [isActive, setIsActive] = useState(() => localStorage.getItem('pomodoroIsActive') === 'true');
    const [isBreak, setIsBreak] = useState(() => localStorage.getItem('pomodoroIsBreak') === 'true');
    const [sessions, setSessions] = useState(() => Number(localStorage.getItem('pomodoroSessions')) || 0);
    const [streak, setStreak] = useState(0); 
    const [currentDate, setCurrentDate] = useState(getLocalDate());
    const [roomId, setRoomId] = useState<string | null>(localStorage.getItem('pomodoroRoomId'));
    const [roomData, setRoomData] = useState<any | null>(null);
    const [serverOffset, setServerOffset] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    
    // Derived state for quick access
    const isHost = roomData?.hostId === auth.currentUser?.uid;

    const setWorkMin = (val: number) => {
        setWorkMinState(val);
        localStorage.setItem('pomodoroWork', String(val));
        if (!isActive && !isBreak) setTimeLeft(val * 60);
    };

    const setBreakMin = (val: number) => {
        setBreakMinState(val);
        localStorage.setItem('pomodoroBreak', String(val));
        if (!isActive && isBreak) setTimeLeft(val * 60);
    };

    // Initial persistence sync on mount
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const today = getLocalDate();
                const docRef = doc(db, 'user_stats', user.uid, 'pomodoro_daily', today);
                
                // Fetch today's sessions from cloud
                getDoc(docRef).then(snap => {
                    if (snap.exists()) {
                        setSessions(snap.data().count || 0);
                    } else {
                        setSessions(0); // Brand new day or first session
                    }
                });

                // Real-time sync for current day
                const unsubSnap = onSnapshot(docRef, (snap) => {
                    if (snap.exists()) {
                        setSessions(snap.data().count || 0);
                    }
                }, (error) => {
                    if (error.code !== 'permission-denied') {
                        console.error("[PomodoroContext] Daily sync error:", error);
                    }
                });

                // Sync Global User Streak for Multiplier
                const globalDocRef = doc(db, 'user_stats', user.uid);
                const unsubGlobal = onSnapshot(globalDocRef, (snap) => {
                    if (snap.exists()) {
                        setStreak(snap.data().streak || 0);
                    }
                }, (error) => {
                    if (error.code !== 'permission-denied') {
                        console.error("[PomodoroContext] Global sync error:", error);
                    }
                });

                return () => {
                    unsubSnap();
                    unsubGlobal();
                };
            }
        });

        // 1. Clock Calibration (Absolute Sync)
        const calibrate = async () => {
            if (!auth.currentUser) return;
            const uid = auth.currentUser.uid;
            const offsetRef = doc(db, 'user_stats', uid, 'system', 'offset');
            try {
                const nowLocal = Date.now();
                await setDoc(offsetRef, { timestamp: serverTimestamp() });
                const snap = await getDoc(offsetRef);
                if (snap.exists()) {
                    const serverTime = snap.data().timestamp.toMillis();
                    const roundTrip = Date.now() - nowLocal;
                    const offset = serverTime - (nowLocal + roundTrip / 2);
                    setServerOffset(offset);
                    console.log(`[Timer Calibration]: Device Drift = ${offset}ms`);
                }
            } catch (e) {
                console.warn("[Calibration Failed]: fallback to zero offset", e);
            }
        };

        calibrate();
        const calInterval = setInterval(calibrate, 10 * 60 * 1000); // Recalibrate every 10 min


        const savedIsActive = localStorage.getItem('pomodoroIsActive') === 'true';
        if (savedIsActive) {
            const lastTimestamp = Number(localStorage.getItem('pomodoroLastTimestamp'));
            if (lastTimestamp) {
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - lastTimestamp) / 1000);
                const savedTimeLeft = Number(localStorage.getItem('pomodoroTimeLeft'));
                const newTimeLeft = Math.max(0, savedTimeLeft - elapsedSeconds);

                setTimeLeft(newTimeLeft);

                if (newTimeLeft === 0) {
                    setIsActive(false);
                }
            }
        }
        return () => {
            unsubscribe();
            clearInterval(calInterval);
        };
    }, []);

    // Room Syncing logic
    useEffect(() => {
        if (!roomId) {
            setRoomData(null);
            localStorage.removeItem('pomodoroRoomId');
            return;
        }

        localStorage.setItem('pomodoroRoomId', roomId);
        const roomRef = doc(db, 'active_rooms', roomId);

        const unsubRoom = onSnapshot(roomRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setRoomData(data);
                
                const myUid = auth.currentUser?.uid;
                const isHostUser = data.hostId === myUid;

                // Sync Global Status (Host & Participant)
                setIsBreak(data.isBreak || false);
                setIsActive(data.timerStatus === 'running');

                if (data.isBreak) {
                    setBreakMinState(Math.floor((data.breakDuration || 600) / 60));
                } else {
                    setWorkMinState(Math.floor((data.targetDuration || 1500) / 60));
                }

                // IF NOT RUNNING or IF WE ARE A PARTICIPANT: Sync timeLeft from ground truth
                if (data.timerStatus !== 'running' || !isHostUser) {
                    if (data.timerStatus !== 'running') {
                        setTimeLeft(data.isBreak ? (data.breakDuration || 600) : (data.targetDuration || 1500));
                    } else if (data.startTime) {
                        const now = Date.now() + serverOffset;
                        const start = data.startTime.toMillis ? data.startTime.toMillis() : (typeof data.startTime === 'number' ? data.startTime : now);
                        const elapsed = Math.floor((now - start) / 1000);
                        const duration = data.isBreak ? (data.breakDuration || 600) : (data.targetDuration || 1500);
                        setTimeLeft(Math.max(0, duration - elapsed));
                    }
                }
            } else {
                setRoomId(null);
                setRoomData(null);
            }
        }, (error) => console.error("[Room Sync Error]:", error));

        return () => unsubRoom();
    }, [roomId]);

    // ABSOLUTE TIMER SYNC FOR ROOMS (Universal Slave Logic)
    useEffect(() => {
        if (!roomId || !roomData || roomData.timerStatus !== 'running' || !roomData.startTime) {
            return;
        }

        const tick = () => {
            const now = Date.now() + serverOffset;
            const startTimestamp = roomData.startTime;
            const start = startTimestamp?.toMillis ? startTimestamp.toMillis() : (typeof startTimestamp === 'number' ? startTimestamp : now);
            const elapsed = Math.floor((now - start) / 1000);
            const duration = roomData.isBreak ? (roomData.breakDuration || 600) : (roomData.targetDuration || 1500);
            const remaining = Math.max(0, duration - elapsed);
            setTimeLeft(remaining);
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => { if (id) clearInterval(id); };
    }, [roomId, roomData?.timerStatus, roomData?.startTime, roomData?.isBreak, serverOffset]);

    // Sync state to localStorage
    useEffect(() => {
        localStorage.setItem('pomodoroTimeLeft', String(timeLeft));
        localStorage.setItem('pomodoroIsActive', String(isActive));
        localStorage.setItem('pomodoroIsBreak', String(isBreak));
        localStorage.setItem('pomodoroSessions', String(sessions));
        if (isActive) {
            localStorage.setItem('pomodoroLastTimestamp', String(Date.now()));
        }
    }, [timeLeft, isActive, isBreak, sessions]);

    useEffect(() => {
        const isSoloMode = !roomId;
        if (isSoloMode && isActive && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(time => Math.max(0, time - 1));
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isActive, timeLeft, roomId]); 

    // Handle session transitions
    useEffect(() => {
        const triggerTransition = async () => {
            if (timeLeft === 0 && isActive) {
                if (!isBreak) {
                    // --- WORK -> BREAK ---
                    setIsBreak(true);
                    const localBreakSec = breakMin * 60;
                    setTimeLeft(localBreakSec);
                    setSessions(s => s + 1);
                    sendNotification(t('breakTimeNotification'), { body: t('takeTenMinuteBreak') || `Take a ${breakMin} minute break.` });
                    
                    // Host Authority: Push Break state to Firestore
                    if (roomId && isHost) {
                        try {
                            await updateDoc(doc(db, 'active_rooms', roomId), {
                                isBreak: true,
                                roomStatus: 'break',
                                timerStatus: 'running',
                                startTime: serverTimestamp(),
                                breakDuration: breakMin * 60,
                                lastUpdated: serverTimestamp()
                            });
                        } catch (e) { console.error("Transition sync error:", e); }
                    }

                    // XP Logic
                    const minutesWorked = workMin;
                    const bonus = minutesWorked > 50 ? 15 : minutesWorked > 30 ? 5 : 0;
                    let multiplier = streak >= 30 ? 1.6 : streak >= 15 ? 1.4 : streak >= 7 ? 1.25 : streak >= 3 ? 1.1 : 1.0;
                    const rawXP = minutesWorked + bonus;
                    let xpEarned = Math.floor(rawXP * multiplier);
                    if (roomId) xpEarned += Math.floor(xpEarned * 0.1); // Group bonus

                    const user = auth.currentUser;
                    if (user) {
                        const today = getLocalDate();
                        const dailyDocRef = doc(db, 'user_stats', user.uid, 'pomodoro_daily', today);
                        const globalDocRef = doc(db, 'user_stats', user.uid);
                        setDoc(dailyDocRef, { count: increment(1), xp: increment(xpEarned), lastUpdated: new Date() }, { merge: true });
                        setDoc(globalDocRef, { total_xp: increment(xpEarned), total_minutes_studied: increment(minutesWorked), deep_sessions_count: increment(workMin >= 50 ? 1 : 0), lastUpdated: new Date() }, { merge: true });
                    }
                } else {
                    // --- BREAK -> WORK ---
                    setIsBreak(false);
                    const localWorkSec = workMin * 60;
                    setTimeLeft(localWorkSec);
                    sendNotification(t('workTimeNotification'), { body: t('backToWork') });

                    if (roomId && isHost) {
                        try {
                            await updateDoc(doc(db, 'active_rooms', roomId), {
                                isBreak: false,
                                roomStatus: 'work',
                                timerStatus: 'running',
                                startTime: serverTimestamp(),
                                targetDuration: workMin * 60,
                                lastUpdated: serverTimestamp()
                            });
                        } catch (e) { console.error("Transition sync error:", e); }
                    }
                }
            }
        };
        triggerTransition();
    }, [timeLeft, isActive, isBreak, breakMin, workMin, t, roomId, isHost, streak]);

    const toggleTimer = async () => {
        const previousActive = isActive;
        const newActive = !isActive;
        
        // Optimistic Update
        setIsActive(newActive);

        if (roomId && roomData) {
            if (!isHost) {
                setIsActive(previousActive); // Revert if not host (prevents visual glitches)
                return;
            }
            try {
                if (newActive) {
                    await updateDoc(doc(db, 'active_rooms', roomId), {
                        timerStatus: 'running',
                        startTime: serverTimestamp(),
                        lastUpdated: serverTimestamp()
                    });
                } else {
                    const now = Date.now() + serverOffset;
                    const startTimestamp = roomData.startTime;
                    const start = startTimestamp?.toMillis ? startTimestamp.toMillis() : (typeof startTimestamp === 'number' ? startTimestamp : now);
                    const elapsed = Math.floor((now - start) / 1000);
                    const duration = roomData.isBreak ? (roomData.breakDuration || 600) : (roomData.targetDuration || 1500);
                    const exactRemaining = Math.max(0, duration - elapsed);

                    await updateDoc(doc(db, 'active_rooms', roomId), {
                        timerStatus: 'paused',
                        [roomData.isBreak ? 'breakDuration' : 'targetDuration']: exactRemaining,
                        startTime: null,
                        lastUpdated: serverTimestamp()
                    });
                }
            } catch (error) {
                console.error("Toggle sync error:", error);
                setIsActive(previousActive); // Rollback on error
            }
        }
    };

    const resetTimer = async () => {
        const resetSeconds = workMin * 60;
        if (roomId && isHost) {
            await updateDoc(doc(db, 'active_rooms', roomId), {
                timerStatus: 'idle',
                isBreak: false,
                startTime: null,
                targetDuration: resetSeconds,
                lastUpdated: serverTimestamp()
            });
        }
        setIsActive(false);
        setIsBreak(false);
        setTimeLeft(resetSeconds);
    };

    const setRoomDuration = async (min: number, type: 'work' | 'break') => {
        if (!roomId || !isHost) return;
        const seconds = min * 60;
        const isRunning = roomData?.timerStatus === 'running';
        
        const updateData: any = {
            timerStatus: isRunning ? 'running' : 'idle',
            startTime: isRunning ? serverTimestamp() : null,
            lastUpdated: serverTimestamp()
        };

        if (type === 'work') {
            updateData.targetDuration = seconds;
            updateData.isBreak = false;
            setWorkMinState(min);
            if (!isRunning) setTimeLeft(seconds);
        } else {
            updateData.breakDuration = seconds;
            updateData.isBreak = true;
            setBreakMinState(min);
            if (!isRunning) setTimeLeft(seconds);
        }
        await updateDoc(doc(db, 'active_rooms', roomId), updateData);
    };

    const deleteRoom = async () => {
        if (!roomId || !isHost) return;
        try {
            await deleteDoc(doc(db, 'active_rooms', roomId));
            setRoomId(null);
            setRoomData(null);
        } catch (e) {
            console.error("Delete room error:", e);
            throw e;
        }
    };

    return (
        <PomodoroContext.Provider value={{
            workMin, breakMin, timeLeft, isActive, isBreak, sessions,
            setWorkMin, setBreakMin, toggleTimer, resetTimer,
            roomId, setRoomId, roomData, isHost, setRoomDuration, deleteRoom
        }}>
            {children}
        </PomodoroContext.Provider>
    );
};

export const usePomodoro = () => {
    const context = useContext(PomodoroContext);
    if (!context) {
        throw new Error('usePomodoro must be used within a PomodoroProvider');
    }
    return context;
};
