import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Send, X, Check, Bell, Loader2, Users, Trash2 } from 'lucide-react';
import { useDataManagement } from '../hooks/useDataManagement';
import { useLanguage } from '../LanguageContext';
import { usePomodoro } from '../context/PomodoroContext';
import { useAuth } from '../src/context/AuthContext';
import { db } from '../src/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export const InviteSystem: React.FC = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { invites, activeRooms, sendInvitation, acceptInvitation, declineInvitation } = useDataManagement();
    const { setRoomId, roomId: currentRoomId } = usePomodoro();
    const [email, setEmail] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsSending(true);
        setMessage(null);
        try {
            await sendInvitation(email);
            setMessage({ text: t('inviteSent'), type: 'success' });
            setEmail('');
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            if (error.message === 'USER_NOT_REGISTERED') {
                setMessage({ text: language === 'ar' ? 'المستخدم غير مسجل أو يحتاج لتسجيل الدخول أولاً' : 'User not found. They must log in at least once.', type: 'error' });
            } else {
                setMessage({ text: t('inviteFailed'), type: 'error' });
            }
        } finally {
            setIsSending(false);
        }
    };

    const handleAccept = async (id: string) => {
        const roomId = await acceptInvitation(id);
        if (roomId) {
            setRoomId(roomId);
            setIsOpen(false);
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        const confirmMsg = language === 'ar' ? 'هل أنت متأكد من حذف هذه الغرفة نهائياً؟' : 'Are you sure you want to permanently delete this room?';
        if (window.confirm(confirmMsg)) {
            try {
                await deleteDoc(doc(db, 'active_rooms', roomId));
                if (currentRoomId === roomId) {
                    setRoomId(null);
                }
                setMessage({ text: language === 'ar' ? 'تم حذف الغرفة بنجاح' : 'Room deleted successfully', type: 'success' });
                setTimeout(() => setMessage(null), 3000);
            } catch (error) {
                console.error("Error deleting room from list:", error);
                setMessage({ text: language === 'ar' ? 'فشل حذف الغرفة. تأكد من أنك المضيف.' : 'Failed to delete room. Ensure you are the host.', type: 'error' });
                setTimeout(() => setMessage(null), 3000);
            }
        }
    };

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-white transition-all group"
            >
                <UserPlus className="w-5 h-5" />
                {invites.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                        {invites.length}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-[calc(100vw-22px)] sm:w-80 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 z-50 flex flex-col max-h-[80vh] overflow-hidden backdrop-blur-xl`}
                        style={{ maxWidth: 'min(350px, 92vw)' }}
                    >
                        <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <h3 className="font-black text-lg sm:text-xl text-slate-800 dark:text-white flex items-center gap-2">
                                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                                    {t('studyRoom')}
                                </h3>
                                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-white/5 p-1.5 rounded-lg active:scale-95 transition-all">
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>

                            {/* Send Invitation */}
                            <form onSubmit={handleSendInvite} className="mb-5 sm:mb-8">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    {t('inviteToStudy')}
                                </label>
                                <div className="relative group">
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('enterEmail')}
                                        className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-indigo-500/50 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 px-4 pr-12 text-sm text-slate-700 dark:text-white transition-all outline-none"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={isSending}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50"
                                    >
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                                {message && (
                                    <motion.p 
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`mt-2 text-xs font-bold px-1 ${message.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}
                                    >
                                        {message.text}
                                    </motion.p>
                                )}
                            </form>

                            {/* Pending Invites */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                                    {t('pendingInvites')}
                                </label>
                                <div className="space-y-3">
                                    {invites.length === 0 ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic px-1 font-medium">
                                            {t('noInvites')}
                                        </p>
                                    ) : (
                                        invites.map((invite) => (
                                            <motion.div 
                                                key={invite.id}
                                                layout
                                                className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between group border border-transparent hover:border-indigo-500/20"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-white truncate max-w-[120px]">
                                                        {invite.senderName}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                                                        Studying Now
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleAccept(invite.id)}
                                                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl transition-all"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => declineInvitation(invite.id)}
                                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white rounded-xl transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Previous Rooms / Rejoin */}
                            {activeRooms.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                        {language === 'ar' ? 'الغرف النشطة' : 'Active Rooms'}
                                    </h4>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        {activeRooms.map((room) => {
                                            const isRoomHost = room.hostId === user?.uid;
                                            return (
                                                <div key={room.id} className="flex items-center justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-white/5 border border-white/5 bg-indigo-500/0 hover:bg-indigo-500/5 transition-all">
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${room.timerStatus === 'running' ? 'bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                                            <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${room.timerStatus === 'running' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] sm:text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate max-w-[100px]">
                                                                {room.name || (isRoomHost ? (language === 'ar' ? 'غرفتي' : 'My Room') : `${room.members?.[room.hostId]?.name || 'Partner'}'s Room`)}
                                                            </span>
                                                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                {room.participants?.length || 0}/5 Members
                                                                <span className="mx-1 opacity-20">•</span>
                                                                <span className={room.timerStatus === 'running' ? 'text-emerald-500' : ''}>
                                                                    {room.timerStatus === 'running' ? (language === 'ar' ? 'مباشر' : 'Live') : (language === 'ar' ? 'خاملة' : 'Idle')}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                        {isRoomHost && (
                                                            <button 
                                                                onClick={() => handleDeleteRoom(room.id)}
                                                                className="p-1 sm:p-2 text-red-500/40 hover:text-red-500 transition-colors"
                                                                title={language === 'ar' ? 'حذف' : 'Delete'}
                                                            >
                                                                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => {
                                                                setRoomId(room.id);
                                                                setIsOpen(false);
                                                            }}
                                                            disabled={currentRoomId === room.id}
                                                            className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${currentRoomId === room.id ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'}`}
                                                        >
                                                            {currentRoomId === room.id ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'دخول' : 'Join')}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tip for users */}
                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                                 <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-bold italic px-1">
                                    * {language === 'ar' 
                                        ? 'تأكد أن الشخص الآخر سجل دخوله للموقع مرة واحدة على الأقل ليظهر في البحث.' 
                                        : 'Make sure the recipient has logged in at least once to appear in search.'}
                                 </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InviteSystem;
