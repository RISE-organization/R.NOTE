import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

interface Achievement {
    id: string;
    name: string;
}

const AchievementCelebration: React.FC = () => {
    const { t } = useLanguage();
    const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

    const playCelebrationSound = useCallback(() => {
        try {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (!AudioContextClass) return;
            
            const audioContext = new AudioContextClass();
            const now = audioContext.currentTime;

            // Simple Major Chord Arpeggio (C Major: C4, E4, G4, C5)
            const freqs = [261.63, 329.63, 392.00, 523.25];
            
            freqs.forEach((f, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now + i * 0.1);
                
                gain.gain.setValueAtTime(0, now + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.5);
            });
        } catch (e) {
            console.warn("Celebration audio blocked.");
        }
    }, []);

    useEffect(() => {
        const handleUnlock = (e: any) => {
            const achievement = e.detail as Achievement;
            setCurrentAchievement(achievement);
            playCelebrationSound();

            // Auto-close after 5 seconds
            setTimeout(() => {
                setCurrentAchievement(null);
            }, 5000);
        };

        window.addEventListener('achievement-unlocked', handleUnlock);
        return () => window.removeEventListener('achievement-unlocked', handleUnlock);
    }, [playCelebrationSound]);

    if (!currentAchievement) return null;

    const badgeIcons: Record<string, string> = {
        streak_master: '🔥',
        xp_titan: '💎',
        task_slayer: '⚔️',
        deep_diver: '🌊'
    };

    return (
        <AnimatePresence>
            {currentAchievement && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
                >
                    {/* Dark Backdrop */}
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md pointer-events-auto" onClick={() => setCurrentAchievement(null)} />

                    {/* Celebration Content */}
                    <motion.div
                        initial={{ scale: 0.5, y: 100, rotate: -20 }}
                        animate={{ scale: 1, y: 0, rotate: 0 }}
                        exit={{ scale: 1.5, opacity: 0, y: -200 }}
                        transition={{ type: "spring", damping: 15, stiffness: 100 }}
                        className="relative z-10 bg-white dark:bg-slate-900 border-4 border-amber-400 dark:border-amber-500 rounded-[48px] p-12 text-center shadow-[0_0_80px_rgba(251,191,36,0.5)] max-w-sm w-full"
                    >
                        <motion.div
                            animate={{ 
                                rotateY: [0, 360],
                                scale: [1, 1.2, 1],
                                filter: ["drop-shadow(0 0 0px #fbbf24)", "drop-shadow(0 0 20px #fbbf24)", "drop-shadow(0 0 0px #fbbf24)"]
                            }}
                            transition={{ repeat: Infinity, duration: 4 }}
                            className="text-9xl mb-8 select-none"
                        >
                            {badgeIcons[currentAchievement.id] || '🏆'}
                        </motion.div>

                        <h3 className="text-amber-500 dark:text-amber-400 font-black text-lg tracking-widest uppercase mb-2">
                            {t('achievementUnlocked')}
                        </h3>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-6 uppercase leading-tight">
                            {t(currentAchievement.name)}
                        </h2>

                        <div className="flex flex-col gap-3">
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 4.5 }}
                                    className="h-full w-full bg-amber-400 origin-left"
                                />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                                {t('close')}
                            </p>
                        </div>

                        {/* Animated Confetti-ish Elements */}
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 0, y: 0 }}
                                animate={{ 
                                    opacity: [1, 0],
                                    x: (Math.random() - 0.5) * 400,
                                    y: (Math.random() - 0.5) * 400,
                                    scale: [1, 0]
                                }}
                                transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
                                className="absolute top-1/2 left-1/2 w-3 h-3 bg-amber-400 rounded-full"
                            />
                        ))}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AchievementCelebration;
