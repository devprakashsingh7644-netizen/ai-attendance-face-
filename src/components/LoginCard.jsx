import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Sparkles, Heart } from 'lucide-react';
import GoogleButton from './GoogleButton';

export default function LoginCard({ onGoogleSignIn, loading, error }) {
  return (
    <motion.div
      className="w-[520px] bg-white/75 backdrop-blur-md rounded-[36px] shadow-glass p-8 mx-auto flex flex-col items-center animate-float"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Logo */}
      <div className="w-20 h-20 bg-pink-200 rounded-xl flex items-center justify-center mb-6 shadow-md">
        <GraduationCap size={28} className="text-white" />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
        Welcome
      </h1>
      <p className="text-sm text-gray-500 mb-6 flex items-center gap-1">
        <Sparkles size={14} className="text-indigo-400" />
        AI Attendance Management System
      </p>

      {/* Error */}
      {error && (
        <div className="w-full bg-red-100 border border-red-300 text-red-700 rounded-md p-2 mb-4 text-center">
          {error}
        </div>
      )}

      {/* Google Button */}
      <GoogleButton onClick={onGoogleSignIn} loading={loading} />

      {/* Bottom decorative row */}
      <div className="flex items-center gap-2 mt-6">
        <div className="w-2 h-2 bg-pink-300 rounded-full" />
        <div className="w-2 h-2 bg-pink-300 rounded-full" />
        <div className="w-2 h-2 bg-pink-300 rounded-full" />
        <Heart size={16} className="text-pink-400" />
        <Sparkles className="w-4 h-4" />
      </div>
    </motion.div>
  );
}
