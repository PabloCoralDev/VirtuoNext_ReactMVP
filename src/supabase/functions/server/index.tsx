import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import Stripe from "npm:stripe@17.5.0";

const app = new Hono();

// Initialize Stripe with secret key from environment
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const allowedUserTypes = ["soloist", "pianist"] as const;
type UserType = typeof allowedUserTypes[number];

const isUserType = (value: unknown): value is UserType =>
  typeof value === "string" && allowedUserTypes.includes(value as UserType);

interface StoredProfile {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  createdAt: string;
  password: string;
}

const toKey = (email: string) => `profile:${email.toLowerCase()}`;

const sanitizeProfile = (profile: StoredProfile) => {
  const { password, ...rest } = profile;
  return rest;
};

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint is relative to the function root (/functions/v1/<name>)
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up new quick account
app.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, userType } = body ?? {};

    if (!email || !password || !name || !userType) {
      return c.json({ error: "Missing required fields: email, password, name, and userType" }, 400);
    }

    if (!isUserType(userType)) {
      return c.json({ error: "Invalid userType: must be soloist or pianist" }, 400);
    }

    const normalizedEmail = String(email).toLowerCase();
    const existing = await kv.get(toKey(normalizedEmail));
    if (existing) {
      return c.json({ error: "Account already exists. Please sign in." }, 409);
    }

    const profile: StoredProfile = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name,
      userType,
      createdAt: new Date().toISOString(),
      password,
    };

    await kv.set(toKey(normalizedEmail), profile);
    console.log(`Created quick account for ${normalizedEmail}`);

    return c.json({ profile: sanitizeProfile(profile) });
  } catch (error) {
    console.error("Error in signup endpoint:", error);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Simple login that validates against stored credentials
app.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const normalizedEmail = String(email).toLowerCase();
    const record = await kv.get(toKey(normalizedEmail));

    if (!record || record.password !== password) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    return c.json({ profile: sanitizeProfile(record) });
  } catch (error) {
    console.error("Error in login endpoint:", error);
    return c.json({ error: "Internal server error during login" }, 500);
  }
});

// Create Stripe Connect Express Account for pianist
app.post("/stripe/create-account", async (c) => {
  try {
    const body = await c.req.json();
    const { email, userId } = body ?? {};

    if (!email || !userId) {
      return c.json({ error: "Missing required fields: email and userId" }, 400);
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: "express",
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        user_id: userId,
      },
    });

    console.log(`Created Stripe account ${account.id} for user ${userId}`);

    return c.json({
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error) {
    console.error("Error creating Stripe account:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to create Stripe account" },
      500
    );
  }
});

// Generate Stripe Connect onboarding link
app.post("/stripe/onboarding-link", async (c) => {
  try {
    const body = await c.req.json();
    const { accountId, refreshUrl, returnUrl } = body ?? {};

    if (!accountId) {
      return c.json({ error: "Missing required field: accountId" }, 400);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || "http://localhost:5173/profile",
      return_url: returnUrl || "http://localhost:5173/profile",
      type: "account_onboarding",
    });

    console.log(`Generated onboarding link for account ${accountId}`);

    return c.json({
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    });
  } catch (error) {
    console.error("Error creating onboarding link:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to create onboarding link" },
      500
    );
  }
});

// Get Stripe account status
app.post("/stripe/account-status", async (c) => {
  try {
    const body = await c.req.json();
    const { accountId } = body ?? {};

    if (!accountId) {
      return c.json({ error: "Missing required field: accountId" }, 400);
    }

    // Retrieve account details
    const account = await stripe.accounts.retrieve(accountId);

    return c.json({
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      email: account.email,
    });
  } catch (error) {
    console.error("Error retrieving account status:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve account status" },
      500
    );
  }
});

// Export the app as the default handler for Deno.serve
Deno.serve((req) => app.fetch(req));
