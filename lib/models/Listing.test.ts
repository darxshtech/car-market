import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Listing, { IListing } from './Listing';
import User from './User';

let mongoServer: MongoMemoryServer;
let testUserId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create a test user for sellerId references
  const testUser = new User({
    googleId: 'test-google-id-123',
    email: 'test@example.com',
    fullName: 'Test User',
    mobileNumber: '9876543210',
    documentType: 'aadhaar',
    documentNumber: 'TEST123456',
    verified: true,
    banned: false,
  });
  const savedUser = await testUser.save();
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
});

// Generator for valid listing data
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

describe('Listing Schema Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 18: Listing update round-trip
   * Validates: Requirements 6.4
   */
  it('Property 18: Listing update round-trip - updating and retrieving listing data preserves all changes', async () => {
    await fc.assert(
      fc.asyncProperty(listingDataArbitrary, listingDataArbitrary, async (initialData, updateData) => {
        // Create and save initial listing
        const listing = new Listing({
          ...initialData,
          sellerId: testUserId,
        });
        const savedListing = await listing.save();

        // Update the listing with new data
        const updatedListing = await Listing.findByIdAndUpdate(
          savedListing._id,
          {
            carModel: updateData.carModel,
            price: updateData.price,
            description: updateData.description,
            images: updateData.images,
          },
          { new: true }
        );

        // Retrieve listing from database
        const retrievedListing = await Listing.findById(savedListing._id);

        // Verify all updated fields are preserved
        expect(retrievedListing).not.toBeNull();
        expect(retrievedListing!.carModel).toBe(updateData.carModel);
        expect(retrievedListing!.price).toBe(updateData.price);
        expect(retrievedListing!.description).toBe(updateData.description);
        expect(retrievedListing!.images).toEqual(updateData.images);

        // Verify unchanged fields remain the same
        expect(retrievedListing!.sellerId.toString()).toBe(testUserId.toString());
        expect(retrievedListing!.brand).toBe(initialData.brand);
        expect(retrievedListing!.variant).toBe(initialData.variant);
        expect(retrievedListing!.fuelType).toBe(initialData.fuelType);
        expect(retrievedListing!.transmission).toBe(initialData.transmission);
        expect(retrievedListing!.yearOfOwnership).toBe(initialData.yearOfOwnership);
        expect(retrievedListing!.numberOfOwners).toBe(initialData.numberOfOwners);
        expect(retrievedListing!.kmDriven).toBe(initialData.kmDriven);
        expect(retrievedListing!.city).toBe(initialData.city);
        expect(retrievedListing!.state).toBe(initialData.state);

        // Clean up
        await Listing.findByIdAndDelete(savedListing._id);
      }),
      { numRuns: 100 }
    );
  }, 30000); // 30 second timeout
});
