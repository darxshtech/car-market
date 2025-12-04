# Implementation Plan

- [x] 1. Add core interfaces and types for detail page scraping
  - Create PageType enum for LISTING_PAGE, DETAIL_PAGE, UNKNOWN
  - Add DetailPageExtractor interface for consistent extractor pattern
  - Add type definitions for extraction helper functions
  - _Requirements: 1.1, 10.1_

- [x] 2. Implement page type detection logic
  - Create detectPageType() function with URL pattern analysis
  - Add content structure analysis as fallback detection
  - Handle edge cases for ambiguous pages
  - _Requirements: 1.1, 10.1_

- [x] 2.1 Write property test for page type detection
  - **Property 1: Page type detection and routing**
  - **Validates: Requirements 1.1, 10.1, 10.2, 10.3**

- [x] 3. Implement core single car extraction function
  - Create extractSingleCarData() function with error handling
  - Add URL validation and HTML fetching with timeout
  - Implement website detection and routing logic
  - Add data validation before returning results
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 3.1 Write property test for error handling
  - **Property 7: Error handling for invalid inputs**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 4. Implement helper functions for data extraction
  - Create extractDetailImages() for gallery image extraction
  - Create extractSpecTable() for structured specification parsing
  - Create extractSellerInfo() for seller name and location
  - Create validateCarData() for completeness checking
  - Create extractImageUrl() for handling lazy-loaded images
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.6, 3.1, 3.2, 8.2_

- [x] 4.1 Write property test for image extraction completeness
  - **Property 4: Image extraction completeness**
  - **Validates: Requirements 1.2**

- [x] 4.2 Write property test for image filtering and quality
  - **Property 5: Image filtering and quality**
  - **Validates: Requirements 1.3, 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 4.3 Write property test for lazy-loaded image extraction
  - **Property 11: Lazy-loaded image extraction**
  - **Validates: Requirements 8.2**

- [x] 5. Implement CarDekho detail page extractor
  - Create extractCarDekhoDetail() function
  - Add selectors for car name, price, specifications
  - Add image gallery extraction logic
  - Add seller information extraction
  - Handle missing fields with defaults
  - _Requirements: 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 4.1_

- [x] 6. Implement CarWale detail page extractor
  - Create extractCarWaleDetail() function
  - Add CarWale-specific selectors for all fields
  - Add image extraction with CarWale patterns
  - Add seller information extraction
  - Handle missing fields with defaults
  - _Requirements: 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 4.2_

- [x] 7. Implement Cars24 detail page extractor
  - Create extractCars24Detail() function
  - Add Cars24-specific selectors for all fields
  - Add image extraction with Cars24 patterns
  - Add seller information extraction
  - Handle missing fields with defaults
  - _Requirements: 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 4.3_

- [x] 8. Implement OLX detail page extractor
  - Create extractOLXDetail() function
  - Add OLX-specific selectors for all fields
  - Add image extraction with OLX patterns
  - Add seller information extraction
  - Handle missing fields with defaults
  - _Requirements: 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 4.4_

- [x] 9. Implement generic detail page extractor
  - Create extractGenericDetail() function as fallback
  - Add generic selectors for common patterns
  - Add best-effort extraction logic
  - Return null if extraction fails
  - _Requirements: 4.5, 4.6_

- [x] 10. Implement description extraction and cleaning
  - Create extractDescription() helper function
  - Add HTML tag removal logic
  - Add paragraph break preservation
  - Add multi-section combining logic
  - Add default value for missing descriptions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 11. Enhance price parsing for multiple formats
  - Update parsePrice() to handle lakhs format
  - Add crores format support
  - Add numeric with commas support
  - Add currency symbol handling
  - Return 0 for invalid formats
  - _Requirements: 1.5_

- [x] 12. Implement default values for missing seller info
  - Add logic to detect missing seller information
  - Add website-based default seller names
  - Add default city values
  - _Requirements: 3.4_

- [x] 14. Add comprehensive error handling
  - Add input validation with clear error messages
  - Add network timeout handling (15 seconds)
  - Add HTTP error response handling
  - Add missing field validation with field list
  - Add anti-bot detection with helpful message
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 13. Update admin scraper action to use extractSingleCarData





  - Modify scrapeListing() in app/actions/admin.ts to detect page type using detectPageType()
  - Route to extractSingleCarData() for detail pages instead of extractCarData()
  - Ensure consistent return format (wrap single result in array)
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 5.1 Write property test for field extraction completeness
  - **Property 2: Detail page field extraction completeness**
  - **Validates: Requirements 1.4, 2.1, 2.2, 2.3, 2.6, 3.1, 3.2**

- [ ]* 5.2 Write property test for fuel type and transmission extraction
  - **Property 12: Fuel type and transmission extraction**
  - **Validates: Requirements 2.4, 2.5**

- [ ]* 9.1 Write property test for website-specific routing
  - **Property 6: Website-specific extractor routing**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ]* 10.1 Write property test for description extraction
  - **Property 9: Description extraction and cleaning**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ]* 11.1 Write property test for price parsing
  - **Property 3: Price format parsing**
  - **Validates: Requirements 1.5**

- [ ]* 12.1 Write property test for default values
  - **Property 8: Default values for missing seller information**
  - **Validates: Requirements 3.4**

- [ ]* 13.1 Write property test for import workflow consistency
  - **Property 10: Import workflow consistency**
  - **Validates: Requirements 6.5, 10.5**

- [ ]* 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 16. Add unit tests for URL validation
  - Test valid HTTP/HTTPS URLs pass
  - Test invalid protocols are rejected
  - Test empty strings are rejected
  - Test malformed URLs are rejected
  - _Requirements: 5.1_

- [ ]* 17. Add unit tests for price parsing edge cases
  - Test "₹5.5 lakh" → 550000
  - Test "₹1.2 crore" → 12000000
  - Test "₹550000" → 550000
  - Test "5,50,000" → 550000
  - Test invalid formats return 0
  - _Requirements: 1.5_

- [ ]* 18. Add unit tests for image filtering
  - Test logo URLs are filtered out
  - Test icon class names are filtered out
  - Test SVG files are filtered out
  - Test valid car images pass through
  - _Requirements: 1.3_

- [ ]* 19. Add unit tests for website detection
  - Test CarDekho URLs are detected correctly
  - Test CarWale URLs are detected correctly
  - Test Cars24 URLs are detected correctly
  - Test OLX URLs are detected correctly
  - Test unknown URLs fall back to generic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 20. Add integration tests for complete workflow
  - Test scrape → preview → import → database verification
  - Test error scenarios → UI feedback → no database changes
  - Test multiple website types → consistent output format
  - _Requirements: 6.5, 10.5_

- [ ]* 21. Update documentation and comments
  - Add JSDoc comments to all new functions
  - Update README with new scraping capabilities
  - Document selector patterns for each website
  - Add examples of supported URL formats
  - _Requirements: 9.1, 9.2, 9.3_

- [ ]* 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
