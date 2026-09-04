import type { NextAuthConfig } from "next-auth";
import type { DefaultSession } from "next-auth";

/** Shape of the custom fields we store on the JWT. */
export type AppToken = {
  id?: string;
  role?: string;
  onboarded?: boolean;
  status?: string;
};

/**
 * Edge-safe Auth.js config (NO Prisma / DB access here).
 * Imported by `middleware.ts`, which runs on the Edge runtime.
 * The full config (providers + DB callbacks) lives in `auth.ts` and is used
 * by the Node route handler + server code.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login", error: "/login" },
  providers: [], // providers are added in auth.ts (Node runtime)
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      const t = token as unknown as AppToken;
      if (session.user) {
        if (t.id) session.user.id = t.id;
        if (t.role) session.user.role = t.role;
        if (typeof t.onboarded === "boolean") session.user.onboarded = t.onboarded;
        if (t.status) session.user.status = t.status;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

// ---- type augmentation: expose our custom fields on session.user ----
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      onboarded: boolean;
      status: string;
    } & DefaultSession["user"];
  }
}
