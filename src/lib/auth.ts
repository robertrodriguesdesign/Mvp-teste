import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validations';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },

  providers: [
    // ─── Social Login ────────────────────────────────────────────────
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),

    // ─── Email + Password ────────────────────────────────────────────
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch Zei-specific fields
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { level: true, walletBalance: true, referralCode: true, neighborhood: true, city: true },
        });
        if (dbUser) Object.assign(token, dbUser);
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.id;
        u.level = token.level;
        u.walletBalance = token.walletBalance;
        u.referralCode = token.referralCode;
        u.neighborhood = token.neighborhood;
        u.city = token.city;
      }
      return session;
    },

    async signIn({ user, account }) {
      // On first social login: ensure referralCode is set
      if (account?.provider !== 'credentials' && user.id) {
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        if (dbUser && !dbUser.referralCode) {
          await db.user.update({
            where: { id: user.id },
            data: {
              referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
              walletBalance: 5.00, // Bônus de cadastro
            },
          });
          // Bonus transaction
          await db.transaction.create({
            data: {
              userId: user.id,
              type: 'earn_bonus',
              amount: 5.00,
              description: 'Bônus de boas-vindas Zei 🎉',
            },
          });
        }
      }
      return true;
    },
  },

  pages: {
    signIn: '/',
    error: '/',
  },
});
