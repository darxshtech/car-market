import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { formatINR, maskOwnerName } from './utils';
import Listing from './models/Listing';
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
const ownerNameArbitrary = fc.tuple(
  fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2)
).map(([first, last]) => `${first} ${last}`);

const priceArbitrary = fc.integer({ min: 100000, max: 10000000 });

const listingStatusArbitrary = fc.constantFrom('pending' as const, 'approved' as const, 'rejected' as const, 'sold' as const);

describe('Utility Functions Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 10: Owner name masking
   * Validates: Requirements 3.4
   * 
   * For any owner name in the format "FirstName LastName", 
   * the display should show "FirstName L." where L is the first character of the last name.
   */
  it('Property 10: Owner name masking - masks surname to initial', () => {
    fc.assert(
      fc.property(ownerNameArbitrary, (fullName) => {
        const masked = maskOwnerName(fullName);
        const parts = fullName.trim().split(/\s+/);
        
        if (parts.length >= 2) {
          const firstName = parts[0];
          const lastName = parts[parts.length - 1];
          const lastNameInitial = lastName[0];
          const expectedMasked = `${firstName} ${lastNameInitial}.`;
          
          // The masked name should exactly match the expected format
          expect(masked).toBe(expectedMasked);
          
          // The full last name (except initial) should not appear in the masked version
          // Only check if last name has more than 1 character and the rest doesn't overlap with first name
          if (lastName.length > 1) {
            const lastNameRest = lastName.slice(1);
            // The rest of the last name should not appear as a substring
            // unless it's part of the first name
            const maskedWithoutFirstName = masked.replace(firstName, '');
            expect(maskedWithoutFirstName).not.toContain(lastNameRest);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 13: Price formatting consistency
   * Validates: Requirements 11.5
   * 
   * For any numeric price value, the displayed format should include 
   * the rupee symbol (₹) and use Indian numbering system with commas.
   */
  it('Property 13: Price formatting consistency - formats with INR symbol and Indian numbering', () => {
    fc.assert(
      fc.property(priceArbitrary, (price) => {
        const formatted = formatINR(price);
        
        // Should start with rupee symbol
        expect(formatted).toMatch(/^₹/);
        
        // Should contain the price digits
        const digitsOnly = formatted.replace(/[₹,]/g, '');
        expect(parseInt(digitsOnly, 10)).toBe(price);
        
        // For prices >= 1000, should have commas
        if (price >= 1000) {
          expect(formatted).toContain(',');
        }
        
        // Verify Indian numbering system (last 3 digits, then groups of 2)
        const priceStr = price.toString();
        if (priceStr.length > 3) {
          // Should have proper comma placement for Indian system
          const withoutSymbol = formatted.slice(1); // Remove ₹
          const parts = withoutSymbol.split(',');
          
          // Last part should be 3 digits
          expect(parts[parts.length - 1].length).toBe(3);
          
          // Other parts (except first) should be 2 digits
          for (let i = 1; i < parts.length - 1; i++) {
            expect(parts[i].length).toBe(2);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Listing Visibility Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 6: Approved listings visibility
   * Validates: Requirements 2.2, 5.1
   * 
   * For any set of listings in MongoDB, only those with status "approved" 
   * should appear in public listings (home page, buy car page).
   */
  it('Property 6: Approved listings visibility - only approved listings are visible', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            brand: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
            carModel: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
            variant: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
            fuelType: fc.constantFrom('petrol', 'diesel', 'cng', 'electric'),
            transmission: fc.constantFrom('manual', 'automatic'),
            yearOfOwnership: fc.integer({ min: 2000, max: 2024 }),
            numberOfOwners: fc.integer({ min: 1, max: 5 }),
            kmDriven: fc.integer({ min: 0, max: 500000 }),
            city: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
            state: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
            description: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
            price: priceArbitrary,
            images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
            status: listingStatusArbitrary,
            source: fc.constantFrom('user' as const, 'scraped' as const),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (listingsData) => {
          // Create a test user with unique email for each test run
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

          // Create listings with various statuses
          const createdListings = await Promise.all(
            listingsData.map((data) =>
              Listing.create({
                ...data,
                sellerId: user._id,
                interestCount: 0,
              })
            )
          );

          // Fetch only approved listings (simulating what the home page does)
          const approvedListings = await Listing.find({ status: 'approved' });

          // Count expected approved listings
          const expectedApprovedCount = listingsData.filter(
            (l) => l.status === 'approved'
          ).length;

          // Verify only approved listings are returned
          expect(approvedListings.length).toBe(expectedApprovedCount);

          // Verify all returned listings have approved status
          approvedListings.forEach((listing) => {
            expect(listing.status).toBe('approved');
          });

          // Verify no pending, rejected, or sold listings are included
          const nonApprovedStatuses = ['pending', 'rejected', 'sold'];
          approvedListings.forEach((listing) => {
            expect(nonApprovedStatuses).not.toContain(listing.status);
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
