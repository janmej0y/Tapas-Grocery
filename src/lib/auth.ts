import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const ADMIN_AUTH_EMAIL = "borj18237@gmail.com";
const adminPassword = process.env.ADMIN_PASSWORD ?? "tapadmin123";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "Admin Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();

        if (email === ADMIN_AUTH_EMAIL && credentials?.password === adminPassword) {
          return {
            id: "admin",
            name: "Tapas Store Admin",
            email: ADMIN_AUTH_EMAIL,
            role: "admin"
          };
        }

        return null;
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "missing-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "missing-google-client-secret"
    })
  ],
  callbacks: {
    async signIn({ user }) {
      return user.email?.trim().toLowerCase() === ADMIN_AUTH_EMAIL;
    },
    async jwt({ token, user }) {
      if (user?.email?.trim().toLowerCase() === ADMIN_AUTH_EMAIL) {
        token.role = "admin";
      } else if (user && "role" in user) {
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string | undefined;
      }

      return session;
    }
  },
  pages: {
    signIn: "/admin"
  }
};
