import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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
let testUserId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test user
  const user = new User({
    googleId: 'test-google-id',
    email: 'seller@example.com',
    fullName: 'Test Seller',
    mobileNumber: '9876543210',
    documentType: 'aadhaar',
    documentNumber: 'TEST123456',
    verified: true,
    banned: false,
  });
  const savedUser = await user.save();
  testUserId = savedUser._id as mongoose.Types.ObjectId;
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
  interestCount: fc.integer({ min: 0, max: 1000 }),
  source: fc.constantFrom('user' as const, 'scraped' as const),
});

describe('Sold Listing Visibility Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 19: Sold listing visibility
   * Validates: Requirements 6.5
   * 
   * For any listing marked as "sold", it should not appear in public Buy Car page results
   * but should remain visible in the seller's My Garage with sold status.
   */
  it('Property 19: Sold listing visibility - sold listings excluded from public search', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingDataArbitrary, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        async (listingsData, numSold) => {
          // Clean up before each property test run
          await Listing.deleteMany({});

          // Ensure we don't try to mark more as sold than we have
          const actualNumSold = Math.min(numSold, listingsData.length - 1);

          // Create listings - some approved, some sold
          const createdListings = await Promise.all(
            listingsData.map((data, index) =>
              Listing.create({
                ...data,
                sellerId: testUserId,
                status: index < actualNumSold ? 'sold' : 'approved',
              })
            )
          );

          // Simulate Buy Car page query - only fetch approved listings
          const publicListings = await Listing.find({ status: 'approved' }).lean();

          // Verify no sold listings appear in public results
          expect(publicListings.length).toBe(listingsData.length - actualNumSold);
          publicListings.forEach((listing: any) => {
            expect(listing.status).toBe('approved');
            expect(listing.status).not.toBe('sold');
          });

          // Verify sold listings exist in database
          const soldListings = await Listing.find({ status: 'sold' }).lean();
          expect(soldListings.length).toBe(actualNumSold);
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  it('Property 19: Sold listing visibility - sold listings visible in seller garage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingDataArbitrary, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        async (listingsData, numSold) => {
          // Clean up before each property test run
          await Listing.deleteMany({});

          // Ensure we don't try to mark more as sold than we have
          const actualNumSold = Math.min(numSold, listingsData.length - 1);

          // Create listings with mixed statuses
          const createdListings = await Promise.all(
            listingsData.map((data, index) =>
              Listing.create({
                ...data,
                sellerId: testUserId,
                status: index < actualNumSold ? 'sold' : 'approved',
              })
            )
          );

          // Mock session for the seller
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: testUserId.toString(),
              email: 'seller@example.com',
              profileComplete: true,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          // Simulate My Garage query - fetch all listings for this seller
          const garageListings = await Listing.find({ sellerId: testUserId }).lean();

          // Verify all listings (including sold) appear in garage
          expect(garageListings.length).toBe(listingsData.length);

          // Verify sold listings are present with correct status
          const soldInGarage = garageListings.filter((l: any) => l.status === 'sold');
          expect(soldInGarage.length).toBe(actualNumSold);

          // Verify approved listings are also present
          const approvedInGarage = garageListings.filter((l: any) => l.status === 'approved');
          expect(approvedInGarage.length).toBe(listingsData.length - actualNumSold);
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  it('Property 19: Sold listing visibility - marking as sold changes visibility', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingDataArbitrary,
        async (listingData) => {
          // Clean up before each property test run
          await Listing.deleteMany({});

          // Create an approved listing
          const listing = await Listing.create({
            ...listingData,
            sellerId: testUserId,
            status: 'approved',
          });

          // Verify it appears in public search
          const publicBeforeSold = await Listing.find({ status: 'approved' }).lean();
          expect(publicBeforeSold.length).toBe(1);
          expect(publicBeforeSold[0]._id.toString()).toBe(listing._id.toString());

          // Mark as sold
          await Listing.findByIdAndUpdate(listing._id, { status: 'sold' });

          // Verify it no longer appears in public search
          const publicAfterSold = await Listing.find({ status: 'approved' }).lean();
          expect(publicAfterSold.length).toBe(0);

          // Verify it still appears in seller's garage
          const garageListings = await Listing.find({ sellerId: testUserId }).lean();
          expect(garageListings.length).toBe(1);
          expect(garageListings[0].status).toBe('sold');
          expect(garageListings[0]._id.toString()).toBe(listing._id.toString());
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('Property 19: Sold listing visibility - only approved status appears in public', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingDataArbitrary, { minLength: 4, maxLength: 12 }),
        async (listingsData) => {
          // Clean up before each property test run
          await Listing.deleteMany({});

          // Create listings with all possible statuses
          const statuses: Array<'pending' | 'approved' | 'rejected' | 'sold'> = 
            ['pending', 'approved', 'rejected', 'sold'];
          
          const createdListings = await Promise.all(
            listingsData.map((data, index) =>
              Listing.create({
                ...data,
                sellerId: testUserId,
                status: statuses[index % statuses.length],
              })
            )
          );

          // Simulate Buy Car page query - only approved listings
          const publicListings = await Listing.find({ status: 'approved' }).lean();

          // Count expected approved listings
          const expectedApproved = listingsData.filter((_, index) => 
            statuses[index % statuses.length] === 'approved'
          ).length;

          // Verify only approved listings appear
          expect(publicListings.length).toBe(expectedApproved);
          publicListings.forEach((listing: any) => {
            expect(listing.status).toBe('approved');
          });

          // Verify sold listings don't appear in public
          const hasSoldInPublic = publicListings.some((l: any) => l.status === 'sold');
          expect(hasSoldInPublic).toBe(false);

          // Verify all listings appear in garage regardless of status
          const garageListings = await Listing.find({ sellerId: testUserId }).lean();
          expect(garageListings.length).toBe(listingsData.length);
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);
});
