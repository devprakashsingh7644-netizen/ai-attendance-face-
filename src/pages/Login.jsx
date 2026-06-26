import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import AnimatedBackground from '../components/AnimatedBackground';
import LoginCard from '../components/LoginCard';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const redirectUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-pastel-bg1 flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      <LoginCard onGoogleSignIn={handleGoogleLogin} loading={loading} error={error} />
    </div>
  );
}
