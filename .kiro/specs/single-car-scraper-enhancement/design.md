# Design Document

## Overview

This design document outlines the enhancement to the DriveSphere web scraper to support scraping individual car detail pages. The current scraper implementation in `lib/scraper.ts` extracts data from listing pages containing multiple cars using the `extractMultipleCarData()` function. This enhancement adds a new `extractSingleCarData()` function that processes detail pages with comprehensive information about a single vehicle.

The enhancement maintains the existing architecture and interfaces while adding specialized extraction logic for detail pages. The scraper will automatically detect the page type (listing vs. detail) and apply the appropriate extraction strategy. This design ensures backward compatibility with the existing scraper UI and import workflow while significantly expanding the scraper's capabilities.

## Architecture

### Enhanced Scraper Architecture

The scraper module will be extended with the following components:

**Page Type Detection:**
- URL pattern analysis to identify detail pages vs. listing pages
- Content structure analysis as a fallback detection method
- Returns page type enum: `LISTING_PAGE | DETAIL_PAGE | UNKNOWN`

**Detail Page Extraction Pipeline:**
1. Fetch HTML content with appropriate headers and timeout
2. Parse HTML using Cheerio
3. Detect website type (CarDekho, CarWale, Cars24, OLX, Generic)
4. Apply website-specific extraction patterns
5. Validate extracted data completeness
6. Return structured car data or error

**Website-Specific Extractors:**
- `extractCarDekhoDetail()` - CarDekho detail page patterns
- `extractCarWaleDetail()` - CarWale detail page patterns
- `extractCars24Detail()` - Cars24 detail page patterns
- `extractOLXDetail()` - OLX detail page patterns
- `extractGenericDetail()` - Fallback generic patterns

**Data Validation Layer:**
- Validates required fields are present
- Validates data types and ranges
- Provides detailed error messages for missing data

### Integration Points

**Existing Integration:**
- Admin scraper page (`app/admin/scraper/page.tsx`) - no changes required
- Admin actions (`app/actions/admin.ts`) - `scrapeListing()` function will route to appropriate extractor
- Import workflow - uses existing `importScrapedListings()` function

**New Functions:**
- `extractSingleCarData(url: string): Promise<ScrapeResult>`
- `detectPageType(url: string, html: string): PageType`
- Website-specific detail extractors

## Components and Interfaces

### Core Interfaces

```typescript
// Existing interface - no changes
export interface ScrapedCarData {
  images: string[];
  carName: string;
  model: string;
  price: number;
  ownerName: string;
  yearOfPurchase: number;
  kmDriven: number;
  numberOfOwners: number;
  city: string;
}

// Existing interface - no changes
export interface ScrapeResult {
  success: boolean;
  data?: ScrapedCarData;
  error?: string;
}

// New interface for page type detection
export enum PageType {
  LISTING_PAGE = 'LISTING_PAGE',
  DETAIL_PAGE = 'DETAIL_PAGE',
  UNKNOWN = 'UNKNOWN'
}

// Extended interface for detail page extraction
export interface DetailPageExtractor {
  canHandle(url: string): boolean;
  extract($: cheerio.CheerioAPI, url: string): ScrapedCarData | null;
}
```

### Main Extraction Function

```typescript
/**
 * Extract car data from a single car detail page
 * This function handles detail pages with comprehensive information about one vehicle
 */
export async function extractSingleCarData(url: string): Promise<ScrapeResult> {
  try {
    // Validate URL
    if (!url || !isValidUrl(url)) {
      return { success: false, error: 'Invalid URL provided' };
    }

    // Fetch HTML with timeout and proper headers
    const html = await fetchWithTimeout(url, 15000);
    
    // Parse with Cheerio
    const $ = cheerio.load(html);
    
    // Detect website type and apply appropriate extractor
    const data = await extractDetailByWebsite($, url);
    
    // Validate extracted data
    if (!validateCarData(data)) {
      return { 
        success: false, 
        error: 'Failed to extract required car data from the page' 
      };
    }
    
    return { success: true, data };
  } catch (error) {
    return handleScraperError(error);
  }
}
```

### Page Type Detection

