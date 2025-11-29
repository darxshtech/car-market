import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { extractCarData, ScrapedCarData } from './scraper';

// Mock fetch globally
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Web Scraper Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 25: Scraped data extraction completeness
   * Validates: Requirements 8.2
   * 
   * For any valid external car listing URL, the scraper should extract and return data
   * containing all required fields: images, carName, model, price, ownerName, yearOfPurchase,
   * kmDriven, numberOfOwners, and city.
   */
  it('Property 25: Scraped data extraction completeness - all required fields are present', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // carName
        fc.string({ minLength: 3, maxLength: 15 }), // model
        fc.integer({ min: 100000, max: 10000000 }), // price
        fc.string({ minLength: 5, maxLength: 30 }), // ownerName
        fc.integer({ min: 2000, max: 2024 }), // year
        fc.integer({ min: 0, max: 500000 }), // kmDriven
        fc.integer({ min: 1, max: 5 }), // numberOfOwners
        fc.string({ minLength: 3, maxLength: 20 }), // city
        async (carName, model, price, ownerName, year, kmDriven, numberOfOwners, city) => {
          // Create mock HTML with all required data
          const mockHtml = `
            <html>
              <body>
                <h1 class="car-title">${carName}</h1>
                <div class="car-model">${model}</div>
                <div class="price">₹${price.toLocaleString('en-IN')}</div>
                <div class="owner-name">${ownerName}</div>
                <div class="year">${year}</div>
                <div class="km-driven">${kmDriven} km</div>
                <div class="owners">${numberOfOwners} owner(s)</div>
                <div class="city">${city}</div>
                <img src="/car1.jpg" alt="car" />
                <img src="/car2.jpg" alt="car" />
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractCarData('https://example.com/car-listing');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify all required fields are present
            expect(result.data.carName).toBeDefined();
            expect(result.data.model).toBeDefined();
            expect(result.data.price).toBeGreaterThan(0);
            expect(result.data.ownerName).toBeDefined();
            expect(result.data.yearOfPurchase).toBeGreaterThanOrEqual(1990);
            expect(result.data.kmDriven).toBeGreaterThanOrEqual(0);
            expect(result.data.numberOfOwners).toBeGreaterThanOrEqual(1);
            expect(result.data.city).toBeDefined();
            expect(Array.isArray(result.data.images)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: drivesphere-marketplace, Property 26: Scraper error handling
   * Validates: Requirements 8.4
   * 
   * For any invalid URL or scraping failure, the system should return an error response
   * with details about the failure without creating any database records.
   */
  it('Property 26: Scraper error handling - invalid URLs are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('not-a-url'),
          fc.constant('ftp://invalid-protocol.com'),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes('http'))
        ),
        async (invalidUrl) => {
          const result = await extractCarData(invalidUrl);

          // Verify error handling
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26: Scraper error handling - HTTP errors are handled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }), // HTTP error codes
        async (statusCode) => {
          // Mock fetch response with error
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: false,
            status: statusCode,
            statusText: 'Error',
            text: async () => '',
          } as Response);

          const result = await extractCarData('https://example.com/car-listing');

          // Verify error handling
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Failed to fetch URL');
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 26: Scraper error handling - missing required data causes failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async () => {
          // Create mock HTML with missing required fields
          const mockHtml = `
            <html>
              <body>
                <div>No car data here</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractCarData('https://example.com/car-listing');

          // Verify error handling for missing data
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 10 }
    );
  });
});
