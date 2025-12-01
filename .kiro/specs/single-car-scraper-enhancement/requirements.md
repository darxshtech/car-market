# Requirements Document

## Introduction

This specification defines an enhancement to the DriveSphere web scraper to support scraping individual car detail pages. Currently, the scraper extracts data from listing pages containing multiple cars. This enhancement will enable the scraper to extract comprehensive details from single car detail pages, including all images, specifications, pricing, and seller information. This capability will allow admins to import high-quality, detailed listings one car at a time from external automotive websites.

## Glossary

- **DriveSphere System**: The complete web application including frontend, backend, database, and admin tools
- **Web Scraper**: An automated tool that extracts car listing data from external websites
- **Detail Page**: A dedicated webpage showing comprehensive information about a single car listing
- **Listing Page**: A webpage displaying multiple car listings in a grid or list format
- **Cheerio**: A fast, flexible HTML parsing library for Node.js
- **Admin**: A privileged user with access to the web scraper and system management tools
- **Car Metadata**: Structured information about a vehicle including specifications, pricing, and condition
- **Image Gallery**: A collection of photographs showing different views and features of a car
- **Seller Information**: Contact details and identity information of the car owner
- **Extraction Pattern**: A set of CSS selectors and parsing rules for a specific website structure

## Requirements

### Requirement 1

**User Story:** As an admin, I want to scrape individual car detail pages, so that I can import comprehensive listings with all available information.

#### Acceptance Criteria

1. WHEN an admin enters a URL pointing to a single car detail page THEN the DriveSphere System SHALL detect that the URL is a detail page rather than a listing page
2. WHEN the scraper processes a detail page URL THEN the DriveSphere System SHALL extract all available car images from the page
3. WHEN the scraper extracts images THEN the DriveSphere System SHALL filter out logos, icons, navigation images, and advertisements
4. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the car name, brand, model, and variant information
5. WHEN the scraper extracts pricing information THEN the DriveSphere System SHALL parse prices in various formats including lakhs, crores, and numeric values

### Requirement 2

**User Story:** As an admin, I want the scraper to extract comprehensive car specifications, so that imported listings contain complete technical details.

#### Acceptance Criteria

1. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the year of manufacture or first registration
2. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the kilometers driven or odometer reading
3. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the number of previous owners
4. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the fuel type
5. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the transmission type
6. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the registration location or city
7. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract any additional specifications available in structured tables or lists

### Requirement 3

**User Story:** As an admin, I want the scraper to extract seller information, so that imported listings include contact details.

#### Acceptance Criteria

1. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the seller name or dealer name
2. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the seller location or city
3. WHEN seller contact information is available THEN the DriveSphere System SHALL extract phone numbers
4. WHEN seller information is not explicitly available THEN the DriveSphere System SHALL use default values indicating the source website

### Requirement 4

**User Story:** As an admin, I want the scraper to support multiple automotive websites, so that I can import listings from various sources.

#### Acceptance Criteria

1. WHEN the scraper receives a URL from CarDekho detail pages THEN the DriveSphere System SHALL apply CarDekho-specific extraction patterns
2. WHEN the scraper receives a URL from CarWale detail pages THEN the DriveSphere System SHALL apply CarWale-specific extraction patterns
3. WHEN the scraper receives a URL from Cars24 detail pages THEN the DriveSphere System SHALL apply Cars24-specific extraction patterns
4. WHEN the scraper receives a URL from OLX detail pages THEN the DriveSphere System SHALL apply OLX-specific extraction patterns
5. WHEN the scraper receives a URL from an unsupported website THEN the DriveSphere System SHALL attempt generic extraction patterns
6. WHEN generic extraction fails THEN the DriveSphere System SHALL return an error message indicating the website is not supported

### Requirement 5

**User Story:** As an admin, I want the scraper to handle errors gracefully, so that I receive clear feedback when scraping fails.

#### Acceptance Criteria