```typescript
/**
 * Detect whether a URL points to a listing page or detail page
 */
export function detectPageType(url: string, $: cheerio.CheerioAPI): PageType {
  // URL pattern analysis
  const urlPatterns = {
    detail: [
      /\/used-[^\/]+\/\d+/,  // CarDekho detail pattern
      /\/car\/[^\/]+\/\d+/,   // Generic detail pattern
      /\/buy-used-[^\/]+/,    // Cars24 detail pattern
    ],
    listing: [
      /\/used-cars\+in\+/,    // CarDekho listing pattern
      /\/used-cars\//,        // Generic listing pattern
      /\/buy-used-cars/,      // Generic listing pattern
    ]
  };
  
  // Check URL patterns
  for (const pattern of urlPatterns.detail) {
    if (pattern.test(url)) return PageType.DETAIL_PAGE;
  }
  
  for (const pattern of urlPatterns.listing) {
    if (pattern.test(url)) return PageType.LISTING_PAGE;
  }
  
  // Content structure analysis
  const hasMultipleCarCards = $('.car-card, .listing-card').length > 1;
  const hasDetailLayout = $('.car-detail, .vehicle-detail, .detail-page').length > 0;
  
  if (hasDetailLayout) return PageType.DETAIL_PAGE;
  if (hasMultipleCarCards) return PageType.LISTING_PAGE;
  
  return PageType.UNKNOWN;
}
```

### Website-Specific Extractors

```typescript
/**
 * Extract car data from CarDekho detail page
 */
function extractCarDekhoDetail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  try {
    // Extract car name from h1 or title
    const carName = $('h1.car-title, h1[itemprop="name"]').first().text().trim();
    
    // Extract price from price section
    const priceText = $('.price-section, [itemprop="price"]').first().text().trim();
    const price = parsePrice(priceText);
    
    // Extract specifications from table or list
    const specs = extractSpecTable($, '.specs-table, .specifications');
    
    // Extract images from gallery
    const images = extractDetailImages($, '.gallery, .image-carousel');
    
    // Extract description
    const description = $('.description, .car-description').first().text().trim();
    
    // Extract seller info
    const sellerInfo = extractSellerInfo($, '.seller-info, .owner-details');
    
    return {
      images,
      carName,
      model: specs.model || extractModelFromName(carName),
      price,
      ownerName: sellerInfo.name || 'CarDekho Seller',
      yearOfPurchase: specs.year || extractYearFromPage($),
      kmDriven: specs.kmDriven || 0,
      numberOfOwners: specs.numberOfOwners || 1,
      city: sellerInfo.city || specs.city || 'Unknown',
    };
  } catch (error) {
    console.error('Error extracting CarDekho detail:', error);
    return null;
  }
}

/**
 * Extract car data from CarWale detail page
 */
function extractCarWaleDetail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  // Similar structure to CarDekho but with CarWale-specific selectors
  // Implementation details...
}

/**
 * Extract car data from Cars24 detail page
 */
function extractCars24Detail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  // Cars24-specific extraction logic
  // Implementation details...
}

/**
 * Extract car data from OLX detail page
 */
function extractOLXDetail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  // OLX-specific extraction logic
  // Implementation details...
}

/**
 * Generic detail page extractor for unsupported websites
 */
function extractGenericDetail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  // Generic extraction patterns
  // Implementation details...
}
```

### Helper Functions

