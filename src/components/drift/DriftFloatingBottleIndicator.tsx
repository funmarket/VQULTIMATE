import React from 'react';

interface DriftFloatingBottleIndicatorProps {
  bottleCount: number;
  onClick: () => void;
}

// 4-point star SVG sparkle component
const StarSparkle: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size = 14,
  className = 'text-cyan-300',
  style
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`absolute pointer-events-none drop-shadow-[0_0_6px_currentColor] animate-pulse ${className}`}
    style={style}
  >
    <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" />
  </svg>
);

export const DriftFloatingBottleIndicator: React.FC<DriftFloatingBottleIndicatorProps> = ({
  bottleCount,
  onClick
}) => {
  if (bottleCount <= 0) return null;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="absolute right-4 bottom-20 z-30 pointer-events-auto">
      <button
        type="button"
        onClick={onClick}
        aria-label="Open Message in a Bottle"
        className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 rounded-2xl transition-transform active:scale-95 p-2"
        style={
          prefersReducedMotion
            ? undefined
            : { animation: 'floatBottle 5s ease-in-out infinite' }
        }
      >
        {/* Flashing/pulsing ambient glow aura */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-cyan-500/40 via-pink-500/30 to-purple-500/40 blur-lg animate-pulse pointer-events-none" />

        {/* Star Sparkles of different sizes */}
        <StarSparkle size={16} className="text-cyan-300 -top-2 -left-2" style={{ animationDuration: '2.2s' }} />
        <StarSparkle size={10} className="text-pink-400 -bottom-1 -right-2" style={{ animationDuration: '1.8s' }} />
        <StarSparkle size={12} className="text-teal-300 top-1 -right-3" style={{ animationDuration: '3s' }} />

        {/* Bottle Image (no outer solid circle container, just bottle & flashing aura) */}
        <div className="relative w-14 h-14 flex items-center justify-center drop-shadow-[0_8px_20px_rgba(0,220,235,0.4)]">
          <img
            src="/public/assets/aistudio/vibe_message_bottle_d7f0607e.png"
            alt="Message in a Bottle"
            className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(236,72,153,0.4)] group-hover:scale-110 transition-transform duration-300"
          />
          {bottleCount > 1 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-pink-600 text-white font-black text-[10px] border border-pink-400 shadow-lg">
              {bottleCount}
            </span>
          )}
        </div>

        {/* CSS Keyframes for floating motion */}
        {!prefersReducedMotion && (
          <style>{`
            @keyframes floatBottle {
              0%, 100% {
                transform: translateY(0px) rotate(0deg);
              }
              50% {
                transform: translateY(-6px) rotate(3deg);
              }
            }
          `}</style>
        )}
      </button>
    </div>
  );
};
