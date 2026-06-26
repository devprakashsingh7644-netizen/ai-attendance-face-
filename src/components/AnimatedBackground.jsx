import React from 'react';
import { motion } from 'framer-motion';

const float = (delay = 0, dur = 6) => ({
  animate: { y: [0, -18, 0] },
  transition: { duration: dur, repeat: Infinity, ease: 'easeInOut', delay },
});

/* ── Inline SVG shapes ──────────────────────────────────────── */

function Sun() {
  return (
    <motion.div
      className="absolute top-6 right-16 w-28 h-28"
      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Rays */}
        {[0,45,90,135,180,225,270,315].map(a => (
          <line key={a} x1="60" y1="60"
            x2={60 + 55 * Math.cos(a * Math.PI / 180)}
            y2={60 + 55 * Math.sin(a * Math.PI / 180)}
            stroke="#FFD54F" strokeWidth="6" strokeLinecap="round"
          />
        ))}
        {/* Body */}
        <circle cx="60" cy="60" r="30" fill="#FFD54F" />
        {/* Face */}
        <circle cx="50" cy="55" r="4" fill="#7B5400" />
        <circle cx="70" cy="55" r="4" fill="#7B5400" />
        <path d="M 48 68 Q 60 78 72 68" stroke="#7B5400" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* Cheeks */}
        <circle cx="43" cy="65" r="5" fill="#FF8A80" opacity="0.5"/>
        <circle cx="77" cy="65" r="5" fill="#FF8A80" opacity="0.5"/>
      </svg>
    </motion.div>
  );
}

function Cloud({ x, y, delay, scale = 1 }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, transform: `scale(${scale})` }}
      animate={{ x: [0, 30, 0], y: [0, -10, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <svg width="140" height="80" viewBox="0 0 140 80" fill="none">
        <ellipse cx="70" cy="55" rx="60" ry="28" fill="white" opacity="0.9"/>
        <ellipse cx="45" cy="45" rx="32" ry="28" fill="white" opacity="0.9"/>
        <ellipse cx="95" cy="48" rx="28" ry="24" fill="white" opacity="0.9"/>
        {/* Smile */}
        <circle cx="58" cy="52" r="3" fill="#B0BEC5"/>
        <circle cx="82" cy="52" r="3" fill="#B0BEC5"/>
        <path d="M 55 60 Q 70 70 85 60" stroke="#B0BEC5" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    </motion.div>
  );
}

function Star({ x, y, delay }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y }}
      animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFD700">
        <path d="M12 2l2.09 6.26H20l-5.27 3.82 2.09 6.26L12 15.27l-4.82 3.07 2.09-6.26L4 8.26h5.91z"/>
        {/* Cute eyes */}
        <circle cx="9.5" cy="10" r="0.8" fill="#5D4037"/>
        <circle cx="14.5" cy="10" r="0.8" fill="#5D4037"/>
      </svg>
    </motion.div>
  );
}

function Butterfly({ x, y, delay }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y }}
      animate={{ x: [0, 40, -20, 0], y: [0, -30, 10, 0] }}
      transition={{ duration: 7 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <svg width="40" height="30" viewBox="0 0 40 30" fill="none">
        <ellipse cx="10" cy="12" rx="9" ry="12" fill="#F48FB1" opacity="0.85" transform="rotate(-20 10 12)"/>
        <ellipse cx="30" cy="12" rx="9" ry="12" fill="#F48FB1" opacity="0.85" transform="rotate(20 30 12)"/>
        <ellipse cx="12" cy="20" rx="6" ry="8" fill="#CE93D8" opacity="0.75" transform="rotate(15 12 20)"/>
        <ellipse cx="28" cy="20" rx="6" ry="8" fill="#CE93D8" opacity="0.75" transform="rotate(-15 28 20)"/>
        <ellipse cx="20" cy="15" rx="3" ry="10" fill="#4A148C"/>
      </svg>
    </motion.div>
  );
}

