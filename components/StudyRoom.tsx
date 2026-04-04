import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Users, Zap, Heart, Star, Flame, Coffee, Trophy, User, Copy, CheckCircle2, Clock, Play, Pause, RotateCcw, Trash2, UserPlus, Edit2, Check, X } from 'lucide-react';
import { usePomodoro } from '../context/PomodoroContext';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { db } from '../src/lib/firebase';
import { doc, updateDoc, onSnapshot, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { InviteSystem } from './InviteSystem';

const EMOJIS = [
    { icon: <Zap className="w-6 h-6 text-yellow-400" />, label: '⚡' },
    { icon: <Heart className="w-6 h-6 text-rose-500" />, label: '❤️' },
    { icon: <Star className="w-6 h-6 text-amber-400" />, label: '⭐' },
    { icon: <Flame className="w-6 h-6 text-orange-500" />, label: '🔥' },
    { icon: <Coffee className="w-6 h-6 text-emerald-400" />, label: '☕' },
    { icon: <Trophy className="w-6 h-6 text-indigo-400" />, label: '🏆' },
];

export const StudyRoom: React.FC = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { timeLeft, isActive: globalIsActive, isBreak: globalIsBreak, roomId, setRoomId, roomData, isHost, setRoomDuration, toggleTimer, resetTimer } = usePomodoro();
    
    // UI derived from roomData for perfect sync
    const isRoomBreak = roomId && roomData ? roomData.isBreak : globalIsBreak;
    const isRoomActive = roomId && roomData ? roomData.timerStatus === 'running' : globalIsActive;

    const [lastEmojiTime, setLastEmojiTime] = useState(0);
    const [copied, setCopied] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
    const [customMin, setCustomMin] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [incomingEmoji, setIncomingEmoji] = useState<{ emoji: string, uid: string, timestamp: number } | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempRoomName, setTempRoomName] = useState('');
    const { deleteRoom } = usePomodoro();

    const handleCopyLink = () => {
        const link = `${window.location.origin}?room=${roomId}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Emoji Sync
    useEffect(() => {
        if (!roomId) return;
        const roomRef = doc(db, 'active_rooms', roomId);
        const unsub = onSnapshot(roomRef, (snap) => {
            const data = snap.data();
            if (data?.lastEmoji && data.lastEmoji.timestamp !== lastEmojiTime) {
                setIncomingEmoji(data.lastEmoji);
                setLastEmojiTime(data.lastEmoji.timestamp);
                setTimeout(() => setIncomingEmoji(null), 3000);
            }
        });
        return () => unsub();
    }, [roomId, user?.uid]);

    // Presence Tracking & Self-Healing Data
    useEffect(() => {
        if (!roomId || !user) return;
        const roomRef = doc(db, 'active_rooms', roomId);
        
        // Update presence and ensure current user info is in members map
        const updatePresence = async () => {
            try {
                await updateDoc(roomRef, { 
                    participants: arrayUnion(user.uid),
                    activeNow: arrayUnion(user.uid),
                    [`members.${user.uid}`]: {
                        uid: user.uid,
                        name: user.displayName || (language === 'ar' ? 'مستخدم' : 'Student'),
                        photo: user.photoURL || null,
                        joinedAt: Date.now()
                    }
                });
            } catch (err) {
                console.error("Presence Update Error:", err);
            }
        };

        updatePresence();
        
        return () => {
            updateDoc(roomRef, { activeNow: arrayRemove(user.uid) }).catch(() => {});
        };
    }, [roomId, user?.uid]);

    const sendEmoji = async (emoji: string) => {
        if (!roomId || !user) return;
        await updateDoc(doc(db, 'active_rooms', roomId), {
            lastEmoji: { emoji, uid: user.uid, timestamp: Date.now() }
        });
    };

    const handleLeave = () => { setRoomId(null); };
    
    const handleDelete = async () => {
        if (!roomId || !isHost) return;
        setIsDeleting(true);
        try {
            await deleteRoom();
            setRoomId(null);
        } catch (error) {
            console.error("Error deleting room:", error);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleModeSwitch = (mode: 'work' | 'break') => {
        setTimerMode(mode);
        if (isHost) {
            setRoomDuration(mode === 'work' ? 25 : 5, mode);
        }
    };

    const handleUpdateName = async () => {
        if (!roomId || !isHost || !tempRoomName.trim()) {
            setIsEditingName(false);
            return;
        }
        try {
            await updateDoc(doc(db, 'active_rooms', roomId), {
                name: tempRoomName.trim(),
                lastUpdated: Date.now()
            });
            setIsEditingName(false);
        } catch (error) {
            console.error("Error updating room name:", error);
            setIsEditingName(false);
        }
    };

    if (!roomId || !roomData) return null;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center overflow-hidden font-sans"
        >
            {/* Background Glows - Layered Deep Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] transition-all duration-1000 ${isRoomBreak ? 'bg-emerald-500/8' : 'bg-indigo-500/8'}`} />
                <div className="bg-glow-indigo w-[500px] h-[500px] top-0 left-1/4 opacity-70" />

                <div className="bg-glow-cyan w-[400px] h-[400px] bottom-1/4 right-0 opacity-50" />
                <div className="bg-glow-purple w-[350px] h-[350px] top-1/3 -left-20 opacity-40" />
            </div>

            {/* GLOBAL PROFESSIONAL HEADER */}
            <header className="fixed top-0 left-0 right-0 h-16 sm:h-20 flex items-center justify-between px-6 sm:px-12 z-[2100] bg-slate-950/50 backdrop-blur-xl border-b border-white/5" dir="ltr">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Zap className="w-5 h-5 text-white fill-current" />
                    </div>
                    <div className="flex flex-col items-start leading-none gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white tracking-tighter uppercase italic">R.Note</span>
                            <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-bold text-slate-500 tracking-widest uppercase">
                                Lab v2.5
                            </span>
                        </div>
                        
                        {isEditingName ? (
                            <div className="flex items-center gap-1 mt-1">
                                <input 
                                    autoFocus
                                    type="text"
                                    value={tempRoomName}
                                    onChange={(e) => setTempRoomName(e.target.value)}
                                    onBlur={handleUpdateName}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateName();
                                        if (e.key === 'Escape') setIsEditingName(false);
                                    }}
                                    className="bg-white/10 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-white outline-none w-32 sm:w-48"
                                />
                                <button onClick={handleUpdateName} className="p-1 hover:text-emerald-400 transition-colors">
                                    <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setIsEditingName(false)} className="p-1 hover:text-rose-400 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { if (isHost) { setTempRoomName(roomData?.name || (language === 'ar' ? 'غرفة الدراسة' : 'Study Room')); setIsEditingName(true); } }}>
                                <span className={`${language === 'ar' ? 'font-arabic' : 'font-sans'} text-white text-[10px] sm:text-xs font-bold tracking-wide`}>
                                    {roomData?.name || (language === 'ar' ? 'غرفة الدراسة' : 'Study Room')}
                                </span>
                                {isHost && <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Rename Room (Host Only) */}
                    {isHost && (
                        <button 
                            onClick={() => { setTempRoomName(roomData?.name || (language === 'ar' ? 'غرفة الدراسة' : 'Study Room')); setIsEditingName(true); }}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-[10px] sm:text-xs transition-all border border-white/5 group active:scale-95"
                        >
                            <Edit2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                            <span className="hidden xs:inline">{language === 'ar' ? 'إعادة تسمية' : 'Rename'}</span>
                        </button>
                    )}

                    {/* Invite Member */}
                    <button 
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-[10px] sm:text-xs transition-all border border-white/5 group active:scale-95"
                    >
                        <UserPlus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="hidden xs:inline">{language === 'ar' ? 'دعوة' : 'Invite'}</span>
                    </button>

                    {/* Leave Room */}
                    <button 
                        onClick={handleLeave}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-bold text-[10px] sm:text-xs transition-all border border-rose-500/10 group active:scale-95"
                    >
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden xs:inline">{t('leaveRoom')}</span>
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT STACK (Centered Perfectly) */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl px-6 pt-24 pb-32">
                
                {/* 1. TOP: DURATION SELECTORS (Subtle Pills) */}
                {isHost && (
                    <div className="w-full max-w-md flex flex-col items-center gap-6 mb-8 sm:mb-12">
                        {/* Work/Break Toggle */}
                        <div className="flex items-center p-1 glass-card rounded-2xl shadow-inner" style={{borderRadius:'1rem'}}>
                            <button 
                                onClick={() => handleModeSwitch('work')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timerMode === 'work' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {language === 'ar' ? 'العمل' : 'Work'}
                            </button>
                            <button 
                                onClick={() => handleModeSwitch('break')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timerMode === 'break' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {language === 'ar' ? 'الراحة' : 'Break'}
                            </button>
                        </div>

                        {/* Presets Grid */}
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                            {(timerMode === 'work' ? [25, 45, 60] : [5, 10, 15]).map(m => (
                                <button 
                                    key={m}
                                    onClick={() => setRoomDuration(m, timerMode)}
                                    className="px-5 py-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition-all min-w-[3.5rem]"
                                >
                                    {m}m
                                </button>
                            ))}
                            <div className="relative w-24">
                                <input 
                                    type="number"
                                    placeholder={language === 'ar' ? 'مخصص' : 'Custom'}
                                    value={customMin}
                                    onChange={(e) => setCustomMin(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && setRoomDuration(Number(customMin), timerMode)}
                                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-2 px-3 text-[10px] font-bold text-white focus:border-indigo-500/50 outline-none text-center placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. MIDDLE: THE TIMER (Balanced Scale) */}
                <div className="relative flex flex-col items-center mb-12 sm:mb-20">
                    <motion.div 
                        animate={{ scale: isRoomActive ? [1, 1.02, 1] : 1 }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="relative"
                    >
                        <span 
                            className={`text-[clamp(4rem,14vw,8rem)] font-black leading-none tracking-tighter tabular-nums select-none transition-colors duration-700 ${isRoomBreak ? 'text-emerald-500' : 'text-white'}`}
                            style={{ filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.03))' }}
                        >
                            {formatTime(timeLeft)}
                        </span>
                        
                        {/* Status Glow Badge */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2" dir="ltr">
                             <div className={`px-4 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 shadow-2xl transition-all ${isRoomActive ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-900/80 border-white/5 text-slate-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isRoomActive ? 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-slate-700'}`} />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap">
                                    {isRoomActive ? (isRoomBreak ? t('breakTime') : t('workTime')) : (language === 'ar' ? 'READY' : 'READY')}
                                </span>
                             </div>
                        </div>
                    </motion.div>
                </div>

                {/* 3. BOTTOM: PRIMARY CONTROLS (Professional Bar) */}
                <div className={`relative w-full max-w-xs sm:max-w-sm p-2 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl transition-all duration-700 ${isRoomActive ? (isRoomBreak ? 'glass-card glass-card-break' : 'glass-card glass-card-active') : 'glass-card'}`}>
                    <div className="flex items-center justify-between px-2" dir="ltr">
                        {isHost ? (
                            <>
                                <button 
                                    onClick={resetTimer}
                                    className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all active:scale-90"
                                    title={language === 'ar' ? 'إعادة ضبط' : 'Reset'}
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>

                                <button 
                                    onClick={toggleTimer}
                                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem] flex items-center justify-center transition-all shadow-xl ${isRoomActive ? 'bg-white text-slate-950 hover:scale-105' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/30 hover:scale-105'} active:scale-95`}
                                >
                                    {isRoomActive ? <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current translate-x-0.5" />}
                                </button>

                                <button 
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-12 h-12 flex items-center justify-center text-slate-600/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90"
                                    title={language === 'ar' ? 'حذف' : 'Delete'}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center justify-center w-full py-4 gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {language === 'ar' ? 'الجلسة جارية' : "Session Live"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* REACTION BAR (Fixed Left) */}
            <div className="fixed left-6 bottom-1/2 translate-y-1/2 hidden sm:flex flex-col gap-3 p-2 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl z-50">
                {EMOJIS.map((e, i) => (
                    <button
                        key={i}
                        onClick={() => sendEmoji(e.label)}
                        className="p-3 rounded-xl hover:bg-white/5 transition-all active:scale-90 group"
                    >
                        <div className="w-6 h-6 group-hover:scale-125 transition-transform flex items-center justify-center">
                            {e.icon}
                        </div>
                    </button>
                ))}
            </div>

            {/* MOBILE REACTION BAR (Horizontal Bottom) */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 sm:hidden flex gap-2 p-2 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl z-50 w-max max-w-[90vw] overflow-x-auto">
                {EMOJIS.map((e, i) => (
                    <button
                        key={i}
                        onClick={() => sendEmoji(e.label)}
                        className="p-2.5 rounded-lg bg-white/5 active:scale-90"
                    >
                        <div className="w-5 h-5 flex items-center justify-center">
                            {e.icon}
                        </div>
                    </button>
                ))}
            </div>

            {/* PARTICIPANT DOCK */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 backdrop-blur-2xl border border-white/5 rounded-full shadow-2xl">
                    {roomData?.participants?.slice(0, 5).map((uid: string) => {
                        const member = roomData?.members?.[uid];
                        const isActive = roomData?.activeNow?.includes(uid);

                        return (
                            <div key={uid} className="relative group">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden shadow-lg transition-transform hover:-translate-y-1">
                                     {member?.photo ? <img src={member.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">{member?.name?.[0] || 'U'}</div>}
                                </div>
                                
                                {isActive && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm shadow-emerald-500/20 z-10" />
                                )}

                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-slate-950 text-[9px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-tighter">
                                    {member?.name || 'Peer'}
                                </div>
                            </div>
                        );
                    })}
                    {roomData?.participants?.length > 5 && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border-2 border-slate-900">
                            +{roomData.participants.length - 5}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Invitation Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowInviteModal(false)}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-slate-900 rounded-[3rem] border border-white/10 p-10 overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
                            
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                                {language === 'ar' ? 'دعوة زميل دراسة' : 'Invite a Study Buddy'}
                            </h2>
                            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-8">
                                {language === 'ar' ? 'تعاون لإنجاز المزيد اليوم' : 'Collaborate to achieve more today'}
                            </p>

                            <div className="space-y-8">
                                {/* Email System */}
                                <div className="p-1 bg-white/5 rounded-[2rem] border border-white/5">
                                    <InviteSystem />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/5" />
                                    <span className="relative z-10 mx-auto w-max px-4 bg-slate-900 text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                        OR USE LINK
                                    </span>
                                </div>

                                {/* Link Copy */}
                                <button 
                                    onClick={handleCopyLink}
                                    className="w-full group flex items-center justify-between p-5 bg-white/5 hover:bg-indigo-600 rounded-[2rem] border border-white/5 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                            <Copy className="w-5 h-5 text-indigo-400 group-hover:text-white" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white/70">
                                                Room URL
                                            </span>
                                            <span className="text-sm font-bold text-slate-200 group-hover:text-white">
                                                {copied ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ رابط الغرفة' : 'Copy Room Link')}
                                            </span>
                                        </div>
                                    </div>
                                    {copied && <CheckCircle2 className="w-6 h-6 text-emerald-400 group-hover:text-white animate-bounce" />}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeleteConfirm(false)}
                            className="absolute inset-0 bg-red-950/20 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl border border-red-500/20"
                        >
                            <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-10 h-10 text-red-500" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter mb-3">
                                {language === 'ar' ? 'حذف الغرفة؟' : 'Delete Room?'}
                            </h2>
                            <p className="text-center text-slate-500 text-sm font-medium mb-8">
                                {language === 'ar' ? 'سيتم إخراج الجميع وحذف الغرفة نهائياً. لا يمكن التراجع عن هذا.' : 'Everyone will be disconnected. This action cannot be undone.'}
                            </p>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : (language === 'ar' ? 'نعم، احذف الغرفة' : 'Yes, Delete Room')}
                                </button>
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="w-full py-4 text-slate-500 hover:text-slate-700 text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                                >
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Overlay Emoji Animation */}
            <AnimatePresence>
                {incomingEmoji && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 2 }}
                        className="fixed top-1/2 right-[15%] text-[6rem] pointer-events-none drop-shadow-2xl z-50"
                    >
                        {incomingEmoji.emoji}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
