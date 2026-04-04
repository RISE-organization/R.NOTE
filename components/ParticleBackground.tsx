import React, { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions, Engine } from '@tsparticles/engine';

/**
 * ParticleOptions for an elegant Purple Starfield
 */
const getParticleOptions = (isDark: boolean): ISourceOptions => ({
    fullScreen: false,
    fpsLimit: 60,
    background: { color: { value: 'transparent' } },
    particles: {
        number: {
            value: 250,
            density: { enable: true }
        },
        color: { value: isDark ? '#a855f7' : '#6366f1' }, // theme-aware color
        shape: { type: 'circle' },
        size: {
            value: { min: 1, max: 2.5 },
            animation: { enable: false }
        },
        opacity: {
            value: isDark ? { min: 0.15, max: 0.5 } : 0.15, // Elegant subtle accents in light mode
            animation: {
                enable: false, // Static stars for performance
            }
        },
        move: {
            enable: false, // NO movement for mobile stability
        },
        zIndex: { value: -50 }
    },
    interactivity: {
        events: {
            onHover: { enable: false },
            onClick: { enable: false },
            resize: { enable: true }
        }
    },
    detectRetina: true,
});

const ParticleBackground: React.FC = () => {
    const [engineReady, setEngineReady] = useState(false);
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Safe check for DOM
        if (typeof document !== 'undefined') {
            const checkTheme = () => document.documentElement.classList.contains('dark');
            setIsDark(checkTheme());

            const observer = new MutationObserver(() => {
                setIsDark(checkTheme());
            });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            
            initParticlesEngine(async (engine: Engine) => {
                await loadSlim(engine);
            }).then(() => {
                setEngineReady(true);
            });

            return () => observer.disconnect();
        }
    }, []);

    if (!engineReady) return null;

    return (
        <Particles
            id="r-note-particles"
            options={getParticleOptions(isDark)}
            className="fixed inset-0 z-[-50] pointer-events-none transition-opacity duration-1000"
        />
    );
};

export default ParticleBackground;
