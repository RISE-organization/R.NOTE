import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Flame, Medal, Crown } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../src/lib/firebase';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../LanguageContext';

interface LeaderboardUser {
    id: string;
    displayName: string;
    photoURL: string | null;
    streak: number;
}

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserStreak: number;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, currentUserStreak }) => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const isRtl = language === 'ar';
    const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [myRank, setMyRank] = useState<number | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                // Fetch top 10 hackers
                const topQ = query(collection(db, 'user_stats'), orderBy('streak', 'desc'), limit(10));
                const topSnap = await getDocs(topQ);
                const usersList: LeaderboardUser[] = topSnap.docs.map(doc => ({
                    id: doc.id,
                    displayName: doc.data().displayName || doc.data().name || doc.data().email?.split('@')[0] || 'Unknown Hacker',
                    photoURL: doc.data().photoURL || doc.data().avatar || null,
                    streak: doc.data().streak || 0,
                }));
                
                // Do NOT filter out any users; show exactly what we fetched.
                setTopUsers(usersList);

                // Rank Calculation
                if (user) {
                    const userInTop10Index = usersList.findIndex(u => u.id === user.uid);
                    
                    if (userInTop10Index !== -1) {
                        // Current user is in Top 10 List
                        setMyRank(userInTop10Index + 1);
                    } else {
                        // Current user is outside Top 10, find global rank via count query
                        const rankQ = query(collection(db, "user_stats"), where("streak", ">", currentUserStreak));
                        const rankSnap = await getCountFromServer(rankQ);
                        setMyRank(rankSnap.data().count + 1);
                    }
                }
            } catch (error: any) {
                console.error("Failed to fetch leaderboard or calculate rank:", error);
                // Check if Firebase requires an index
                if (error.message?.includes('index') || error.code === 'failed-precondition') {
                    console.error("🚨 CRITICAL: Firebase requires an index for this query. Check the URL in the error above to create it in the Firebase Console.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [isOpen, user, currentUserStreak]);

    // UI Rendering Logic...
    const getRankIcon = (index: number) => {
        switch(index) {
            case 0: return <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />;
            case 1: return <Medal className="w-5 h-5 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.6)]" />;
            case 2: return <Medal className="w-5 h-5 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]" />;
            default: return <span className="font-bold text-slate-500 w-5 text-center text-sm">{index + 1}</span>;
        }
    };

    const getRankStyle = (index: number) => {
        switch(index) {
            case 0: return "bg-gradient-to-r from-yellow-500/15 via-yellow-500/5 to-transparent border-yellow-500/40 shadow-[0_0_15px_rgba(250,204,21,0.1)]";
            case 1: return "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/30";
            case 2: return "bg-gradient-to-r from-amber-600/10 to-transparent border-amber-600/30";
            default: return "bg-slate-800/30 border-white/5";
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    
                    <motion.div
                         initial={{ opacity: 0, scale: 0.95, y: 30 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95, y: 30 }}
                         transition={{ type: "spring", damping: 25, stiffness: 300 }}
                         className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/80 z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center justify-center">
                                    <Trophy className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 tracking-wide">{isRtl ? 'أبطال R.Note' : 'R.Note Champions'}</h2>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">{isRtl ? 'أكثر الطلاب التزاماً بالسلاسل الدراسية' : 'Top students by study streak'}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Leaderboard List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3 relative">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

                            {loading ? (
                                <div className="flex flex-col justify-center items-center py-16 gap-3">
                                    <div className="w-8 h-8 border-t-2 border-r-2 border-amber-500 rounded-full animate-spin" />
                                    <p className="text-sm text-slate-400">{isRtl ? 'جاري جلب بيانات الأبطال...' : 'Fetching champions...'}</p>
                                </div>
                            ) : topUsers.length === 0 ? (
                                <div className="text-center py-16 flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/5 mb-2">
                                        <Trophy className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <p className="text-slate-400 font-medium">{isRtl ? 'لا يوجد متصدرين بعد.' : 'No champions yet.'}</p>
                                    <p className="text-amber-500/80 text-sm">{isRtl ? 'كُن أول بطل ينير القائمة!' : 'Be the first to light up the board!'}</p>
                                </div>
                            ) : (
                                topUsers.map((u, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                                        key={u.id} 
                                        className={`relative z-10 flex items-center justify-between p-3 rounded-2xl border ${getRankStyle(i)} transition-all hover:bg-white/5`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-8">
                                                {getRankIcon(i)}
                                            </div>
                                            <div className="relative">
                                                {u.photoURL ? (
                                                    <img src={u.photoURL} alt={u.displayName} className={`w-11 h-11 rounded-full border-2 ${i === 0 ? 'border-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'border-slate-700'} object-cover`} />
                                                ) : (
                                                    <div className={`w-11 h-11 rounded-full bg-slate-800 border-2 ${i === 0 ? 'border-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'border-slate-700'} flex items-center justify-center text-slate-300 font-extrabold text-lg uppercase`}>
                                                        {u.displayName.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-bold text-sm sm:text-base tracking-wide ${user?.uid === u.id ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500' : 'text-slate-100'}`}>
                                                    {u.displayName}
                                                </span>
                                                {user?.uid === u.id && (
                                                    <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider w-fit mt-0.5 border border-amber-500/20">{isRtl ? 'أنت' : 'You'}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-black/40 rounded-xl border border-white/5 backdrop-blur-md">
                                            <Flame className={`w-4 h-4 ${u.streak > 0 ? 'text-orange-500' : 'text-slate-600'}`} />
                                            <span className={`font-black ${i === 0 ? 'text-yellow-400' : 'text-slate-200'}`}>{u.streak}</span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Sticky Bottom Row - Current User Status */}
                        {!loading && user && (
                            <div className="p-5 border-t border-white/5 bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)] backdrop-blur-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center justify-center bg-black/40 rounded-xl min-w-[3rem] px-3 py-2 border border-white/10 shadow-inner">
                                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{isRtl ? 'المركز' : 'Rank'}</span>
                                            <span className="font-black text-xl text-white drop-shadow-md">#{myRank || '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="font-extrabold text-white text-sm tracking-wide">{user.displayName || user.email?.split('@')[0]}</p>
                                            <p className="text-xs text-orange-400/90 font-medium tracking-wide mt-0.5">
                                                {myRank === 1 ? (isRtl ? 'أنت في الصدارة!' : 'You are leading!') : (isRtl ? 'حافظ على سلسلتك للتقدم' : 'Keep it up to rank higher')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-xl border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.15)]">
                                        <Flame className="w-5 h-5 text-orange-500" />
                                        <span className="font-black text-xl text-orange-400">{currentUserStreak}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LeaderboardModal;
