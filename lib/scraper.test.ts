import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as cheerio from 'cheerio';
import { extractCarData, extractSingleCarData, detectPageType, PageType } from './scraper';

// Mock fetch globally
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Web Scraper Property Tests', () => {
  /**
   * Feature: single-car-scraper-enhancement, Property 1: Page type detection and routing
   * Validates: Requirements 1.1, 10.1, 10.2, 10.3
   * 
   * For any valid URL, the system should correctly detect whether it is a detail page
   * or listing page, and route to the appropriate extraction function.
   */
  it('Property 1: Page type detection and routing - detail page URLs are detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // CarDekho detail patterns
          fc.tuple(fc.string({ minLength: 5, maxLength: 20 }), fc.integer({ min: 1000, max: 999999 }))
            .map(([name, id]) => `https://www.cardekho.com/used-${name}/${id}`),
          // Generic detail patterns
          fc.tuple(fc.string({ minLength: 5, maxLength: 20 }), fc.integer({ min: 1000, max: 999999 }))
            .map(([name, id]) => `https://example.com/car/${name}/${id}`),
          // Cars24 detail patterns
          fc.tuple(fc.string({ minLength: 5, maxLength: 20 }), fc.integer({ min: 1000, max: 999999 }))
            .map(([name, id]) => `https://www.cars24.com/buy-used-${name}/${id}`),
          // OLX detail patterns
          fc.tuple(fc.string({ minLength: 5, maxLength: 20 }), fc.integer({ min: 1000, max: 999999 }))
            .map(([name, id]) => `https://www.olx.in/${name}-${id}.html`),
          // Generic listing detail patterns
          fc.integer({ min: 1000, max: 999999 })
            .map(id => `https://example.com/listing/${id}`),
          fc.integer({ min: 1000, max: 999999 })
            .map(id => `https://example.com/vehicle/${id}`)
        ),
        async (url) => {
          // Create mock HTML for a detail page (single car with gallery)
          const mockHtml = `
            <html>
              <body>
                <div class="car-detail">
                  <h1>Car Name</h1>
                  <div class="gallery">
                    <img src="/car1.jpg" alt="car" />
                    <img src="/car2.jpg" alt="car" />
                    <img src="/car3.jpg" alt="car" />
                  </div>
                  <div class="price">₹500000</div>
                </div>
              </body>
            </html>
          `;
          
          const $ = cheerio.load(mockHtml);
          const pageType = detectPageType(url, $);
          
          // Verify detail page is detected
          expect(pageType).toBe(PageType.DETAIL_PAGE);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Page type detection and routing - listing page URLs are detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // CarDekho listing patterns
          fc.string({ minLength: 3, maxLength: 15 })
            .map(city => `https://www.cardekho.com/used-cars+in+${city}`),
          // Generic listing patterns
          fc.constant('https://example.com/used-cars/'),
          fc.constant('https://example.com/buy-used-cars'),
          fc.constant('https://example.com/search'),
          fc.constant('https://example.com/listings'),
          fc.constant('https://example.com/cars-for-sale'),
          fc.constant('https://example.com/browse')
        ),
        async (url) => {
          // Create mock HTML for a listing page (multiple car cards)
          const mockHtml = `
            <html>
              <body>
                <div class="car-card">
                  <h3>Car 1</h3>
                  <div class="price">₹500000</div>
                </div>
                <div class="car-card">
                  <h3>Car 2</h3>
                  <div class="price">₹600000</div>
                </div>
                <div class="car-card">
                  <h3>Car 3</h3>
                  <div class="price">₹700000</div>
                </div>
              </body>
            </html>
          `;
          
          const $ = cheerio.load(mockHtml);
          const pageType = detectPageType(url, $);
          
          // Verify listing page is detected
          expect(pageType).toBe(PageType.LISTING_PAGE);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Page type detection and routing - content structure fallback works', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // Number of car cards
        async (numCards) => {
          // Create mock HTML with multiple car cards but ambiguous URL
          let carCards = '';
          for (let i = 0; i < numCards; i++) {
            carCards += `
              <div class="listing-card">
                <h3>Car ${i + 1}</h3>
                <div class="price">₹${500000 + i * 100000}</div>
              </div>
            `;
          }
          
          const mockHtml = `
            <html>
              <body>
                ${carCards}
              </body>
            </html>
          `;
          
          const $ = cheerio.load(mockHtml);
          const pageType = detectPageType('https://example.com/ambiguous-url', $);
          
          // Verify listing page is detected based on content structure
          expect(pageType).toBe(PageType.LISTING_PAGE);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Page type detection and routing - single car with gallery detected as detail page', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 15 }), // Number of gallery images
        async (numImages) => {
          // Create mock HTML with single car and image gallery
          let galleryImages = '';
          for (let i = 0; i < numImages; i++) {
            galleryImages += `<img src="/car${i + 1}.jpg" alt="car" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <div class="gallery">
                  ${galleryImages}
                </div>
                <h1>Car Name</h1>
                <div class="price">₹500000</div>
              </body>
            </html>
          `;
          
          const $ = cheerio.load(mockHtml);
          const pageType = detectPageType('https://example.com/ambiguous-url', $);
          
          // Verify detail page is detected based on gallery
          expect(pageType).toBe(PageType.DETAIL_PAGE);
        }
      ),
      { numRuns: 100 }
    );
  });

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

  /**
   * Feature: single-car-scraper-enhancement, Property 7: Error handling for invalid inputs
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   * 
   * For any invalid URL, network timeout, HTTP error response, or incomplete extraction,
   * the system should return an error result with success=false and a descriptive error message,
   * without creating any database records.
   */
  it('Property 7: Error handling for invalid inputs - invalid URLs are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('not-a-url'),
          fc.constant('ftp://invalid-protocol.com'),
          fc.constant('javascript:alert(1)'),
          fc.constant('file:///etc/passwd'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('http'))
        ),
        async (invalidUrl) => {
          const result = await extractSingleCarData(invalidUrl);

          // Verify error handling
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Invalid URL provided');
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Error handling for invalid inputs - HTTP errors are handled gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }).filter(code => code !== 403), // HTTP error codes except 403
        fc.string({ minLength: 5, maxLength: 20 }), // URL path
        async (statusCode, path) => {
          const url = `https://example.com/${path}`;
          
          // Mock fetch response with error
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: false,
            status: statusCode,
            statusText: 'Error',
            text: async () => '',
          } as Response);

          const result = await extractSingleCarData(url);

          // Verify error handling
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Failed to fetch URL');
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Error handling for invalid inputs - anti-bot protection is detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // URL path
        async (path) => {
          const url = `https://example.com/${path}`;
          
          // Mock fetch response with 403 (anti-bot protection)
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            text: async () => '',
          } as Response);

          const result = await extractSingleCarData(url);

          // Verify anti-bot error message
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('blocking automated requests');
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Error handling for invalid inputs - missing required fields are reported', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasCarName: fc.boolean(),
          hasPrice: fc.boolean(),
          hasImages: fc.boolean(),
        }).filter(config => !config.hasCarName || !config.hasPrice || !config.hasImages), // At least one field missing
        async (config) => {
          // Create mock HTML with some fields missing
          const mockHtml = `
            <html>
              <body>
                ${config.hasCarName ? '<h1>Test Car Name</h1>' : ''}
                ${config.hasPrice ? '<div class="price">₹500000</div>' : ''}
                ${config.hasImages ? '<img src="/car1.jpg" alt="car" />' : ''}
                <div class="year">2020</div>
                <div class="km-driven">30000 km</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify error handling for missing data
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          // Check for either "Missing fields" or "Failed to extract" error messages
          expect(result.error?.toLowerCase()).toMatch(/missing fields|failed to extract/);
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Error handling for invalid inputs - oversized HTML is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async () => {
          // Create oversized HTML (>10MB)
          const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
          const mockHtml = `<html><body>${largeContent}</body></html>`;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify error handling for oversized HTML
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('too large');
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 7: Error handling for invalid inputs - network timeout is handled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // URL path
        async (path) => {
          const url = `https://example.com/${path}`;
          
          // Mock fetch to throw AbortError (timeout)
          vi.mocked(global.fetch).mockRejectedValueOnce(
            Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
          );

          const result = await extractSingleCarData(url);

          // Verify timeout error handling
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('timed out');
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Error handling for invalid inputs - malformed HTML is handled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async () => {
          // Create malformed HTML that might cause parsing issues
          const mockHtml = '<html><body><div>Unclosed div<div>Nested unclosed</body>';

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify that either parsing fails gracefully or extraction fails due to missing data
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Feature: single-car-scraper-enhancement, Property 4: Image extraction completeness
   * Validates: Requirements 1.2
   * 
   * For any detail page HTML with car images, the scraper should extract at least one image
   * and return a non-empty array of image URLs.
   */
  it('Property 4: Image extraction completeness - detail pages with images return non-empty array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }), // Number of car images
        fc.string({ minLength: 5, maxLength: 30 }), // Car name
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, carName, price) => {
          // Generate random image URLs
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="https://example.com/car-image-${i}.jpg" alt="car photo ${i}" class="car-photo" />`;
          }
          
          // Create mock HTML with car images in a gallery
          const mockHtml = `
            <html>
              <body>
                <div class="car-detail">
                  <h1>${carName}</h1>
                  <div class="price">₹${price.toLocaleString('en-IN')}</div>
                  <div class="gallery">
                    ${imageElements}
                  </div>
                  <div class="year">2020</div>
                  <div class="km-driven">30000 km</div>
                </div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify images array is non-empty
            expect(Array.isArray(result.data.images)).toBe(true);
            expect(result.data.images.length).toBeGreaterThan(0);
            
            // Verify all extracted images are valid URLs
            result.data.images.forEach(imageUrl => {
              expect(imageUrl).toBeTruthy();
              expect(typeof imageUrl).toBe('string');
              expect(imageUrl.length).toBeGreaterThan(0);
            });
            
            // Verify we don't exceed the 15 image limit
            expect(result.data.images.length).toBeLessThanOrEqual(15);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Image extraction completeness - images in various gallery structures are extracted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('.gallery'),
          fc.constant('.image-carousel'),
          fc.constant('.car-gallery'),
          fc.constant('.photo-gallery'),
          fc.constant('.slider'),
          fc.constant('[data-gallery]'),
          fc.constant('.swiper-slide')
        ),
        fc.integer({ min: 1, max: 10 }), // Number of images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (galleryClass, numImages, price) => {
          const carName = 'Test Car Model';
          // Generate image elements
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="https://example.com/car${i}.jpg" alt="car" />`;
          }
          
          // Create mock HTML with different gallery structures
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="${galleryClass}">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify images were extracted
            expect(result.data.images.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Image extraction completeness - fallback to all images when no gallery found', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate image elements scattered in the page (no gallery)
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<div><img src="https://example.com/car${i}.jpg" alt="car photo" /></div>`;
          }
          
          // Create mock HTML without a gallery structure
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                ${imageElements}
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify images were extracted using fallback
            expect(result.data.images.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Image extraction completeness - no duplicate images in results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 10 }), // Number of unique images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate image elements with some duplicates
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            // Add each image twice to test deduplication
            imageElements += `<img src="https://example.com/car${i}.jpg" alt="car" />`;
            imageElements += `<img src="https://example.com/car${i}.jpg" alt="car duplicate" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify no duplicate images
            const uniqueImages = new Set(result.data.images);
            expect(uniqueImages.size).toBe(result.data.images.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: single-car-scraper-enhancement, Property 5: Image filtering and quality
   * Validates: Requirements 1.3, 8.1, 8.2, 8.3, 8.4, 8.5
   * 
   * For any extracted image set, the results should not contain logos, icons, or navigation images,
   * should prioritize high-resolution versions, should convert relative URLs to absolute URLs,
   * and should be limited to a maximum of 15 images while maintaining original order.
   */
  it('Property 5: Image filtering and quality - logos and icons are filtered out', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 10 }), // Number of car images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate car images mixed with logos and icons
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="https://example.com/car${i}.jpg" alt="car photo" />`;
          }
          // Add logos and icons that should be filtered
          imageElements += `<img src="https://example.com/logo.png" alt="company logo" />`;
          imageElements += `<img src="https://example.com/icon.svg" alt="icon" />`;
          imageElements += `<img src="https://example.com/nav-icon.png" class="icon" />`;
          imageElements += `<img src="https://example.com/brand-logo.jpg" class="logo" />`;
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify logos and icons are filtered out
            result.data.images.forEach(imageUrl => {
              expect(imageUrl.toLowerCase()).not.toContain('logo');
              expect(imageUrl.toLowerCase()).not.toContain('icon');
            });
            
            // Verify we only got the car images
            expect(result.data.images.length).toBe(numImages);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: Image filtering and quality - relative URLs are converted to absolute', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate images with relative URLs
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="/images/car${i}.jpg" alt="car" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify all URLs are absolute (start with http:// or https://)
            result.data.images.forEach(imageUrl => {
              expect(imageUrl).toMatch(/^https?:\/\//);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: Image filtering and quality - maximum 15 images limit is enforced', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 16, max: 30 }), // More than 15 images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate many images
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="https://example.com/car${i}.jpg" alt="car" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify maximum 15 images
            expect(result.data.images.length).toBeLessThanOrEqual(15);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: Image filtering and quality - original order is maintained', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 10 }), // Number of images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate images with numbered names to verify order
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="https://example.com/car-${String(i).padStart(3, '0')}.jpg" alt="car" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data && result.data.images.length > 1) {
            // Verify order is maintained by checking sequential numbering
            for (let i = 0; i < result.data.images.length - 1; i++) {
              const currentNum = result.data.images[i].match(/car-(\d+)/)?.[1];
              const nextNum = result.data.images[i + 1].match(/car-(\d+)/)?.[1];
              if (currentNum && nextNum) {
                expect(parseInt(currentNum)).toBeLessThan(parseInt(nextNum));
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: single-car-scraper-enhancement, Property 11: Lazy-loaded image extraction
   * Validates: Requirements 8.2
   * 
   * For any image element with lazy-loading attributes (data-src, data-lazy-src, data-original),
   * the scraper should extract the actual image URL from these data attributes rather than
   * the placeholder src.
   */
  it('Property 11: Lazy-loaded image extraction - data-src attribute is extracted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate images with data-src (lazy loading)
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="placeholder.jpg" data-src="https://example.com/car${i}.jpg" alt="car" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify data-src was extracted instead of placeholder
            result.data.images.forEach(imageUrl => {
              expect(imageUrl).not.toContain('placeholder');
              expect(imageUrl).toContain('car');
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Lazy-loaded image extraction - data-lazy-src attribute is extracted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate images with data-lazy-src
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="loading.gif" data-lazy-src="https://example.com/car${i}.jpg" alt="car" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify data-lazy-src was extracted instead of loading placeholder
            result.data.images.forEach(imageUrl => {
              expect(imageUrl).not.toContain('loading');
              expect(imageUrl).toContain('car');
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Lazy-loaded image extraction - data-original attribute is extracted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate images with data-original
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img src="thumb.jpg" data-original="https://example.com/car${i}.jpg" alt="car" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify data-original was extracted instead of thumbnail
            result.data.images.forEach(imageUrl => {
              expect(imageUrl).not.toContain('thumb');
              expect(imageUrl).toContain('car');
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Lazy-loaded image extraction - srcset attribute is parsed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of images
        fc.integer({ min: 100000, max: 10000000 }), // Price
        async (numImages, price) => {
          const carName = 'Test Car Model';
          // Generate images with srcset
          let imageElements = '';
          for (let i = 0; i < numImages; i++) {
            imageElements += `<img srcset="https://example.com/car${i}.jpg 1x, https://example.com/car${i}-2x.jpg 2x" alt="car" />`;
          }
          
          const mockHtml = `
            <html>
              <body>
                <h1>${carName}</h1>
                <div class="price">₹${price}</div>
                <div class="gallery">
                  ${imageElements}
                </div>
                <div class="year">2020</div>
              </body>
            </html>
          `;

          // Mock fetch response
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => mockHtml,
          } as Response);

          const result = await extractSingleCarData('https://example.com/car-detail');

          // Verify extraction was successful
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          if (result.data) {
            // Verify srcset was parsed and first URL extracted
            result.data.images.forEach(imageUrl => {
              expect(imageUrl).toContain('car');
              expect(imageUrl).toContain('.jpg');
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
