import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------
//  Admin allowlist (comma-separated ADMIN_EMAIL env var)
// ---------------------------------------------------------------------
const adminEmails = (process.env.ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email?: string | null) {
  return !!email && adminEmails.includes(email.toLowerCase());
}

// ---------------------------------------------------------------------
//  Persist/refresh a user row for an OAuth (Google) login
// ---------------------------------------------------------------------
async function upsertOAuthUser(params: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const { email, name, image } = params;
  const admin = isAdminEmail(email);
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: name ?? null,
      image: image ?? null,
      role: admin ? "admin" : "student",
      onboarded: admin, // admins skip onboarding; students/parents complete it after first login
      emailVerified: new Date(),
    },
    // On a returning login we must NOT overwrite `name`: it's editable in the
    // profile form, and writing it back here would revert an edited name to the
    // Google identity on every sign-in. `name` is seeded only on first create.
    // `image` isn't user-editable, so we keep it in sync with Google.
    update: {
      image: image ?? undefined,
      ...(admin ? { role: "admin", onboarded: true } : {}),
    },
  });
}

// Providers registered on the Node runtime (route handler).
const providers: NextAuthConfig["providers"] = [];

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: { params: { prompt: "select_account" } },
      checks: ["state"],
    }),
  );
}

// Email-password login provider — always registered.
providers.push(
  Credentials({
    id: "credentials",
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const email = (raw?.email as string)?.toLowerCase().trim();
      const password = raw?.password as string;
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) return null;

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image ?? undefined,
        role: user.role,
        onboarded: user.onboarded,
        status: user.status,
      };
    },
  }),
);

// Demo (one-click) login provider — only registered when AUTH_DEMO_LOGIN=1.
if (process.env.AUTH_DEMO_LOGIN === "1") {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: { role: { label: "Role", type: "text" } },
      async authorize(raw) {
        const r = (raw?.role as string) ?? "student";
        const role =
          r === "parent" ? "parent" : r === "admin" ? "admin" : r === "tutor" ? "tutor" : "student";
        const email =
          role === "parent"
            ? "demo-parent@tutorconnect.local"
            : role === "admin"
              ? "demo-admin@tutorconnect.local"
              : role === "tutor"
                ? "demo-tutor@tutorconnect.local"
                : "demo-student@tutorconnect.local";
        const user = await prisma.user.upsert({
          where: { email },
          create: {
            email,
            name:
              role === "admin"
                ? "Platform Admin"
                : role === "parent"
                  ? "Demo Parent"
                  : role === "tutor"
                    ? "Demo Tutor"
                    : "Demo Student",
            role,
            onboarded: true,
          },
          update: { role },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? undefined,
          role: user.role,
          onboarded: user.onboarded,
          status: user.status,
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    // This jwt callback touches the DB → only runs in the Node runtime
    // (route handler), never in Edge middleware.
    async jwt({ token, account, user, profile }) {
      // 1) Fresh Google sign-in → upsert the user row.
      if (account?.provider === "google") {
        const rawEmail = user?.email || token?.email || (profile as { email?: string })?.email;
        const email = rawEmail?.toLowerCase().trim();
        const name = user?.name || token?.name || (profile as { name?: string })?.name;
        const image = user?.image || token?.picture || (profile as { picture?: string })?.picture;

        if (email) {
          const dbUser = await upsertOAuthUser({
            email,
            name,
            image,
          });
          return {
            ...token,
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name ?? undefined,
            picture: dbUser.image ?? undefined,
            role: dbUser.role,
            onboarded: dbUser.onboarded,
            status: dbUser.status,
          };
        }
      }

      // 2) Fresh demo (Credentials) sign-in → use the user returned by authorize().
      if (account?.type === "credentials" && user) {
        const u = user as {
          id: string;
          email: string;
          name?: string;
          image?: string;
          role: string;
          onboarded: boolean;
          status: string;
        };
        return {
          ...token,
          id: u.id,
          email: u.email,
          name: u.name,
          picture: u.image,
          role: u.role,
          onboarded: u.onboarded,
          status: u.status,
        };
      }

      // 3) Returning visitor / subsequent request → re-sync role/onboarded/status from DB.
      const searchEmail = (token.email || user?.email)?.toLowerCase().trim();
      if (searchEmail) {
        const dbUser = await prisma.user.findUnique({
          where: { email: searchEmail },
        });
        if (dbUser) {
          return {
            ...token,
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name ?? undefined,
            picture: dbUser.image ?? undefined,
            role: dbUser.role,
            onboarded: dbUser.onboarded,
            status: dbUser.status,
          };
        }
      }

      return token;
    },
  },
});
