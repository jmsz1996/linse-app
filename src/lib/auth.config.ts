import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminArea =
        nextUrl.pathname.startsWith("/admin/dashboard") ||
        nextUrl.pathname.startsWith("/admin/events");
      if (isAdminArea) return isLoggedIn;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
