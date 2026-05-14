import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase() || "";

      // Always allow teacher
      if (email === process.env.TEACHER_EMAIL?.toLowerCase()) return true;

      // Allow any southfayette.org email
      if (email.endsWith("@southfayette.org")) return true;

      // Allow any pre-registered student (any Google account)
      try {
        const { data } = await db
          .from("students")
          .select("id")
          .eq("email", email)
          .single();
        if (data?.id) return true;
      } catch {}

      return false;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return `${baseUrl}/dashboard`;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
