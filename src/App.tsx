import { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Marketplace } from './components/Marketplace';
import { ProfilePage } from './components/ProfilePage';
import { supabase } from './utils/supabase/client';
import type { UserProfile } from './types/profile';

type AppState = 'loading' | 'login' | 'marketplace' | 'profile';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name || '',
          userType: session.user.user_metadata.userType || 'soloist',
          createdAt: session.user.created_at,
        };
        setProfile(profile);
        setAppState('marketplace');
      } else {
        setAppState('login');
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name || '',
          userType: session.user.user_metadata.userType || 'soloist',
          createdAt: session.user.created_at,
        };
        setProfile(profile);
        setAppState('marketplace');
      } else {
        setProfile(null);
        setAppState('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setAppState('marketplace');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAppState('login');
  };

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (appState === 'login') {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (appState === 'marketplace' && profile) {
    return (
      <Marketplace
        userId={profile.id}
        userType={profile.userType}
        userName={profile.name}
        userEmail={profile.email}
        onLogout={handleLogout}
        onEditProfile={() => setAppState('profile')}
      />
    );
  }

  if (appState === 'profile' && profile) {
    return (
      <ProfilePage
        userId={profile.id}
        userEmail={profile.email}
        userName={profile.name}
        userType={profile.userType}
        onBack={() => setAppState('marketplace')}
      />
    );
  }

  return null;
}
