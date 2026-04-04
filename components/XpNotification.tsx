import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XpEvent {
    amount: number;
    type?: string;
}

const XpNotification: React.FC = () => {
    const [notifications, setNotifications] = useState<{ id: number; amount: number }[]>([]);

    const playXpSound = useCallback((amount: number) => {
        try {
            // Procedural "Ting" sound using Web Audio API
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (!AudioContextClass) return;
            
            const audioContext = new AudioContextClass();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            // Start at 880Hz (A5) and slide to 1760Hz (A6) for a "upbeat" feel
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.4);

            // Also try to play the file if it exists (for customization)
            const audio = new Audio('/sounds/xp_gain.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Secondary fallback is silent if file missing
            });
        } catch (err) {
            console.log('Procedural audio feedback: Playback blocked.');
        }
    }, []);

    useEffect(() => {
        const handleXpEarned = (e: any) => {
            const { amount } = e.detail as XpEvent;
            const id = Date.now();
            setNotifications(prev => [...prev, { id, amount }]);

            // Play sound for positive XP
            if (amount > 0) {
                playXpSound(amount);
            }

            // Remove notification after 2 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 2000);
        };

        window.addEventListener('xp-earned', handleXpEarned);
        return () => window.removeEventListener('xp-earned', handleXpEarned);
    }, [playXpSound]);

    return (
        <div 
            style={{ 
                position: 'fixed', 
                bottom: '160px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 9000,
                pointerEvents: 'none'
            }}
            className="flex flex-col items-center gap-2"
        >
            <AnimatePresence>
                {notifications.map(n => (
                    <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 30, scale: 0.3, rotate: -5 }}
                        animate={{ opacity: 1, y: -120, scale: 1.3, rotate: 0 }}
                        exit={{ opacity: 0, scale: 2, y: -180, filter: 'blur(10px)' }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`px-4 py-2 rounded-full font-black text-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-2 border-2 ${
                            n.amount > 0 
                                ? 'bg-indigo-600 text-white border-indigo-400' 
                                : 'bg-rose-600 text-white border-rose-400'
                        }`}
                    >
                        <span className="drop-shadow-md">{n.amount > 0 ? `+${n.amount}` : n.amount}</span>
                        <span className="text-amber-300 drop-shadow-sm animate-pulse text-2xl">XP ⚡</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default XpNotification;
