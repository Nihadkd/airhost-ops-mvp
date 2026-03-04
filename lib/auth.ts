import Credentials from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 90,
  },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.userId = user.id ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = String(credentials?.email ?? "");
        const rawPassword = String(credentials?.password ?? "");

        const email = rawEmail.trim();
        const normalizedPassword = rawPassword.replace(/\u00A0/g, " ").normalize("NFKC");

        if (!email || !normalizedPassword) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            email: {
              equals: email,
              mode: "insensitive",
            },
          },
        });

        if (!user) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        const passwordCandidates = Array.from(new Set([normalizedPassword, normalizedPassword.trim()]));

        const isValid = (
          await Promise.all(passwordCandidates.map((candidate) => bcrypt.compare(candidate, user.password)))
        ).some(Boolean);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});

