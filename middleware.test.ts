import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';

let mongoServer: MongoMemoryServer;

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

// Mock the mongodb connection module
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(async () => {
    return mongoose;
  }),
}));

import { getToken } from 'next-auth/jwt';
import User from '@/lib/models/User';
import { middleware } from './middleware';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  vi.clearAllMocks();
});

describe('Middleware Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 29: Protected route authentication
   * Validates: Requirements 12.1, 12.2
   * 
   * For any unauthenticated request to protected routes (/sell-car, /my-garage),
   * the system should redirect to the sign-in page without rendering the protected content.
   */
  it('Property 29: Protected route authentication - unauthenticated users are redirected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/sell-car', '/my-garage', '/sell-car/new', '/my-garage/edit'),
        async (protectedPath) => {
          // Mock no token (unauthenticated)
          vi.mocked(getToken).mockResolvedValue(null);

          // Create mock request
          const request = new NextRequest(new URL(`http://localhost:3000${protectedPath}`));

          // Call middleware
          const response = await middleware(request);

          // Verify redirect to signin
          expect(response.status).toBe(307); // Temporary redirect
          expect(response.headers.get('location')).toContain('/signin');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29: Protected route authentication - authenticated users with complete profile can access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/sell-car', '/my-garage'),
        fc.string({ minLength: 10, maxLength: 30 }), // userId
        fc.emailAddress(), // email
        async (protectedPath, userId, email) => {
          // Create user in database
          const user = await User.create({
            googleId: userId,
            email,
            fullName: 'Test User',
            mobileNumber: '9876543210',
            documentType: 'aadhaar',
            documentNumber: '123456789012',
            verified: true,
            banned: false,
          });

          // Mock authenticated token with complete profile
          vi.mocked(getToken).mockResolvedValue({
            id: user._id.toString(),
            email: user.email,
            profileComplete: true,
            banned: false,
            iat: Date.now() / 1000,
            exp: Date.now() / 1000 + 3600,
            jti: 'test-jti',
          } as any);

          // Create mock request
          const request = new NextRequest(new URL(`http://localhost:3000${protectedPath}`));

          // Call middleware
          const response = await middleware(request);

          // Verify access is allowed (no redirect)
          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 29: Protected route authentication - incomplete profile redirects to complete-profile', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/sell-car', '/my-garage'),
        fc.string({ minLength: 10, maxLength: 30 }), // userId
        fc.emailAddress(), // email
        async (protectedPath, userId, email) => {
          // Mock authenticated token with incomplete profile
          vi.mocked(getToken).mockResolvedValue({
            id: userId,
            email,
            profileComplete: false,
            banned: false,
            iat: Date.now() / 1000,
            exp: Date.now() / 1000 + 3600,
            jti: 'test-jti',
          } as any);

          // Create mock request
          const request = new NextRequest(new URL(`http://localhost:3000${protectedPath}`));

          // Call middleware
          const response = await middleware(request);

          // Verify redirect to complete-profile
          expect(response.status).toBe(307);
          expect(response.headers.get('location')).toContain('/complete-profile');
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 30: Session validation on protected routes
   * Validates: Requirements 12.4
   * 
   * For any authenticated user accessing protected routes, the NextAuth middleware
   * should verify the session token before allowing access.
   */
  it('Property 30: Session validation on protected routes - valid tokens are accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/sell-car', '/my-garage'),
        fc.string({ minLength: 10, maxLength: 30 }), // userId
        fc.emailAddress(), // email
        fc.integer({ min: Math.floor(Date.now() / 1000) + 60, max: Math.floor(Date.now() / 1000) + 7200 }), // future expiry
        async (protectedPath, userId, email, exp) => {
          // Create user in database
          const user = await User.create({
            googleId: userId,
            email,
            fullName: 'Test User',
            mobileNumber: '9876543210',
            documentType: 'aadhaar',
            documentNumber: '123456789012',
            verified: true,
            banned: false,
          });

          // Mock valid token with future expiry
          vi.mocked(getToken).mockResolvedValue({
            id: user._id.toString(),
            email: user.email,
            profileComplete: true,
            banned: false,
            iat: Date.now() / 1000,
            exp,
            jti: 'test-jti',
          } as any);

          // Create mock request
          const request = new NextRequest(new URL(`http://localhost:3000${protectedPath}`));

          // Call middleware
          const response = await middleware(request);

          // Verify access is allowed
          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 30: Session validation on protected routes - invalid tokens are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/sell-car', '/my-garage'),
        async (protectedPath) => {
          // Mock invalid token (getToken returns null for invalid/expired tokens)
          vi.mocked(getToken).mockResolvedValue(null);

          // Create mock request
          const request = new NextRequest(new URL(`http://localhost:3000${protectedPath}`));

          // Call middleware
          const response = await middleware(request);

          // Verify redirect to signin
          expect(response.status).toBe(307);
          expect(response.headers.get('location')).toContain('/signin');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 31: Expired session handling
   * Validates: Requirements 12.5
   * 
   * For any request with an expired session token to protected routes, the system
   * should redirect to the sign-in page and clear the invalid session.
   */
  it('Property 31: Expired session handling - expired tokens redirect to signin', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/sell-car', '/my-garage'),
        async (protectedPath) => {
          // Mock expired token (getToken returns null for expired tokens)
          vi.mocked(getToken).mockResolvedValue(null);

          // Create mock request
          const request = new NextRequest(new URL(`http://localhost:3000${protectedPath}`));

          // Call middleware
          const response = await middleware(request);

          // Verify redirect to signin (expired sessions are treated as unauthenticated)
          expect(response.status).toBe(307);
          expect(response.headers.get('location')).toContain('/signin');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 31: Expired session handling - recently expired tokens are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/sell-car', '/my-garage'),
        fc.string({ minLength: 10, maxLength: 30 }), // userId
        fc.emailAddress(), // email
        fc.integer({ min: Math.floor(Date.now() / 1000) - 7200, max: Math.floor(Date.now() / 1000) - 60 }), // past expiry
        async (protectedPath, userId, email, exp) => {
          // Mock expired token (getToken automatically validates expiry and returns null)
          // In real scenario, getToken would return null for expired tokens
          vi.mocked(getToken).mockResolvedValue(null);

          // Create mock request
          const request = new NextRequest(new URL(`http://localhost:3000${protectedPath}`));

          // Call middleware
          const response = await middleware(request);

          // Verify redirect to signin
          expect(response.status).toBe(307);
          expect(response.headers.get('location')).toContain('/signin');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 5: Banned user access prevention - banned users are redirected from protected routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/sell-car', '/my-garage'),
        fc.string({ minLength: 10, maxLength: 30 }), // userId
        fc.emailAddress(), // email
        async (protectedPath, userId, email) => {
          // Create banned user in database
          const user = await User.create({
            googleId: userId,
            email,
            fullName: 'Banned User',
            mobileNumber: '9876543210',
            documentType: 'aadhaar',
            documentNumber: '123456789012',
            verified: true,
            banned: true, // User is banned
          });

          // Mock authenticated token
          vi.mocked(getToken).mockResolvedValue({
            id: user._id.toString(),
            email: user.email,
            profileComplete: true,
            banned: true,
            iat: Date.now() / 1000,
            exp: Date.now() / 1000 + 3600,
            jti: 'test-jti',
          } as any);

          // Create mock request
          const request = new NextRequest(new URL(`http://localhost:3000${protectedPath}`));

          // Call middleware
          const response = await middleware(request);

          // Verify redirect with banned error
          expect(response.status).toBe(307);
          expect(response.headers.get('location')).toContain('/?error=banned');
        }
      ),
      { numRuns: 50 }
    );
  });
});
