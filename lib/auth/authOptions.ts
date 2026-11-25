import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { LoginSchema } from "@/lib/validation/schemas";
import { checkLimit, clientIdentifier, limiters } from "@/lib/ratelimit/upstash";
import { currentVersion } from "./sessions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    } & DefaultSession["user"];
    /** The account was deleted on another device: this session only gets to the goodbye page. */
    gone?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string;
    /** The account's sessionVersion when this session began. */
    sv?: number;
    /** Its account has been deleted. */
    gone?: boolean;
  }
}

/** Wrong passwords allowed in a window before sign-in waits; kept on the account, so it holds without Upstash. */
const TRIES = 10;
const TRIES_WINDOW = 15 * 60_000;

/** Ten wrong passwords in a row: the form says to wait, and the right one waits too. */
class TooManyTries extends CredentialsSignin {
  code = "too_many";
}

// An unknown email still costs a bcrypt compare, so how long sign-in takes doesn't say who has an account.
let decoy: string | null = null;
const decoyHash = () => (decoy ??= bcrypt.hashSync("not anyone's password", 10));

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        // With Upstash: a limit per address as well, across accounts.
        if (request instanceof Request && !(await checkLimit(limiters.loginIp, `login-ip:${clientIdentifier(request)}`)).ok) {
          throw new TooManyTries();
        }
        await connectDB();
        const user = await User.findOne({ email }).select("passwordHash role name email sessionVersion loginFails loginFailAt").lean();
        if (!user) {
          await bcrypt.compare(password, decoyHash());
          return null;
        }
        const now = Date.now();
        const inWindow = Boolean(user.loginFailAt) && now - user.loginFailAt!.getTime() < TRIES_WINDOW;
        if (inWindow && (user.loginFails ?? 0) >= TRIES) throw new TooManyTries();
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await User.updateOne(
            { _id: user._id },
            inWindow ? { $inc: { loginFails: 1 } } : { $set: { loginFails: 1, loginFailAt: new Date(now) } }
          );
          return null;
        }
        if (user.loginFails) await User.updateOne({ _id: user._id }, { $set: { loginFails: 0, loginFailAt: null } });
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          sv: user.sessionVersion ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: string }).role ?? "Custom";
        token.sv = (user as { sv?: number }).sv ?? 0;
        return token;
      }
      // A session from before a password change, or for an account that's gone, is over. If the
      // database can't say, the session stands: a slow database shouldn't sign everyone out.
      if (token.id && !token.gone) {
        const v = await currentVersion(token.id).catch(() => token.sv ?? 0);
        // Deleted elsewhere: it can reach /bye, which says so and signs it out, and nothing else.
        if (v === null) return { ...token, gone: true };
        if (v !== (token.sv ?? 0)) return null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.gone) return { ...session, user: { ...session.user, id: "" }, gone: true };
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