function Flower({ x, delay }) {
  return (
    <motion.div
      className="absolute bottom-0"
      style={{ left: x }}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <svg width="36" height="60" viewBox="0 0 36 60" fill="none">
        {/* Stem */}
        <line x1="18" y1="30" x2="18" y2="60" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
        {/* Petals */}
        {[0, 60, 120, 180, 240, 300].map(a => (
          <ellipse key={a} cx={18 + 10 * Math.cos(a * Math.PI / 180)} cy={18 + 10 * Math.sin(a * Math.PI / 180)}
            rx="6" ry="4" fill="#FF80AB" opacity="0.9"
            transform={`rotate(${a} ${18 + 10 * Math.cos(a * Math.PI / 180)} ${18 + 10 * Math.sin(a * Math.PI / 180)})`}
          />
        ))}
        {/* Center */}
        <circle cx="18" cy="18" r="6" fill="#FFD740"/>
        <circle cx="16" cy="16" r="1.2" fill="#5D4037"/>
        <circle cx="20" cy="16" r="1.2" fill="#5D4037"/>
        <path d="M15 20 Q18 23 21 20" stroke="#5D4037" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      </svg>
    </motion.div>
  );
}

function PinkTree({ x, delay }) {
  return (
    <motion.div
      className="absolute bottom-0"
      style={{ left: x }}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <svg width="80" height="140" viewBox="0 0 80 140" fill="none">
        {/* Trunk */}
        <rect x="32" y="100" width="16" height="40" rx="4" fill="#8D6E63"/>
        {/* Layers of foliage */}
        <ellipse cx="40" cy="95" rx="35" ry="22" fill="#F48FB1"/>
        <ellipse cx="40" cy="72" rx="28" ry="20" fill="#F06292"/>
        <ellipse cx="40" cy="50" rx="20" ry="18" fill="#EC407A"/>
        <ellipse cx="40" cy="30" rx="13" ry="14" fill="#E91E8C"/>
      </svg>
    </motion.div>
  );
}

function Hill({ fill, bottom, left, width, height }) {
  return (
    <div className="absolute" style={{ bottom, left, width, height }}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" width="100%" height="100%">
        <path d="M0 200 Q200 0 400 200 Z" fill={fill}/>
      </svg>
    </div>
  );
}

/* ── Sparkle dots ───────────────────────────────────────────── */
function SparkleParticles() {
  const sparks = Array.from({ length: 16 }, (_, i) => ({
    x: `${(i * 6.7) % 100}%`,
    y: `${(i * 13.3) % 70}%`,
    delay: i * 0.4,
    size: 4 + (i % 3) * 3,
  }));
  return (
    <>
      {sparks.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size, opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
        />
      ))}
    </>
  );
}

/* ── Main export ────────────────────────────────────────────── */
export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Sky gradient */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(160deg, #e0f4ff 0%, #fde8ff 40%, #fff6e0 100%)'
      }} />

      {/* Sun */}
      <Sun />

      {/* Clouds */}
      <Cloud x="2%" y="6%" delay={0} scale={1.2} />
      <Cloud x="30%" y="3%" delay={2} scale={0.9} />
      <Cloud x="62%" y="8%" delay={4} scale={1.1} />

      {/* Stars */}
      {[
        { x: '5%', y: '18%', delay: 0 },
        { x: '20%', y: '10%', delay: 1 },
        { x: '48%', y: '15%', delay: 0.7 },
        { x: '72%', y: '22%', delay: 1.5 },
        { x: '85%', y: '12%', delay: 0.3 },
        { x: '93%', y: '30%', delay: 2 },
      ].map((s, i) => <Star key={i} {...s} />)}

      {/* Butterflies */}
      {[
        { x: '10%', y: '35%', delay: 0 },
        { x: '35%', y: '28%', delay: 1.5 },
        { x: '60%', y: '40%', delay: 0.8 },
        { x: '80%', y: '32%', delay: 2.5 },
      ].map((b, i) => <Butterfly key={i} {...b} />)}

      {/* Rolling hills */}
      <Hill fill="#C8E6C9" bottom="0" left="0" width="100%" height="220px" />
      <Hill fill="#A5D6A7" bottom="0" left="-5%" width="55%" height="160px" />
      <Hill fill="#81C784" bottom="0" left="50%" width="55%" height="140px" />

      {/* Pink trees */}
      <PinkTree x="4%" delay={0} />
      <PinkTree x="14%" delay={1} />
      <PinkTree x="72%" delay={0.5} />
      <PinkTree x="83%" delay={1.8} />

      {/* Flowers */}
      {['8%','18%','28%','52%','65%','78%','90%'].map((x, i) => (
        <Flower key={i} x={x} delay={i * 0.4} />
      ))}

      {/* Sparkle dots */}
      <SparkleParticles />
    </div>
  );
}
