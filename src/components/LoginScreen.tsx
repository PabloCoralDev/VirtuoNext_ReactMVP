import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { supabase } from '../utils/supabase/client';
import type { UserProfile } from '../types/profile';
import virtuoNextLogo from '../ui_elements/VirtuoNext Logo.png';

interface LoginScreenProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupUserType, setSignupUserType] = useState<'soloist' | 'pianist'>('soloist');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) {
        // Check if it's an email confirmation error
        if (signInError.message.includes('Email not confirmed') || signInError.message.includes('confirm')) {
          setShowResendConfirmation(true);
          setError('Email not confirmed. Please check your email or click below to resend confirmation.');
        } else {
          throw signInError;
        }
        return;
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Get user metadata
      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata.name || '',
        userType: data.user.user_metadata.userType || 'soloist',
        createdAt: data.user.created_at,
      };

      onAuthSuccess(profile);
    } catch (err) {
      console.error('Unexpected error during login:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            name: signupName,
            userType: signupUserType,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Check if email confirmation is required
      if (!data.session && data.user.identities && data.user.identities.length === 0) {
        setSuccessMessage('Account created! Please check your email to confirm your account before logging in.');
        setShowResendConfirmation(true);
        setIsLoading(false);
        return;
      }

      // Verify session was created
      if (!data.session) {
        throw new Error('No session created. Please try logging in.');
      }

      // Create profile
      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email!,
        name: signupName,
        userType: signupUserType,
        createdAt: data.user.created_at,
      };

      onAuthSuccess(profile);
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Use the email from login or signup form
      const email = loginEmail || signupEmail;

      if (!email) {
        setError('Please enter your email address');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      setSuccessMessage('Confirmation email sent! Please check your inbox.');
      setShowResendConfirmation(false);
    } catch (err) {
      console.error('Error resending confirmation:', err);
      const message = err instanceof Error ? err.message : 'Failed to resend confirmation email. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src={virtuoNextLogo}
              alt="VirtuoNext"
              className="h-12 w-12"
            />
          </div>
          <CardTitle className="text-3xl">VirtuoNext</CardTitle>
          <CardDescription>
            Connect pianists with soloists for perfect performances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Your name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSignupUserType('soloist')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        signupUserType === 'soloist'
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="mb-1">🎻</div>
                        <div>Soloist</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupUserType('pianist')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        signupUserType === 'pianist'
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="mb-1">🎹</div>
                        <div>Pianist</div>
                      </div>
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}

          {showResendConfirmation && (
            <div className="mt-4">
              <Button
                onClick={handleResendConfirmation}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Resend Confirmation Email'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
