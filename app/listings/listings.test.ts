import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Listing from '@/lib/models/Listing';
import Interest from '@/lib/models/Interest';
import User from '@/lib/models/User';
import { expressInterest } from '@/app/actions/listings';

let mongoServer: MongoMemoryServer;

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock mongodb connection
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(async () => mongoose),
}));

import { getServerSession } from 'next-auth';

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
  await Listing.deleteMany({});
  await Interest.deleteMany({});
  await User.deleteMany({});
  vi.clearAllMocks();
});

// Generators
const listingArbitrary = fc.record({
  brand: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  carModel: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  variant: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  fuelType: fc.constantFrom('petrol' as const, 'diesel' as const, 'cng' as const, 'electric' as const),
  transmission: fc.constantFrom('manual' as const, 'automatic' as const),
  yearOfOwnership: fc.integer({ min: 2000, max: 2024 }),
  numberOfOwners: fc.integer({ min: 1, max: 5 }),
  kmDriven: fc.integer({ min: 0, max: 500000 }),
  city: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
  state: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
  description: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
  price: fc.integer({ min: 100000, max: 10000000 }),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 10 }),
});

describe('Listing Detail Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 8: Car card navigation
   * Validates: Requirements 3.1, 5.5
   * 
   * For any car listing displayed as a card, clicking the card should navigate 
   * to a detail page with the URL containing that listing's unique identifier.
   */
  it('Property 8: Car card navigation - listing ID is preserved in navigation', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingArbitrary,
        async (listingData) => {
          const uniqueId = Date.now() + Math.random();
          const user = await User.create({
            googleId: 'test-google-id-' + uniqueId,
            email: `test-${uniqueId}@example.com`,
            fullName: 'Test User',
            mobileNumber: '9876543210',
            documentType: 'aadhaar',
            documentNumber: '123456789012',
            verified: true,
            banned: false,
          });

          const listing = await Listing.create({
            ...listingData,
            sellerId: user._id,
            status: 'approved',
            interestCount: 0,
            source: 'user',
          });

          // Simulate navigation by verifying the listing can be fetched by its ID
          const fetchedListing = await Listing.findById(listing._id);
          
          expect(fetchedListing).not.toBeNull();
          expect(fetchedListing!._id.toString()).toBe(listing._id.toString());

          // Clean up
          await Listing.findByIdAndDelete(listing._id);
          await User.findByIdAndDelete(user._id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 9: Car detail completeness
   * Validates: Requirements 3.3, 11.4
   * 
   * For any car listing, the detail page should display all metadata fields:
   * brand, model, variant, fuelType, transmission, yearOfOwnership, numberOfOwners,
   * kmDriven, city, state, description, price, and images.
   */
  it('Property 9: Car detail completeness - all fields are present', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingArbitrary,
        async (listingData) => {
          const uniqueId = Date.now() + Math.random();
          const user = await User.create({
            googleId: 'test-google-id-' + uniqueId,
            email: `test-${uniqueId}@example.com`,
            fullName: 'Test User',
            mobileNumber: '9876543210',
            documentType: 'aadhaar',
            documentNumber: '123456789012',
            verified: true,
            banned: false,
          });

          const listing = await Listing.create({
            ...listingData,
            sellerId: user._id,
            status: 'approved',
            interestCount: 0,
            source: 'user',
          });

          const fetchedListing = await Listing.findById(listing._id);

          // Verify all required fields are present
          expect(fetchedListing).not.toBeNull();
          expect(fetchedListing!.brand).toBe(listingData.brand);
          expect(fetchedListing!.carModel).toBe(listingData.carModel);
          expect(fetchedListing!.variant).toBe(listingData.variant);
          expect(fetchedListing!.fuelType).toBe(listingData.fuelType);
          expect(fetchedListing!.transmission).toBe(listingData.transmission);
          expect(fetchedListing!.yearOfOwnership).toBe(listingData.yearOfOwnership);
          expect(fetchedListing!.numberOfOwners).toBe(listingData.numberOfOwners);
          expect(fetchedListing!.kmDriven).toBe(listingData.kmDriven);
          expect(fetchedListing!.city).toBe(listingData.city);
          expect(fetchedListing!.state).toBe(listingData.state);
          expect(fetchedListing!.description).toBe(listingData.description);
          expect(fetchedListing!.price).toBe(listingData.price);
          expect(fetchedListing!.images).toEqual(listingData.images);

          // Clean up
          await Listing.findByIdAndDelete(listing._id);
          await User.findByIdAndDelete(user._id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 11: Image carousel completeness
   * Validates: Requirements 3.2
   * 
   * For any listing with N images, the image carousel should display all N images
   * and allow navigation between them.
   */
  it('Property 11: Image carousel completeness - all images are accessible', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingArbitrary,
        async (listingData) => {
          const uniqueId = Date.now() + Math.random();
          const user = await User.create({
            googleId: 'test-google-id-' + uniqueId,
            email: `test-${uniqueId}@example.com`,
            fullName: 'Test User',
            mobileNumber: '9876543210',
            documentType: 'aadhaar',
            documentNumber: '123456789012',
            verified: true,
            banned: false,
          });

          const listing = await Listing.create({
            ...listingData,
            sellerId: user._id,
            status: 'approved',
            interestCount: 0,
            source: 'user',
          });

          const fetchedListing = await Listing.findById(listing._id);

          // Verify all images are present
          expect(fetchedListing).not.toBeNull();
          expect(fetchedListing!.images.length).toBe(listingData.images.length);
          
          // Verify each image URL is preserved
          listingData.images.forEach((imageUrl, index) => {
            expect(fetchedListing!.images[index]).toBe(imageUrl);
          });

          // Clean up
          await Listing.findByIdAndDelete(listing._id);
          await User.findByIdAndDelete(user._id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 12: Interest count increment
   * Validates: Requirements 3.6
   * 
   * For any listing, when a user clicks "I'm Interested", the interest count
   * should increase by exactly 1 and the updated count should be persisted in MongoDB.
   */
  it('Property 12: Interest count increment - count increases by 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingArbitrary,
        fc.integer({ min: 0, max: 100 }),
        async (listingData, initialCount) => {
          const uniqueId = Date.now() + Math.random();
          const user = await User.create({
            googleId: 'test-google-id-' + uniqueId,
            email: `test-${uniqueId}@example.com`,
            fullName: 'Test User',
            mobileNumber: '9876543210',
            documentType: 'aadhaar',
            documentNumber: '123456789012',
            verified: true,
            banned: false,
          });

          const listing = await Listing.create({
            ...listingData,
            sellerId: user._id,
            status: 'approved',
            interestCount: initialCount,
            source: 'user',
          });

          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: user._id.toString(),
              email: user.email,
              profileComplete: true,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          // Express interest
          const result = await expressInterest(listing._id.toString());

          expect(result.success).toBe(true);

          // Verify interest count increased by exactly 1
          const updatedListing = await Listing.findById(listing._id);
          expect(updatedListing).not.toBeNull();
          expect(updatedListing!.interestCount).toBe(initialCount + 1);

          // Verify interest record was created
          const interestRecord = await Interest.findOne({
            listingId: listing._id,
            userId: user._id,
          });
          expect(interestRecord).not.toBeNull();

          // Clean up
          await Listing.findByIdAndDelete(listing._id);
          await Interest.deleteMany({ listingId: listing._id });
          await User.findByIdAndDelete(user._id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
