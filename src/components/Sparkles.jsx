import { motion } from 'framer-motion';

export default function Sparkles() {
  const sparks = Array.from({ length: 12 }, (_, i) => ({
    top: `${(i * 8.3) % 100}%`,
    left: `${(i * 13.7) % 100}%`,
    delay: i * 0.3,
  }));
  return (
    <div className="relative w-full h-full pointer-events-none">
      {sparks.map((s, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-yellow-300 rounded-full opacity-70"
          style={{ top: s.top, left: s.left }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
