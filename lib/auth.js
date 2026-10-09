import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { db, getAllConfig } from "@/lib/db";
import { enrollStudent, normalizeJoinCode } from "@/lib/enroll";

// Set by the home page when a student types a class code before signing in.
export const JOIN_CODE_COOKIE = "join_code";

// Accounts on these domains can always sign in.
const SCHOOL_DOMAINS = ["southfayette.org", "lions.net"];

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

      const isSchool = SCHOOL_DOMAINS.some((d) => email.endsWith(`@${d}`));
      const outsideAllowed = !isSchool && (await getAllConfig()).ALLOW_OUTSIDE_DOMAINS === "1";

      // A class code typed on the home page enrolls the account on the spot.
      // School accounts can always use one; other Google accounts only while
      // the teacher has "allow outside accounts" switched on.
      let code = "";
      try {
        code = normalizeJoinCode(cookies().get(JOIN_CODE_COOKIE)?.value);
        if (code) cookies().delete(JOIN_CODE_COOKIE);
      } catch {}
      if (code && (isSchool || outsideAllowed)) {
        const { data: cls } = await db.from("classes").select("id, is_active").eq("join_code", code).maybeSingle();
        if (!cls || cls.is_active === false) return "/?error=BadClassCode";
        try {
          await enrollStudent({ name: user.name?.trim() || email.split("@")[0], email, classId: cls.id });
        } catch {
          return "/?error=JoinFailed";
        }
        return true;
      }

      if (isSchool) return true;

      // Allow any pre-registered student (any Google account)
      try {
        const { data } = await db
          .from("students")
          .select("id")
          .eq("email", email)
          .single();
        if (data?.id) return true;
      } catch {}

      if (code) return "/?error=OutsideDomain";
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