1. WHEN the scraper encounters an invalid URL THEN the DriveSphere System SHALL return an error message without attempting to fetch the page
2. WHEN the scraper encounters a network timeout THEN the DriveSphere System SHALL return an error message indicating the timeout duration
3. WHEN the scraper encounters HTTP error responses THEN the DriveSphere System SHALL return an error message with the status code
4. WHEN the scraper cannot extract required fields THEN the DriveSphere System SHALL return an error message listing the missing fields
5. WHEN the scraper encounters anti-bot protection THEN the DriveSphere System SHALL return an error message suggesting alternative approaches

### Requirement 6

**User Story:** As an admin, I want to preview scraped data before importing, so that I can verify accuracy and make corrections.

#### Acceptance Criteria

1. WHEN scraping completes successfully THEN the DriveSphere System SHALL display all extracted data in a structured preview
2. WHEN the preview displays THEN the DriveSphere System SHALL show all extracted images in a gallery format
3. WHEN the preview displays THEN the DriveSphere System SHALL show all extracted specifications in a table format
4. WHEN the preview displays THEN the DriveSphere System SHALL provide an "Approve & Import" button to create the listing
5. WHEN the admin clicks "Approve & Import" THEN the DriveSphere System SHALL create a new listing in MongoDB with approved status

### Requirement 7

**User Story:** As an admin, I want the scraper to extract car descriptions, so that imported listings include detailed information about condition and features.

#### Acceptance Criteria

1. WHEN the scraper processes a detail page THEN the DriveSphere System SHALL extract the main description text
2. WHEN the scraper extracts descriptions THEN the DriveSphere System SHALL preserve paragraph breaks and formatting
3. WHEN the scraper extracts descriptions THEN the DriveSphere System SHALL remove HTML tags and clean the text
4. WHEN multiple description sections exist THEN the DriveSphere System SHALL combine them into a single description field
5. WHEN no description is available THEN the DriveSphere System SHALL use an empty string or default placeholder

### Requirement 8

**User Story:** As an admin, I want the scraper to extract high-quality images, so that imported listings have professional-looking photos.

#### Acceptance Criteria

1. WHEN the scraper extracts images THEN the DriveSphere System SHALL prioritize high-resolution versions over thumbnails
2. WHEN the scraper encounters lazy-loaded images THEN the DriveSphere System SHALL extract the actual image URL from data attributes
3. WHEN the scraper extracts images THEN the DriveSphere System SHALL convert relative URLs to absolute URLs
4. WHEN the scraper extracts images THEN the DriveSphere System SHALL limit the total number of images to a maximum of 15
5. WHEN the scraper extracts images THEN the DriveSphere System SHALL maintain the original order of images from the source page

### Requirement 9

**User Story:** As a developer, I want the scraper to be maintainable and extensible, so that new websites can be added easily.

#### Acceptance Criteria

1. WHEN adding support for a new website THEN the DriveSphere System SHALL require only adding a new extraction function
2. WHEN extraction patterns are defined THEN the DriveSphere System SHALL use a consistent interface across all website-specific extractors
3. WHEN the scraper code is organized THEN the DriveSphere System SHALL separate generic extraction logic from website-specific logic
4. WHEN extraction patterns are updated THEN the DriveSphere System SHALL not require changes to the admin UI or database schema
5. WHEN the scraper is tested THEN the DriveSphere System SHALL provide unit tests for each website-specific extractor

### Requirement 10

**User Story:** As an admin, I want the scraper to work seamlessly with the existing scraper interface, so that I can use both listing page and detail page scraping from the same tool.

#### Acceptance Criteria

1. WHEN an admin enters a URL in the scraper interface THEN the DriveSphere System SHALL automatically detect whether it is a listing page or detail page
2. WHEN a detail page URL is detected THEN the DriveSphere System SHALL use the single-car extraction logic
3. WHEN a listing page URL is detected THEN the DriveSphere System SHALL use the existing multi-car extraction logic
4. WHEN scraping completes THEN the DriveSphere System SHALL display results in the same preview format regardless of URL type
5. WHEN the admin imports scraped data THEN the DriveSphere System SHALL use the same import workflow for both URL types
