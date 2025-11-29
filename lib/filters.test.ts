import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { filterListings, FilterCriteria } from './filters';
import Listing, { IListing } from './models/Listing';
import User from './models/User';

let mongoServer: MongoMemoryServer;

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
  await User.deleteMany({});
});

// Generators
const brandArbitrary = fc.constantFrom('Toyota', 'Honda', 'Maruti', 'Hyundai', 'Tata');
const cityArbitrary = fc.constantFrom('Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune');
const fuelTypeArbitrary = fc.constantFrom('petrol' as const, 'diesel' as const, 'cng' as const, 'electric' as const);
const transmissionArbitrary = fc.constantFrom('manual' as const, 'automatic' as const);

const listingArbitrary = fc.record({
  brand: brandArbitrary,
  carModel: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  variant: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  fuelType: fuelTypeArbitrary,
  transmission: transmissionArbitrary,
  yearOfOwnership: fc.integer({ min: 2000, max: 2024 }),
  numberOfOwners: fc.integer({ min: 1, max: 5 }),
  kmDriven: fc.integer({ min: 0, max: 500000 }),
  city: cityArbitrary,
  state: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
  description: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
  price: fc.integer({ min: 100000, max: 10000000 }),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
  status: fc.constant('approved' as const),
  source: fc.constantFrom('user' as const, 'scraped' as const),
});

describe('Filter Matching Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 7: Filter matching accuracy
   * Validates: Requirements 2.4, 5.3
   * 
   * For any combination of filter criteria (brand, price range, city, year, fuel type, transmission),
   * all displayed listings should match every selected filter criterion.
   */
  it('Property 7: Filter matching accuracy - all results match all filter criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingArbitrary, { minLength: 10, maxLength: 30 }),
        fc.record({
          brands: fc.option(fc.array(brandArbitrary, { minLength: 1, maxLength: 3 }), { nil: undefined }),
          priceMin: fc.option(fc.integer({ min: 100000, max: 5000000 }), { nil: undefined }),
          priceMax: fc.option(fc.integer({ min: 5000000, max: 10000000 }), { nil: undefined }),
          cities: fc.option(fc.array(cityArbitrary, { minLength: 1, maxLength: 3 }), { nil: undefined }),
          yearMin: fc.option(fc.integer({ min: 2000, max: 2015 }), { nil: undefined }),
          yearMax: fc.option(fc.integer({ min: 2015, max: 2024 }), { nil: undefined }),
          fuelTypes: fc.option(fc.array(fuelTypeArbitrary, { minLength: 1, maxLength: 2 }), { nil: undefined }),
          transmissions: fc.option(fc.array(transmissionArbitrary, { minLength: 1, maxLength: 2 }), { nil: undefined }),
        }),
        async (listingsData, filterCriteria) => {
          // Create a test user
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

          // Create listings
          const createdListings = await Promise.all(
            listingsData.map((data) =>
              Listing.create({
                ...data,
                sellerId: user._id,
                interestCount: 0,
              })
            )
          );

          // Fetch all listings from database
          const allListings = await Listing.find({});

          // Apply filters using our filter function
          const filteredListings = filterListings(allListings, filterCriteria);

          // Verify each filtered listing matches ALL criteria
          filteredListings.forEach((listing) => {
            // Brand filter
            if (filterCriteria.brands && filterCriteria.brands.length > 0) {
              expect(filterCriteria.brands).toContain(listing.brand);
            }

            // Price range filter
            if (filterCriteria.priceMin !== undefined) {
              expect(listing.price).toBeGreaterThanOrEqual(filterCriteria.priceMin);
            }
            if (filterCriteria.priceMax !== undefined) {
              expect(listing.price).toBeLessThanOrEqual(filterCriteria.priceMax);
            }

            // City filter
            if (filterCriteria.cities && filterCriteria.cities.length > 0) {
              expect(filterCriteria.cities).toContain(listing.city);
            }

            // Year range filter
            if (filterCriteria.yearMin !== undefined) {
              expect(listing.yearOfOwnership).toBeGreaterThanOrEqual(filterCriteria.yearMin);
            }
            if (filterCriteria.yearMax !== undefined) {
              expect(listing.yearOfOwnership).toBeLessThanOrEqual(filterCriteria.yearMax);
            }

            // Fuel type filter
            if (filterCriteria.fuelTypes && filterCriteria.fuelTypes.length > 0) {
              expect(filterCriteria.fuelTypes).toContain(listing.fuelType);
            }

            // Transmission filter
            if (filterCriteria.transmissions && filterCriteria.transmissions.length > 0) {
              expect(filterCriteria.transmissions).toContain(listing.transmission);
            }
          });

          // Verify that listings NOT in the filtered results don't match at least one criterion
          const filteredIds = new Set(filteredListings.map(l => l._id.toString()));
          const excludedListings = allListings.filter(l => !filteredIds.has(l._id.toString()));

          excludedListings.forEach((listing) => {
            let shouldBeExcluded = false;

            // Check if it fails at least one filter criterion
            if (filterCriteria.brands && filterCriteria.brands.length > 0) {
              if (!filterCriteria.brands.includes(listing.brand)) {
                shouldBeExcluded = true;
              }
            }

            if (filterCriteria.priceMin !== undefined && listing.price < filterCriteria.priceMin) {
              shouldBeExcluded = true;
            }

            if (filterCriteria.priceMax !== undefined && listing.price > filterCriteria.priceMax) {
              shouldBeExcluded = true;
            }

            if (filterCriteria.cities && filterCriteria.cities.length > 0) {
              if (!filterCriteria.cities.includes(listing.city)) {
                shouldBeExcluded = true;
              }
            }

            if (filterCriteria.yearMin !== undefined && listing.yearOfOwnership < filterCriteria.yearMin) {
              shouldBeExcluded = true;
            }

            if (filterCriteria.yearMax !== undefined && listing.yearOfOwnership > filterCriteria.yearMax) {
              shouldBeExcluded = true;
            }

            if (filterCriteria.fuelTypes && filterCriteria.fuelTypes.length > 0) {
              if (!filterCriteria.fuelTypes.includes(listing.fuelType)) {
                shouldBeExcluded = true;
              }
            }

            if (filterCriteria.transmissions && filterCriteria.transmissions.length > 0) {
              if (!filterCriteria.transmissions.includes(listing.transmission)) {
                shouldBeExcluded = true;
              }
            }

            // If no filters are applied, nothing should be excluded
            const hasFilters = 
              (filterCriteria.brands && filterCriteria.brands.length > 0) ||
              filterCriteria.priceMin !== undefined ||
              filterCriteria.priceMax !== undefined ||
              (filterCriteria.cities && filterCriteria.cities.length > 0) ||
              filterCriteria.yearMin !== undefined ||
              filterCriteria.yearMax !== undefined ||
              (filterCriteria.fuelTypes && filterCriteria.fuelTypes.length > 0) ||
              (filterCriteria.transmissions && filterCriteria.transmissions.length > 0);

            if (hasFilters) {
              expect(shouldBeExcluded).toBe(true);
            }
          });

          // Clean up
          await Listing.deleteMany({ _id: { $in: createdListings.map((l) => l._id) } });
          await User.findByIdAndDelete(user._id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
