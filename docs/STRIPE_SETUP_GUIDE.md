# Stripe Connect Setup Guide

## ✅ What's Been Completed

### Phase 1 & 2: Stripe Account Setup + Pianist Onboarding

- ✅ Installed Stripe SDK packages (`stripe` and `@stripe/stripe-js`)
- ✅ Created environment variable template (`.env.local`)
- ✅ Created database migration (`supabase-stripe-connect-migration.sql`)
- ✅ Added Stripe Connect Edge Functions to server
- ✅ Created `StripeOnboarding` component for pianists
- ✅ Added payment status indicator to `ProfileSidebar`

## 🔧 Setup Steps Required

### Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/register
2. Create a Stripe account (or log in if you have one)
3. Once logged in, go to **Developers** → **API Keys**
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - Click "Reveal test key"

### Step 2: Add Stripe Keys to Environment

Open `.env.local` and replace the placeholder keys:

```bash
# Replace these with your actual Stripe test keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
```

### Step 3: Run Database Migration

Run the SQL migration in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the contents of `supabase-stripe-connect-migration.sql`
5. Paste into the editor
6. Click **Run**

This will:
- Add Stripe fields to the `users` table
- Create `payment_intents` table for Phase 3
- Set up RLS policies

### Step 4: Configure Edge Function Environment Variables

Your Supabase Edge Function needs access to the Stripe secret key:

1. Go to your Supabase project dashboard
2. Click **Edge Functions** in the left sidebar
3. Click **Manage secrets**
4. Add a new secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_test_YOUR_ACTUAL_KEY_HERE`

### Step 5: Deploy/Restart Edge Function

If you're running the Edge Function locally:
```bash
# No additional setup needed - it will use Deno.env.get()
```

If deployed to Supabase:
1. Make sure your function is deployed
2. The environment variable will be automatically available

### Step 6: Add StripeOnboarding to Your App

You need to add the `StripeOnboarding` component somewhere in your app where pianists can access it. I recommend adding it to the profile edit page or creating a dedicated payments page.

Example in `ProfileEditModal` or similar:

```tsx
import { StripeOnboarding } from './StripeOnboarding';

// Inside your component where pianists manage their profile:
{userType === 'pianist' && (
  <StripeOnboarding
    userId={userId}
    userEmail={userEmail}
    stripeAccountId={stripeAccountId}  // from user record
    onboardingComplete={onboardingComplete}  // from user record
    chargesEnabled={chargesEnabled}  // from user record
    payoutsEnabled={payoutsEnabled}  // from user record
  />
)}
```

## 🧪 Testing the Flow

### For Development/Testing:

1. **Create a Test Pianist Account**
   - Sign up as a pianist

2. **Access Stripe Onboarding**
   - Go to where you added the `StripeOnboarding` component
   - Click "Set Up Payments"

3. **Stripe Creates Account**
   - Edge Function creates a Stripe Connect Express account
   - Redirects you to Stripe's hosted onboarding

4. **Complete Onboarding (Test Mode)**
   - Use Stripe's test mode to fill out fake information
   - For test bank accounts, use: `000123456789`
   - For test routing numbers, use: `110000000`

5. **Verify Status**
   - After onboarding, check the ProfileSidebar "Payments" card
   - Should show "Active" and "Ready" badges

## 📱 What Users Will See

### Pianists Without Stripe Setup:
- ProfileSidebar shows "Setup Required" badge
- StripeOnboarding component shows "Set Up Payments" button

### During Onboarding:
- Redirected to Stripe's hosted onboarding page
- Fill out personal info, bank details, tax info
- Stripe verifies their identity

### After Complete Onboarding:
- ProfileSidebar shows "Active" and "Ready ✓"
- Can now receive payments from soloists

## 🔐 Security Notes

- ✅ **Never commit `.env.local`** - It's already in `.gitignore`
- ✅ **Secret key only in backend** - Edge Functions have access, frontend doesn't
- ✅ **Use test keys for development** - Switch to live keys only when ready for production
- ✅ **RLS policies protect data** - Users can only see their own Stripe data

## 📊 Database Schema Added

```sql
-- user_stripe_accounts table (extends auth.users):
user_id                        UUID (PRIMARY KEY)
stripe_account_id              TEXT (UNIQUE)
stripe_onboarding_complete     BOOLEAN
stripe_charges_enabled         BOOLEAN
stripe_payouts_enabled         BOOLEAN
stripe_details_submitted       BOOLEAN
stripe_onboarding_updated_at   TIMESTAMPTZ
created_at                     TIMESTAMPTZ
updated_at                     TIMESTAMPTZ

-- payment_intents table (for Phase 3):
id, ask_id, bid_id, stripe_payment_intent_id, amount,
platform_fee, currency, status, soloist_id, pianist_id, etc.
```

**Note:** We use a separate `user_stripe_accounts` table instead of adding columns to `auth.users` because Supabase's auth schema is managed separately. This approach keeps Stripe data in your public schema with proper RLS policies.

## 🚀 Next Steps (Future Phases)

**Phase 3:** Payment Authorization
- Authorize payment when bid is accepted
- Hold funds in escrow

**Phase 4:** Scheduling System
- Build "when-2-meet" functionality
- Track scheduled sessions

**Phase 5:** Session Confirmation & Payment Capture
- Both parties confirm session happened
- Capture and transfer payment to pianist
- Platform takes commission

## 🐛 Troubleshooting

### "Failed to create Stripe account"
- Check that `STRIPE_SECRET_KEY` is set in Edge Function secrets
- Verify the key starts with `sk_test_`
- Check Edge Function logs in Supabase dashboard

### "Onboarding link expired"
- Stripe onboarding links expire after a short time
- Just click "Complete Onboarding" again to get a new link

### "Relation 'users' does not exist" error
- ✅ **Fixed!** We now use `user_stripe_accounts` table instead
- Make sure you ran the updated migration SQL in Step 3
- Check for errors in the SQL Editor

### TypeScript errors about Stripe types
- Run `npm install` to ensure Stripe packages are installed
- Restart your IDE/dev server

## 📚 Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
