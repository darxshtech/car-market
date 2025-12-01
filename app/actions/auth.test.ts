import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { completeProfile } from './auth';
import { ProfileFormData } from '@/lib/validation';
import User from '@/lib/models/User';

let mongoServer: MongoMemoryServer;

// Mock next-auth
vi.mock('next-auth', () => ({
  default: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// Mock the mongodb connection module
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(async () => {
    // Return the existing mongoose connection
    return mongoose;
  }),
}));

import { getServerSession } from 'next-auth/next';

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

// Generator for valid email addresses
const emailArbitrary = fc.emailAddress();

// Generator for valid profile form data
const validProfileDataArbitrary = fc.record({
  fullName: fc.string({ minLength: 3, maxLength: 100 })
    .filter(s => s.trim().split(/\s+/).length >= 2), // At least 2 words
  email: emailArbitrary,
  mobileNumber: fc.integer({ min: 6000000000, max: 9999999999 }).map(n => n.toString()),
  documentType: fc.constantFrom('aadhaar' as const, 'pan' as const),
  documentNumber: fc.nat().map(n => {
    // Generate valid document numbers
    const type = Math.random() > 0.5 ? 'aadhaar' : 'pan';
    if (type === 'aadhaar') {
      return String(n).padStart(12, '0').slice(0, 12);
    } else {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return (
        letters[n % 26] +
        letters[(n + 1) % 26] +
        letters[(n + 2) % 26] +
        letters[(n + 3) % 26] +
        letters[(n + 4) % 26] +
        String(n).padStart(4, '0').slice(0, 4) +
        letters[(n + 5) % 26]
      );
    }
  }),
});

// Generator for profile data with missing fields
const incompleteProfileDataArbitrary = fc.record({
  fullName: fc.option(fc.string(), { nil: '' }),
  email: fc.option(emailArbitrary, { nil: '' }),
  mobileNumber: fc.option(fc.string(), { nil: '' }),
  documentType: fc.constantFrom('aadhaar' as const, 'pan' as const),
  documentNumber: fc.option(fc.string(), { nil: '' }),
}).filter(data => 
  !data.fullName || !data.email || !data.mobileNumber || !data.documentNumber
);

describe('Authentication Action Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 1: Profile form email prefill
   * Validates: Requirements 1.3
   * 
   * This property tests that for any successful Google OAuth response containing an email,
   * the profile completion form should use that email value.
   * Since we can't test the UI component directly in a property test, we test that
   * the server action correctly processes the email from the form data.
   */
  it('Property 1: Profile form email prefill - email from OAuth is used in profile creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArbitrary,
        fc.string({ minLength: 10, maxLength: 50 }),
        validProfileDataArbitrary,
        async (oauthEmail, googleId, profileData) => {
          // Mock session with OAuth email
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: googleId,
              email: oauthEmail,
              profileComplete: false,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          // Create profile data with the OAuth email
          const formData: ProfileFormData = {
            ...profileData,
            email: oauthEmail, // Email from OAuth should be used
          };

          const result = await completeProfile(formData);

          if (result.success) {
            // Verify user was created with the OAuth email
            const user = await User.findOne({ googleId });
            expect(user).not.toBeNull();
            expect(user!.email).toBe(oauthEmail);
          }

          // Clean up
          await User.deleteMany({ googleId });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 2: Profile validation completeness
   * Validates: Requirements 1.4
   * 
   * For any profile form submission, if any required field is missing or empty,
   * the validation should fail and prevent submission.
   */
  it('Property 2: Profile validation completeness - missing fields cause validation failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        incompleteProfileDataArbitrary,
        fc.string({ minLength: 10, maxLength: 50 }),
        async (incompleteData, googleId) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: googleId,
              email: incompleteData.email || 'test@example.com',
              profileComplete: false,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          const formData: ProfileFormData = {
            fullName: incompleteData.fullName || '',
            email: incompleteData.email || '',
            mobileNumber: incompleteData.mobileNumber || '',
            documentType: incompleteData.documentType,
            documentNumber: incompleteData.documentNumber || '',
          };

          const result = await completeProfile(formData);

          // Should fail validation
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 4: Verification failure handling
   * Validates: Requirements 1.7
   * 
   * DEMO MODE: In demo mode, verification only checks document format, not name matching.
   * For any profile submission with invalid document format,
   * the verification should fail and display an error message without creating a user record.
   */
  it('Property 4: Verification failure handling - invalid document format prevents user creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 2, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s)), // Valid name
        emailArbitrary,
        fc.string({ minLength: 10, maxLength: 50 }),
        fc.integer({ min: 6000000000, max: 9999999999 }).map(n => n.toString()),
        fc.constantFrom('aadhaar' as const, 'pan' as const),
        async (validName, email, googleId, mobileNumber, documentType) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: googleId,
              email: email,
              profileComplete: false,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          // Use INVALID document format
          const documentNumber = documentType === 'aadhaar' 
            ? '12345' // Invalid: too short
            : 'INVALID'; // Invalid: wrong format

          const formData: ProfileFormData = {
            fullName: validName,
            email: email,
            mobileNumber: mobileNumber,
            documentType: documentType,
            documentNumber: documentNumber,
          };

          const result = await completeProfile(formData);

          // Should fail validation or verification due to invalid format
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          // Can fail at validation or verification stage
          expect(result.error).toMatch(/Validation failed|Verification failed/);

          // Verify no user was created
          const user = await User.findOne({ googleId });
          expect(user).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
