import NextAuth, { NextAuthOptions, Session, User as NextAuthUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/lib/models/User';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      profileComplete: boolean;
      banned: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    profileComplete: boolean;
    banned: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    profileComplete: boolean;
    banned: boolean;
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Check against admin credentials from environment
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPass = process.env.ADMIN_PASS;

        if (
          credentials.email === adminEmail &&
          credentials.password === adminPass
        ) {
          // Return admin user object
          return {
            id: 'admin',
            email: adminEmail,
            name: 'Admin',
            profileComplete: true,
            banned: false,
          } as any;
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          await connectDB();
          
          // Check if user exists in database
          const existingUser = await User.findOne({ googleId: account.providerAccountId });
          
          if (!existingUser) {
            // New user - they will need to complete profile
            // We don't create the user here, just allow sign in
            return true;
          }
          
          // Existing user - check if banned
          if (existingUser.banned) {
            return false;
          }
          
          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }
      return true;
    },
    
    async jwt({ token, user, account, trigger }) {
      // Admin credentials login
      if (account?.provider === 'admin-credentials' && user) {
        token.id = user.id;
        token.email = user.email;
        token.profileComplete = true;
        token.banned = false;
        return token;
      }

      // Initial sign in
      if (account?.provider === 'google') {
        try {
          await connectDB();
          
          const existingUser = await User.findOne({ googleId: account.providerAccountId });
          
          if (existingUser) {
            // User exists in database - profile is complete
            token.id = existingUser._id.toString();
            token.email = existingUser.email;
            token.profileComplete = true;
            token.banned = existingUser.banned;
          } else {
            // New user - profile not complete
            token.id = account.providerAccountId;
            token.email = token.email || '';
            token.profileComplete = false;
            token.banned = false;
          }
        } catch (error) {
          console.error('Error in jwt callback:', error);
          token.profileComplete = false;
          token.banned = false;
        }
      }
      
      // Update session if profile was completed
      if (trigger === 'update') {
        try {
          await connectDB();
          const googleId = token.id;
          const existingUser = await User.findOne({ googleId });
          
          if (existingUser) {
            token.id = existingUser._id.toString();
            token.profileComplete = true;
            token.banned = existingUser.banned;
          }
        } catch (error) {
          console.error('Error updating jwt token:', error);
        }
      }
      
      return token;
    },
    
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add custom fields to session
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.profileComplete = token.profileComplete;
      session.user.banned = token.banned;
      
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // After sign in, check if profile is complete
      // If not, redirect to profile completion page
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/complete-profile`;
      }
      
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
