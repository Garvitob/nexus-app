import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ensureCorsairTenant } from "@/lib/corsair";

/**
 * Resolve the current app user, creating them on first sight.
 *
 * On first call for a new person this:
 *   1. reads their Clerk identity
 *   2. creates a Corsair tenant scoped to them (isolated integrations)
 *   3. creates their User row in our database
 *
 * Safe to call on every request — it only creates once, then returns
 * the existing user. Returns null if nobody is signed in.
 */
export async function getOrCreateUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  // Fast path — user already exists
  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  // First time — pull full Clerk profile
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  // Create the Corsair tenant for this user (tenantId = our clerkId).
  // Each user's connected accounts live isolated under their tenant.
  let corsairTenantId: string | null = null;
  try {
    await ensureCorsairTenant(clerkId);
    corsairTenantId = clerkId;
  } catch (err) {
    // Don't block sign-up if Corsair is briefly unavailable;
    // we can provision the tenant later when they connect an app.
    console.error("Corsair tenant provisioning failed:", err);
  }

  // Create the user row. Use upsert to be safe against race conditions
  // (two requests arriving at once for a brand-new user).
  const user = await db.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email,
      name,
      imageUrl: clerkUser.imageUrl ?? null,
      corsairTenantId,
    },
  });

  return user;
}


export async function requireUser() {
  const user = await getOrCreateUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}