```typescript
/**
 * Extract images from detail page gallery
 * Prioritizes high-resolution images and filters out UI elements
 */
function extractDetailImages($: cheerio.CheerioAPI, gallerySelector: string): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();
  
  // Try gallery-specific selectors first
  $(gallerySelector).find('img').each((_, img) => {
    const src = extractImageUrl($(img));
    if (src && !seenUrls.has(src) && !isLogoOrIcon(src, $(img).attr('alt') || '', $(img).attr('class') || '')) {
      seenUrls.add(src);
      images.push(src);
    }
  });
  
  // Fallback to all images if gallery not found
  if (images.length === 0) {
    $('img').each((_, img) => {
      const src = extractImageUrl($(img));
      if (src && !seenUrls.has(src) && !isLogoOrIcon(src, $(img).attr('alt') || '', $(img).attr('class') || '')) {
        seenUrls.add(src);
        images.push(src);
      }
    });
  }
  
  return images.slice(0, 15); // Limit to 15 images
}

/**
 * Extract specifications from structured table or list
 */
function extractSpecTable($: cheerio.CheerioAPI, tableSelector: string): Partial<ScrapedCarData> {
  const specs: any = {};
  
  // Try table format
  $(`${tableSelector} tr, ${tableSelector} .spec-row`).each((_, row) => {
    const label = $(row).find('td:first-child, .label').text().trim().toLowerCase();
    const value = $(row).find('td:last-child, .value').text().trim();
    
    if (label.includes('year')) {
      specs.year = parseInt(value);
    } else if (label.includes('km') || label.includes('mileage')) {
      specs.kmDriven = parseInt(value.replace(/,/g, ''));
    } else if (label.includes('owner')) {
      const match = value.match(/(\d+)/);
      specs.numberOfOwners = match ? parseInt(match[1]) : 1;
    } else if (label.includes('city') || label.includes('location')) {
      specs.city = value;
    }
  });
  
  return specs;
}

/**
 * Extract seller information from detail page
 */
function extractSellerInfo($: cheerio.CheerioAPI, sellerSelector: string): { name: string; city: string } {
  const name = $(`${sellerSelector} .seller-name, ${sellerSelector} .owner-name`).first().text().trim();
  const city = $(`${sellerSelector} .seller-location, ${sellerSelector} .location`).first().text().trim();
  
  return { name, city };
}

/**
 * Validate that extracted car data contains required fields
 */
function validateCarData(data: ScrapedCarData | null): boolean {
  if (!data) return false;
  
  return !!(
    data.carName &&
    data.model &&
    data.price > 0 &&
    data.images.length > 0
  );
}
```

## Data Models

The scraper uses the existing `ScrapedCarData` interface, which maps directly to the MongoDB `Listing` model:

```typescript
// Scraper output
interface ScrapedCarData {
  images: string[];        // → Listing.images (uploaded to Cloudinary)
  carName: string;         // → Listing.brand + model
  model: string;           // → Listing.model
  price: number;           // → Listing.price
  ownerName: string;       // → Listing.ownerName
  yearOfPurchase: number;  // → Listing.yearOfOwnership
  kmDriven: number;        // → Listing.kmDriven
  numberOfOwners: number;  // → Listing.numberOfOwners
  city: string;            // → Listing.city
}

// MongoDB Listing model (existing)
interface Listing {
  brand: string;
  model: string;
  variant: string;
  fuelType: string;
  transmission: string;
  yearOfOwnership: number;
  numberOfOwners: number;
  kmDriven: number;
  city: string;
  state: string;
  description: string;
  price: number;
  images: string[];
  ownerName: string;
  status: 'pending' | 'approved' | 'rejected' | 'sold';
  createdAt: Date;
  updatedAt: Date;
}
```

**Mapping Strategy:**
- `carName` is split into `brand` and `model` using the first word as brand
- Missing fields (`variant`, `fuelType`, `transmission`, `state`, `description`) are set to default values
- `status` is set to 'approved' for scraped listings
- Images are uploaded to Cloudinary before saving to MongoDB

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, the following redundancies were identified and consolidated:

- **Page type detection (1.1, 10.1, 10.2, 10.3)**: Combined into a single property about detecting page type and routing to correct extractor
- **Field extraction (1.4, 2.1-2.6, 3.1-3.2, 7.1)**: Combined into a single property about extracting all available fields from detail pages
- **Website routing (4.1-4.5)**: Combined into one property about correct website detection
- **Error handling (5.1-5.4)**: Combined into one comprehensive error handling property
- **Image extraction (1.2, 1.3, 8.1-8.5)**: Consolidated into two properties - one for extraction completeness, one for filtering/quality

### Correctness Properties

Property 1: Page type detection and routing
*For any* valid URL, the system should correctly detect whether it is a detail page or listing page, and route to the appropriate extraction function (single-car or multi-car extractor).
**Validates: Requirements 1.1, 10.1, 10.2, 10.3**

Property 2: Detail page field extraction completeness
*For any* detail page HTML containing car information, the scraper should extract all available fields including car name, model, price, year, kilometers driven, number of owners, city, seller name, and seller location when present in the HTML.
**Validates: Requirements 1.4, 2.1, 2.2, 2.3, 2.6, 3.1, 3.2**

Property 3: Price format parsing
*For any* price string in various formats (lakhs, crores, numeric with commas, currency symbols), the price parser should return a valid positive numeric value representing the price in rupees.
**Validates: Requirements 1.5**

