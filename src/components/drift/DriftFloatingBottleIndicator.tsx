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
    className={`absolute pointer-events-none drop-shadow-[0_0_8px_currentColor] animate-pulse ${className}`}
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
        className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400/50 rounded-full transition-transform active:scale-95 p-1 bg-transparent border-0 shadow-none"
        style={
          prefersReducedMotion
            ? undefined
            : { animation: 'floatBottle 5s ease-in-out infinite' }
        }
      >
        {/* Flashing/pulsing ambient glow aura (no outer border/circle) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/30 via-pink-500/20 to-purple-500/30 blur-xl animate-pulse pointer-events-none scale-125" />

        {/* Star Sparkles of different sizes and colors */}
        <StarSparkle size={18} className="text-cyan-300 -top-3 -left-3" style={{ animationDuration: '2.1s' }} />
        <StarSparkle size={12} className="text-pink-400 -bottom-2 -right-3" style={{ animationDuration: '1.6s' }} />
        <StarSparkle size={14} className="text-teal-300 top-2 -right-4" style={{ animationDuration: '2.8s' }} />
        <StarSparkle size={10} className="text-purple-300 bottom-1 -left-3" style={{ animationDuration: '2.4s' }} />

        {/* Bottle Image (pure bottle with flashing aura, zero outer circle) */}
        <div className="relative w-16 h-16 flex items-center justify-center drop-shadow-[0_10px_25px_rgba(0,220,235,0.5)]">
          <img
            src="/assets/aistudio/vibe_message_bottle_d7f0607e.png"
            alt="Message in a Bottle"
            className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(236,72,153,0.5)] group-hover:scale-110 transition-transform duration-300"
          />
          {bottleCount > 0 && (
            <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-pink-600 text-white font-black text-xs border border-pink-300 shadow-xl animate-bounce">
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
                transform: translateY(-8px) rotate(4deg);
              }
            }
          `}</style>
        )}
      </button>
    </div>
  );
};

