import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './shared/ui/card';
import { Button } from './shared/ui/button';
import { Badge } from './shared/ui/badge';
import { CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface StripeOnboardingProps {
  userId: string;
  userEmail: string;
  stripeAccountId: string | null;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export function StripeOnboarding({
  userId,
  userEmail,
  stripeAccountId,
  onboardingComplete,
  chargesEnabled,
  payoutsEnabled,
}: StripeOnboardingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call Edge Function to create Stripe account
      const { data: functionData, error: functionError } = await supabase.functions.invoke('server/stripe/create-account', {
        body: { email: userEmail, userId },
      });

      if (functionError) throw functionError;
      if (!functionData?.accountId) throw new Error('Failed to create Stripe account');

      // Update profiles record with Stripe account ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_account_id: functionData.accountId,
          stripe_onboarding_complete: functionData.detailsSubmitted,
          stripe_charges_enabled: functionData.chargesEnabled,
          stripe_payouts_enabled: functionData.payoutsEnabled,
          stripe_details_submitted: functionData.detailsSubmitted,
          stripe_onboarding_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Now generate onboarding link
      await handleStartOnboarding(functionData.accountId);
    } catch (err) {
      console.error('Error creating Stripe account:', err);
      setError(err instanceof Error ? err.message : 'Failed to create Stripe account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOnboarding = async (accountId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const accId = accountId || stripeAccountId;
      if (!accId) throw new Error('No Stripe account found');

      // Get current URL for return and refresh URLs
      const currentUrl = window.location.origin;

      // Call Edge Function to generate onboarding link
      const { data: functionData, error: functionError } = await supabase.functions.invoke('server/stripe/onboarding-link', {
        body: {
          accountId: accId,
          refreshUrl: `${currentUrl}/profile`,
          returnUrl: `${currentUrl}/profile`,
        },
      });

      if (functionError) throw functionError;
      if (!functionData?.url) throw new Error('Failed to generate onboarding link');

      // Redirect to Stripe onboarding
      window.location.href = functionData.url;
    } catch (err) {
      console.error('Error starting onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
      setIsLoading(false);
    }
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircle className="size-4 text-green-600" />
    ) : (
      <XCircle className="size-4 text-gray-400" />
    );
  };

  if (!stripeAccountId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Payment Setup
          </CardTitle>
          <CardDescription>
            Connect your bank account to receive payments from soloists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <Button
            onClick={handleCreateAccount}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              'Set Up Payments'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          Payment Status
        </CardTitle>
        <CardDescription>
          Your Stripe Connect account status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Onboarding Complete</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(onboardingComplete)}
              <Badge variant={onboardingComplete ? 'default' : 'secondary'}>
                {onboardingComplete ? 'Complete' : 'Pending'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Can Accept Payments</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(chargesEnabled)}
              <Badge variant={chargesEnabled ? 'default' : 'secondary'}>
                {chargesEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Can Receive Payouts</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(payoutsEnabled)}
              <Badge variant={payoutsEnabled ? 'default' : 'secondary'}>
                {payoutsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!onboardingComplete && (
          <Button
            onClick={() => handleStartOnboarding()}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Complete Onboarding'
            )}
          </Button>
        )}

        {onboardingComplete && (!chargesEnabled || !payoutsEnabled) && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              Additional verification may be required. Please complete your Stripe onboarding.
            </p>
            <Button
              onClick={() => handleStartOnboarding()}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="mt-2 w-full"
            >
              Update Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