Property 4: Image extraction completeness
*For any* detail page HTML with car images, the scraper should extract at least one image and return a non-empty array of image URLs.
**Validates: Requirements 1.2**

Property 5: Image filtering and quality
*For any* extracted image set, the results should not contain logos, icons, or navigation images, should prioritize high-resolution versions, should convert relative URLs to absolute URLs, and should be limited to a maximum of 15 images while maintaining original order.
**Validates: Requirements 1.3, 8.1, 8.2, 8.3, 8.4, 8.5**

Property 6: Website-specific extractor routing
*For any* URL from a supported website (CarDekho, CarWale, Cars24, OLX), the system should detect the website and apply the corresponding website-specific extraction patterns.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

Property 7: Error handling for invalid inputs
*For any* invalid URL, network timeout, HTTP error response, or incomplete extraction, the system should return an error result with success=false and a descriptive error message, without creating any database records.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

Property 8: Default values for missing seller information
*For any* detail page where seller information is not available, the system should use default values indicating the source website (e.g., "CarDekho Seller").
**Validates: Requirements 3.4**

Property 9: Description extraction and cleaning
*For any* detail page with description text, the scraper should extract the description, remove HTML tags, preserve paragraph breaks, combine multiple sections, and use an empty string when no description is available.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

Property 10: Import workflow consistency
*For any* successfully scraped car data (from either detail page or listing page), the import process should create a listing in MongoDB with approved status using the same workflow.
**Validates: Requirements 6.5, 10.5**

Property 11: Lazy-loaded image extraction
*For any* image element with lazy-loading attributes (data-src, data-lazy-src, data-original), the scraper should extract the actual image URL from these data attributes rather than the placeholder src.
**Validates: Requirements 8.2**

Property 12: Fuel type and transmission extraction
*For any* detail page containing fuel type or transmission information in structured format, the scraper should extract these values correctly.
**Validates: Requirements 2.4, 2.5**

## Error Handling

### Error Categories

**Input Validation Errors:**
- Invalid URL format
- Empty or null URL
- Non-HTTP/HTTPS protocols

**Network Errors:**
- Connection timeout (15 second limit)
- DNS resolution failures
- Network unreachable

**HTTP Errors:**
- 4xx client errors (400, 403, 404, etc.)
- 5xx server errors (500, 503, etc.)
- Anti-bot protection (403 with specific patterns)

**Parsing Errors:**
- Malformed HTML
- HTML size exceeds 10MB limit
- Cheerio parsing failures

**Extraction Errors:**
- Required fields missing (carName, price, images)
- Invalid data types or ranges
- No car data found on page

### Error Response Format

All errors return a consistent `ScrapeResult` structure:

```typescript
{
  success: false,
  error: string, // Human-readable error message
  data: undefined
}
```

### Error Messages

**Invalid URL:**
```
"Invalid URL provided"
```

**Network Timeout:**
```
"Request timed out after 15 seconds. The website may be slow or blocking requests."
```

**HTTP Error:**
```
"Failed to fetch URL: {status} {statusText}. The website may be blocking automated requests."
```

**Anti-bot Protection:**
```
"The website is blocking automated requests. Try using the demo URL or manual import."
```

**Missing Required Data:**
```
"Failed to extract required car data from the page. Missing fields: {fieldList}"
```

**Unsupported Website:**
```
"This website structure is not supported. Try a different URL or use the demo mode."
```

### Error Handling Strategy

1. **Fail Fast**: Validate inputs before making network requests
2. **Graceful Degradation**: Use default values for optional fields
3. **Clear Feedback**: Provide actionable error messages to admins
4. **No Partial State**: Never create database records on error
5. **Logging**: Log all errors with context for debugging

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

**URL Validation Tests:**
- Valid HTTP/HTTPS URLs pass validation
- Invalid protocols are rejected
- Empty strings are rejected
- Malformed URLs are rejected

**Price Parsing Tests:**
- "₹5.5 lakh" → 550000
- "₹1.2 crore" → 12000000
- "₹550000" → 550000
- "5,50,000" → 550000
- Invalid formats return 0

**Image Filtering Tests:**
- Logo URLs are filtered out
- Icon class names are filtered out
- SVG files are filtered out
- Valid car images pass through

