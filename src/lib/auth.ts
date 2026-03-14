import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { PLANS } from "@/constants/plans";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/login?verify=1",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM ?? "noreply@adslack.com",
    }),
  ],
  callbacks: {
    // Hydrate token with role + credits on sign-in or forced refresh
    async jwt({ token, user, trigger }) {
      if (user || trigger === "update") {
        const userId = user?.id ?? token.id;
        if (!userId) return token;

        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
            subscription: { select: { creditsUsed: true, creditsLimit: true } },
          },
        });

        if (dbUser) {
          const plan = PLANS[dbUser.role];
          const creditsLimit =
            plan.creditsPerMonth === -1 ? 999999 : plan.creditsPerMonth;
          const creditsUsed = dbUser.subscription?.creditsUsed ?? 0;

          token.id = dbUser.id;
          token.role = dbUser.role;
          token.creditsLimit = creditsLimit;
          token.creditsRemaining = Math.max(0, creditsLimit - creditsUsed);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role ?? UserRole.FREE;
        session.user.creditsRemaining = token.creditsRemaining ?? 0;
        session.user.creditsLimit = token.creditsLimit ?? 0;
      }
      return session;
    },
  },
  events: {
    // Provision a FREE subscription row the moment a user is created
    async createUser({ user }) {
      await db.subscription.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          plan: UserRole.FREE,
          creditsUsed: 0,
          creditsLimit: PLANS.FREE.creditsPerMonth,
          billingCycleStart: new Date(),
        },
      });
    },
  },
};
