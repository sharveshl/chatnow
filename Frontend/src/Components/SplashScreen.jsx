import { useState, useEffect } from 'react';

function SplashScreen({ onFinish }) {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Show splash for 2.5 seconds, then fade out
        const timer = setTimeout(() => {
            setFadeOut(true);
        }, 2500);

        const finishTimer = setTimeout(() => {
            onFinish();
        }, 3200); // 2500ms display + 700ms fade

        return () => {
            clearTimeout(timer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a2818] transition-opacity duration-700
                ${fadeOut ? 'opacity-0' : 'opacity-100'}
            `}
        >
            {/* Rotating ring animation */}
            <div className="relative flex items-center justify-center">
                {/* Outer rotating ring */}
                <div className="absolute w-44 h-44 rounded-full animate-[spin_2.5s_linear_infinite]"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, #ffffff15 25%, #ffffff40 50%, #ffffff15 75%, transparent 100%)',
                    }}
                />

                {/* Second rotating ring — reverse direction */}
                <div className="absolute w-52 h-52 rounded-full animate-[spin_4s_linear_infinite_reverse]"
                    style={{
                        background: 'conic-gradient(from 180deg, transparent 0%, #ffffff08 25%, #ffffff20 50%, #ffffff08 75%, transparent 100%)',
                    }}
                />

                {/* Pulsing glow behind logo */}
                <div className="absolute w-36 h-36 rounded-full bg-white/5 animate-[pulse_2s_ease-in-out_infinite]" />

                {/* Orbiting dots */}
                <div className="absolute w-48 h-48 animate-[spin_3s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/30 rounded-full" />
                </div>
                <div className="absolute w-56 h-56 animate-[spin_5s_linear_infinite_reverse]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/40 rounded-full" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/20 rounded-full" />
                </div>

                {/* Static ring border */}
                <div className="absolute w-40 h-40 rounded-full border border-white/10" />
                <div className="absolute w-[13rem] h-[13rem] rounded-full border border-white/5" />

                {/* Logo — centered, scaled up with entrance animation */}
                <div className="relative z-10 animate-[scaleIn_0.8s_ease-out_forwards]">
                    <img
                        src="/chatnow new logo png.png"
                        alt="ChatNow"
                        className="w-28 h-28 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    />
                </div>
            </div>

            {/* App name below */}
            <div className="absolute bottom-20 flex flex-col items-center gap-2 animate-[fadeInUp_1s_ease-out_0.5s_forwards] opacity-0">
                <h1 className="text-white text-2xl font-bold tracking-wider">ChatNow</h1>
                <p className="text-white/40 text-xs tracking-widest uppercase">Real-time messaging</p>
            </div>
        </div>
    );
}

export default SplashScreen;
