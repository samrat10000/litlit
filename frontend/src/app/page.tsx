'use client';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { AuthForm } from '../components/auth/AuthForm';
import { ConnectPartner } from '../components/auth/ConnectPartner';
import { HeartTap } from '../components/heart/HeartTap';

function MainContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800 dark:border-zinc-800 dark:border-t-zinc-200" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (!user.partnerId) {
    return <ConnectPartner />;
  }

  return <HeartTap />;
}

export default function Home() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