**Website Detection Tests:**
- CarDekho URLs are detected correctly
- CarWale URLs are detected correctly
- Cars24 URLs are detected correctly
- OLX URLs are detected correctly
- Unknown URLs fall back to generic

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** library (already used in the project). Each property test will run a minimum of 100 iterations.

**Property Test Configuration:**
```typescript
import * as fc from 'fast-check';

// Configure to run 100+ iterations
await fc.assert(
  fc.asyncProperty(/* generators */, async (/* inputs */) => {
    // Test logic
  }),
  { numRuns: 100 }
);
```

**Property Tests to Implement:**

1. **Property 1: Page type detection and routing** - Generate random URLs with different patterns and verify correct detection
2. **Property 2: Field extraction completeness** - Generate random HTML with car data and verify all fields are extracted
3. **Property 3: Price format parsing** - Generate random price strings in various formats and verify numeric output
4. **Property 4: Image extraction completeness** - Generate random HTML with images and verify non-empty results
5. **Property 5: Image filtering and quality** - Generate HTML with mixed images and verify filtering
6. **Property 6: Website-specific routing** - Generate URLs from different websites and verify correct extractor is used
7. **Property 7: Error handling** - Generate invalid inputs and verify error responses
8. **Property 8: Default values** - Generate HTML without seller info and verify defaults
9. **Property 9: Description extraction** - Generate HTML with descriptions and verify cleaning
10. **Property 10: Import workflow** - Generate scraped data and verify consistent import
11. **Property 11: Lazy-loaded images** - Generate HTML with lazy-loading and verify extraction
12. **Property 12: Fuel and transmission** - Generate HTML with specs and verify extraction

**Test Tagging Convention:**
Each property-based test must include a comment tag referencing the design document:

```typescript
/**
 * Feature: single-car-scraper-enhancement, Property 1: Page type detection and routing
 * Validates: Requirements 1.1, 10.1, 10.2, 10.3
 */
it('Property 1: Page type detection and routing', async () => {
  // Test implementation
});
```

### Integration Testing

Integration tests will verify the complete scraping workflow:

- Scrape → Preview → Import → Database verification
- Error scenarios → UI feedback → No database changes
- Multiple website types → Consistent output format

### Test Data Strategy

**Mock HTML Generation:**
- Create realistic HTML structures for each supported website
- Include variations in selector patterns
- Include edge cases (missing fields, malformed data)

**Demo Mode:**
- Existing demo mode provides known-good test data
- Use for smoke testing and UI verification

**Real Website Testing:**
- Manual testing against real websites
- Document selector patterns that work
- Update extractors when websites change

## Implementation Notes

### Backward Compatibility

The enhancement maintains full backward compatibility:

- Existing `extractMultipleCarData()` function unchanged
- Existing `ScrapedCarData` interface unchanged
- Existing admin UI unchanged
- Existing import workflow unchanged

### Performance Considerations

**Timeout Management:**
- 15 second timeout for network requests
- Prevents hanging on slow websites
- Provides clear timeout error messages

**HTML Size Limits:**
- Maximum 10MB HTML size
- Prevents memory issues with large pages
- Rejects oversized pages with clear error

**Image Limits:**
- Maximum 15 images per listing
- Prevents excessive storage usage
- Maintains reasonable page load times

### Extensibility

**Adding New Websites:**
1. Create new extractor function following the pattern
2. Add URL detection logic
3. Add unit tests for the new extractor
4. Document selector patterns

**Updating Existing Extractors:**
1. Update selector patterns in extractor function
2. Update unit tests
3. Test against real website
4. Document changes

### Security Considerations

**Input Validation:**
- Validate URL format before fetching
- Sanitize extracted text data
- Validate image URLs before storage

**Rate Limiting:**
- Consider adding rate limiting for scraping requests
- Prevent abuse of scraping functionality
- Protect against excessive resource usage

**Data Privacy:**
- Do not store sensitive seller information
- Mask phone numbers if extracted
- Comply with website terms of service

### Monitoring and Logging

**Success Metrics:**
- Track scraping success rate by website
- Monitor extraction completeness
- Track import success rate

**Error Metrics:**
- Track error types and frequencies
- Monitor timeout rates
- Track unsupported website attempts

**Logging Strategy:**
- Log all scraping attempts with URL
- Log extraction results (success/failure)
- Log error details for debugging
- Do not log sensitive data
