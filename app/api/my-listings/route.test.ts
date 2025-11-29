import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { GET } from './route';
import Listing from '@/lib/models/Listing';
import User from '@/lib/models/User';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock mongodb connection
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(async () => ({})),
}));

import { getServerSession } from 'next-auth';

let mongoServer: MongoMemoryServer;
let testUser1Id: mongoose.Types.ObjectId;
let testUser2Id: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test users
  const user1 = new User({
    googleId: 'test-google-id-1',
    email: 'user1@example.com',
    fullName: 'Test User 1',
    mobileNumber: '9876543210',
    documentType: 'aadhaar',
    documentNumber: 'TEST123456',
    verified: true,
    banned: false,
  });
  const savedUser1 = await user1.save();
  testUser1Id = savedUser1._id as mongoose.Types.ObjectId;

  const user2 = new User({
    googleId: 'test-google-id-2',
    email: 'user2@example.com',
    fullName: 'Test User 2',
    mobileNumber: '9876543211',
    documentType: 'pan',
    documentNumber: 'TEST654321',
    verified: true,
    banned: false,
  });
  const savedUser2 = await user2.save();
  testUser2Id = savedUser2._id as mongoose.Types.ObjectId;
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
  await Listing.deleteMany({});
  vi.clearAllMocks();
});

// Generator for listing data
const listingDataArbitrary = fc.record({
  brand: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  carModel: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  variant: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  fuelType: fc.constantFrom('petrol' as const, 'diesel' as const, 'cng' as const, 'electric' as const),
  transmission: fc.constantFrom('manual' as const, 'automatic' as const),
  yearOfOwnership: fc.integer({ min: 2000, max: 2024 }),
  numberOfOwners: fc.integer({ min: 1, max: 5 }),
  kmDriven: fc.integer({ min: 0, max: 500000 }),
  city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  state: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  description: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
  price: fc.integer({ min: 100000, max: 10000000 }),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 10 }),
  status: fc.constantFrom('pending' as const, 'approved' as const, 'rejected' as const, 'sold' as const),
  interestCount: fc.integer({ min: 0, max: 1000 }),
  source: fc.constantFrom('user' as const, 'scraped' as const),
});

describe('My Garage Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 17: User-specific garage listings
   * Validates: Requirements 6.1
   * 
   * For any authenticated user viewing My Garage, only listings where sellerId matches
   * the user's ID should be displayed.
   */
  it('Property 17: User-specific garage listings - only returns listings for authenticated user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingDataArbitrary, { minLength: 1, maxLength: 10 }),
        fc.array(listingDataArbitrary, { minLength: 1, maxLength: 10 }),
        async (user1Listings, user2Listings) => {
          // Clean up before each property test run
          await Listing.deleteMany({});

          // Create listings for user 1
          const user1ListingDocs = await Promise.all(
            user1Listings.map(data =>
              Listing.create({
                ...data,
                sellerId: testUser1Id,
              })
            )
          );

          // Create listings for user 2
          await Promise.all(
            user2Listings.map(data =>
              Listing.create({
                ...data,
                sellerId: testUser2Id,
              })
            )
          );

          // Mock session for user 1
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: testUser1Id.toString(),
              email: 'user1@example.com',
              profileComplete: true,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          // Call API
          const response = await GET();
          const data = await response.json();

          // Verify only user 1's listings are returned
          expect(data.success).toBe(true);
          expect(data.listings).toBeDefined();
          expect(data.listings.length).toBe(user1Listings.length);

          // Verify all returned listings belong to user 1
          data.listings.forEach((listing: any) => {
            expect(listing.sellerId.toString()).toBe(testUser1Id.toString());
          });

          // Verify none of user 2's listings are returned
          const user2ListingIds = user2Listings.map((_, i) => i);
          data.listings.forEach((listing: any) => {
            const isUser2Listing = user2ListingIds.some(
              () => listing.sellerId.toString() === testUser2Id.toString()
            );
            expect(isUser2Listing).toBe(false);
          });
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  it('Property 17: User-specific garage listings - unauthenticated users cannot access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingDataArbitrary, { minLength: 1, maxLength: 5 }),
        async (listings) => {
          // Create some listings
          await Promise.all(
            listings.map(data =>
              Listing.create({
                ...data,
                sellerId: testUser1Id,
              })
            )
          );

          // Mock unauthenticated session
          vi.mocked(getServerSession).mockResolvedValue(null);

          // Call API
          const response = await GET();
          const data = await response.json();

          // Verify access is denied
          expect(response.status).toBe(401);
          expect(data.error).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });
});
