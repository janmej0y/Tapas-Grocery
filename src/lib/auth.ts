import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@tapas.local";
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
        if (credentials?.email === adminEmail && credentials.password === adminPassword) {
          return {
            id: "admin",
            name: "Tapas Store Admin",
            email: adminEmail,
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
    async jwt({ token, user }) {
      if (user && "role" in user) {
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
