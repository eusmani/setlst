import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";
import { rateLimit } from "./rateLimit";
import { normalizePhone } from "./phone";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        identifier: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;
        const id = (credentials.identifier as string).trim();
        // Brute-force protection: max 10 attempts per identifier per 15 min.
        if (!rateLimit(`login:${id.toLowerCase()}`, 10, 15 * 60 * 1000).ok) return null;
        // Accept either an email or a username.
        const user = await prisma.user.findFirst({
          where: { OR: [{ email: id.toLowerCase() }, { username: id.toLowerCase() }] },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password as string, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.username };
      },
    }),
    // Passwordless recovery: sign in with a one-time code (sent via email/SMS by
    // /api/auth/request-code). Used by the "Sign in with a code" recovery flow.
    Credentials({
      id: "code",
      credentials: {
        identifier: {},
        code: {},
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.code) return null;
        const id = (credentials.identifier as string).trim();
        // Throttle code-verification attempts per identifier.
        if (!rateLimit(`code-verify:${id.toLowerCase()}`, 10, 15 * 60 * 1000).ok) return null;

        const isEmail = id.includes("@");
        const user = isEmail
          ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } })
          : await (async () => {
              const phone = normalizePhone(id);
              return phone ? prisma.user.findFirst({ where: { phone } }) : null;
            })();
        if (!user) return null;

        const record = await prisma.signInCode.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });
        if (!record || record.expiresAt < new Date()) {
          if (record) await prisma.signInCode.delete({ where: { id: record.id } }).catch(() => {});
          return null;
        }
        // Cap guesses per issued code to stop brute-forcing the 6 digits.
        if (record.attempts >= 5) {
          await prisma.signInCode.delete({ where: { id: record.id } }).catch(() => {});
          return null;
        }
        const ok = sha256(String(credentials.code).trim()) === record.codeHash;
        if (!ok) {
          await prisma.signInCode
            .update({ where: { id: record.id }, data: { attempts: { increment: 1 } } })
            .catch(() => {});
          return null;
        }
        // Success: burn all codes for this user.
        await prisma.signInCode.deleteMany({ where: { userId: user.id } });
        return { id: user.id, email: user.email, name: user.username };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) { token.id = user.id; token.username = user.name; }
      // Reflect a username change pushed via useSession().update({ username }).
      if (trigger === "update" && session?.username) token.username = session.username;
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
