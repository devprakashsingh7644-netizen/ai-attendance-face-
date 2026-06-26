import { motion } from 'framer-motion';
import { FaGoogle } from 'react-icons/fa';

export default function GoogleButton({ onClick, loading }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={{ y: -4, scale: 1.03, boxShadow: '0 0 12px rgba(66,133,244,0.6)' }}
      whileTap={{ scale: 0.97 }}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-3xl bg-white text-gray-700 font-semibold shadow-md transition-all duration-200 hover:bg-gray-50 disabled:opacity-50"
    >
      <FaGoogle size={20} />
      {loading ? 'Signing in…' : 'Sign in with Google'}
    </motion.button>
  );
}
