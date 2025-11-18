import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

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

// Export the app as the default handler for Deno.serve
Deno.serve((req) => app.fetch(req));
