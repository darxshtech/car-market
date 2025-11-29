import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User, { IUser } from './User';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 60000); // Increase timeout to 60 seconds

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
});

// Generator for valid user data
const userDataArbitrary = fc.record({
  googleId: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10),
  email: fc.emailAddress(),
  fullName: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
  mobileNumber: fc.integer({ min: 6000000000, max: 9999999999 }).map(n => n.toString()),
  documentType: fc.constantFrom('aadhaar' as const, 'pan' as const),
  documentNumber: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
  verified: fc.boolean(),
  banned: fc.boolean(),
});

describe('User Schema Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 3: User profile round-trip
   * Validates: Requirements 1.6
   */
  it('Property 3: User profile round-trip - storing and retrieving user data preserves all fields', async () => {
    await fc.assert(
      fc.asyncProperty(userDataArbitrary, async (userData) => {
        // Create and save user
        const user = new User(userData);
        const savedUser = await user.save();

        // Retrieve user from database
        const retrievedUser = await User.findById(savedUser._id);

        // Verify all fields are preserved
        expect(retrievedUser).not.toBeNull();
        expect(retrievedUser!.googleId).toBe(userData.googleId);
        expect(retrievedUser!.email).toBe(userData.email);
        expect(retrievedUser!.fullName).toBe(userData.fullName);
        expect(retrievedUser!.mobileNumber).toBe(userData.mobileNumber);
        expect(retrievedUser!.documentType).toBe(userData.documentType);
        expect(retrievedUser!.documentNumber).toBe(userData.documentNumber);
        expect(retrievedUser!.verified).toBe(userData.verified);
        expect(retrievedUser!.banned).toBe(userData.banned);
        expect(retrievedUser!.createdAt).toBeInstanceOf(Date);
        expect(retrievedUser!.updatedAt).toBeInstanceOf(Date);

        // Clean up
        await User.findByIdAndDelete(savedUser._id);
      }),
      { numRuns: 100 }
    );
  });
});
