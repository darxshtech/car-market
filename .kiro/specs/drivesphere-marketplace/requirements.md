# Requirements Document

## Introduction

DriveSphere is a full-stack car buying and selling platform built with Next.js 14 (App Router), MongoDB, and NextAuth with Google OAuth 2.0. The platform provides a verified marketplace where real users can buy and sell cars, with admin oversight and web scraping capabilities to import listings from external sources. The system emphasizes user verification, listing approval workflows, and AI-assisted customer support through TailorTalk integration.

## Glossary

- **DriveSphere System**: The complete web application including frontend, backend, database, and admin tools
- **User**: An authenticated individual who has completed Google OAuth and profile verification
- **Seller**: A User who has listed one or more cars for sale
- **Buyer**: A User who expresses interest in purchasing a car
- **Listing**: A car advertisement created by a Seller or imported via web scraper
- **Admin**: A privileged user with access to approval workflows and system management
- **Web Scraper**: An automated tool that extracts car listing data from external websites
- **NextAuth**: Authentication library for Next.js applications
- **Server Action**: Next.js server-side function for handling form submissions and mutations
- **TailorTalk**: Third-party AI chatbot service integrated into the platform
- **Aadhaar**: Indian government-issued unique identification number
- **PAN**: Permanent Account Number issued by Indian Income Tax Department
- **My Garage**: User dashboard showing their car listings and management options

## Requirements

### Requirement 1

**User Story:** As a new visitor, I want to sign up using my Google account and complete profile verification, so that I can access the marketplace as a trusted user.

#### Acceptance Criteria

1. WHEN a visitor clicks the sign-in button THEN the DriveSphere System SHALL initiate Google OAuth 2.0 authentication flow via NextAuth
2. WHEN Google authentication succeeds THEN the DriveSphere System SHALL redirect the user to a profile completion form
3. WHEN the profile form loads THEN the DriveSphere System SHALL prefill the email field with the Google account email and mark it as read-only
4. WHEN a user submits the profile form with full name, mobile number, and either Aadhaar or PAN number THEN the DriveSphere System SHALL validate that all required fields are present
5. WHEN profile data is submitted THEN the DriveSphere System SHALL perform mock verification to check if the entered name matches the Aadhaar or PAN record
6. WHEN verification succeeds THEN the DriveSphere System SHALL store the user profile in MongoDB and redirect to the home page
7. WHEN verification fails THEN the DriveSphere System SHALL display an error message and allow the user to correct their information

### Requirement 2

**User Story:** As a visitor, I want to browse the home page with featured cars and search capabilities, so that I can discover available vehicles without signing in.

#### Acceptance Criteria

1. WHEN a visitor accesses the home page THEN the DriveSphere System SHALL display a hero banner with the tagline and call-to-action buttons
2. WHEN the home page loads THEN the DriveSphere System SHALL fetch and display a grid of featured approved car listings from MongoDB
3. WHEN the home page renders THEN the DriveSphere System SHALL provide search and filter components for brand, budget range, city, and year
4. WHEN a visitor applies filters THEN the DriveSphere System SHALL update the displayed car listings to match the selected criteria
5. WHEN the home page displays THEN the DriveSphere System SHALL show a navigation bar with links to Home, Buy Car, Sell Car, My Garage, Contact, and Profile menu

### Requirement 3

**User Story:** As a buyer, I want to view detailed information about a car listing, so that I can make an informed purchase decision.

#### Acceptance Criteria

1. WHEN a user clicks on a car card THEN the DriveSphere System SHALL navigate to a dedicated car detail page
2. WHEN the car detail page loads THEN the DriveSphere System SHALL display an image carousel with all uploaded car photos
3. WHEN the car detail page renders THEN the DriveSphere System SHALL show car metadata including brand, model, variant, fuel type, transmission, year of first ownership, number of owners, kilometers driven, city, and state
4. WHEN the car detail page displays owner information THEN the DriveSphere System SHALL mask the owner surname showing only the first name and surname initial
5. WHEN the car detail page loads THEN the DriveSphere System SHALL display the current count of interested buyers
6. WHEN a user clicks the "I'm Interested" button THEN the DriveSphere System SHALL increment the interest count in MongoDB and update the display
7. WHEN the car detail page renders THEN the DriveSphere System SHALL display a verification badge if the owner is verified

### Requirement 4

**User Story:** As a seller, I want to list my car for sale after verifying ownership, so that potential buyers can discover my vehicle.

#### Acceptance Criteria

1. WHEN an authenticated user accesses the Sell Car page THEN the DriveSphere System SHALL display a car ownership verification form
2. WHEN a user submits registration number and owner name THEN the DriveSphere System SHALL perform mock API verification of car ownership
3. WHEN ownership verification succeeds THEN the DriveSphere System SHALL display the car details form
4. WHEN ownership verification fails THEN the DriveSphere System SHALL display an error message and prevent form progression
5. WHEN a user completes the car details form with brand, model, variant, fuel type, transmission, kilometers driven, city, state, description, price, and multiple images THEN the DriveSphere System SHALL validate all required fields
6. WHEN a user submits the car listing THEN the DriveSphere System SHALL upload images to Cloudinary and store listing data in MongoDB with pending approval status
7. WHEN a listing is saved THEN the DriveSphere System SHALL display a confirmation message indicating the listing awaits admin approval

### Requirement 5

**User Story:** As a buyer, I want to browse all approved cars with advanced filtering options, so that I can find vehicles matching my preferences.

#### Acceptance Criteria

1. WHEN a user accesses the Buy Car page THEN the DriveSphere System SHALL fetch and display all approved car listings from MongoDB
2. WHEN the Buy Car page loads THEN the DriveSphere System SHALL provide filter controls for brand, model, price range, fuel type, transmission, year, city, and kilometers driven
3. WHEN a user applies multiple filters THEN the DriveSphere System SHALL display only listings that match all selected criteria
4. WHEN the Buy Car page renders THEN the DriveSphere System SHALL provide sorting options for price, year, and kilometers driven
5. WHEN a user clicks on a car card THEN the DriveSphere System SHALL navigate to the detailed car listing page

### Requirement 6

**User Story:** As a seller, I want to manage my car listings in My Garage, so that I can update information or remove sold vehicles.

#### Acceptance Criteria

1. WHEN an authenticated user accesses My Garage THEN the DriveSphere System SHALL display all car listings created by that user
2. WHEN My Garage loads THEN the DriveSphere System SHALL show the approval status for each listing
3. WHEN a user clicks edit on a listing THEN the DriveSphere System SHALL allow modification of price, description, and images
4. WHEN a user updates listing information THEN the DriveSphere System SHALL save changes to MongoDB and display a confirmation message
5. WHEN a user marks a listing as sold THEN the DriveSphere System SHALL update the listing status in MongoDB and hide it from public view
6. WHEN a user deletes a listing THEN the DriveSphere System SHALL remove the listing from MongoDB and update the My Garage display

### Requirement 7

**User Story:** As an admin, I want to review and approve pending car listings, so that only legitimate vehicles appear in the marketplace.

#### Acceptance Criteria

1. WHEN an admin accesses the admin panel at /admin THEN the DriveSphere System SHALL authenticate using credentials from environment variables
2. WHEN authentication fails THEN the DriveSphere System SHALL deny access and redirect to the home page
3. WHEN the admin panel loads THEN the DriveSphere System SHALL display dashboard metrics including total users, total listings, and pending approvals count
4. WHEN an admin views pending listings THEN the DriveSphere System SHALL show all listings with pending status including car details and images
5. WHEN an admin approves a listing THEN the DriveSphere System SHALL update the listing status to approved in MongoDB and make it visible in the marketplace
6. WHEN an admin rejects a listing THEN the DriveSphere System SHALL update the listing status to rejected and notify the seller

### Requirement 8

**User Story:** As an admin, I want to scrape car listings from external websites, so that I can quickly populate the marketplace with inventory.

#### Acceptance Criteria

1. WHEN an admin accesses the web scraper section THEN the DriveSphere System SHALL display an input field for entering external listing URLs
2. WHEN an admin submits a URL THEN the DriveSphere System SHALL use Cheerio or Puppeteer to extract car images, name, model, price, owner name, year of purchase, kilometers driven, number of owners, and city
3. WHEN scraping completes THEN the DriveSphere System SHALL display the extracted data in a preview table
4. WHEN scraping fails THEN the DriveSphere System SHALL display an error message with details about the failure
5. WHEN an admin reviews scraped data and clicks "Approve & Import" THEN the DriveSphere System SHALL create new listing records in MongoDB with approved status
6. WHEN imported listings are saved THEN the DriveSphere System SHALL display a confirmation message with the count of successfully imported cars

### Requirement 9

**User Story:** As an admin, I want to manage user accounts, so that I can maintain platform integrity by removing suspicious users.

#### Acceptance Criteria

1. WHEN an admin accesses user management THEN the DriveSphere System SHALL display a list of all registered users with their verification status
2. WHEN an admin views user details THEN the DriveSphere System SHALL show the user's name, email, mobile number, verification document type, and listing count
3. WHEN an admin bans a user account THEN the DriveSphere System SHALL update the user status in MongoDB and prevent that user from accessing protected routes
4. WHEN a banned user attempts to access protected routes THEN the DriveSphere System SHALL deny access and display an appropriate message

### Requirement 10

**User Story:** As a user, I want AI assistance while browsing the platform, so that I can get quick answers to my questions about buying or selling cars.

#### Acceptance Criteria

1. WHEN a user visits the Home, Buy Car, Sell Car, or Car Detail pages THEN the DriveSphere System SHALL display the TailorTalk floating chatbot widget
2. WHEN the TailorTalk widget loads THEN the DriveSphere System SHALL label it as "DriveSphere AI Assistant"
3. WHEN a user interacts with the chatbot THEN the DriveSphere System SHALL allow the TailorTalk service to process queries and provide responses
4. WHEN the chatbot is displayed THEN the DriveSphere System SHALL ensure it does not obstruct critical UI elements

### Requirement 11

**User Story:** As a user, I want to experience a modern and responsive interface with automotive theming, so that I have an engaging and professional browsing experience.

#### Acceptance Criteria

1. WHEN any page loads THEN the DriveSphere System SHALL apply a dark theme with neon cyan and electric blue accent colors
2. WHEN the interface renders on different devices THEN the DriveSphere System SHALL adapt the layout to provide optimal viewing on mobile, tablet, and desktop screens
3. WHEN users interact with UI elements THEN the DriveSphere System SHALL provide smooth animations using Framer Motion
4. WHEN car cards display THEN the DriveSphere System SHALL show car image, name, model, masked owner name, description, and formatted price in INR
5. WHEN price values render THEN the DriveSphere System SHALL format them with Indian numbering system and rupee symbol

### Requirement 12

**User Story:** As a system administrator, I want protected routes to require authentication, so that unauthorized users cannot access seller features or admin panels.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access the Sell Car page THEN the DriveSphere System SHALL redirect to the sign-in page
2. WHEN an unauthenticated user attempts to access My Garage THEN the DriveSphere System SHALL redirect to the sign-in page
3. WHEN a non-admin user attempts to access /admin routes THEN the DriveSphere System SHALL deny access and redirect to the home page
4. WHEN an authenticated user accesses protected routes THEN the DriveSphere System SHALL verify the session using NextAuth middleware
5. WHEN a user session expires THEN the DriveSphere System SHALL redirect to the sign-in page when accessing protected routes

### Requirement 13

**User Story:** As a developer, I want secure handling of sensitive data and API keys, so that the platform maintains security best practices.

#### Acceptance Criteria

1. WHEN the application initializes THEN the DriveSphere System SHALL load sensitive credentials from environment variables
2. WHEN user input is received THEN the DriveSphere System SHALL validate and sanitize all inputs before processing
3. WHEN storing user data THEN the DriveSphere System SHALL ensure Aadhaar and PAN numbers are stored securely in MongoDB
4. WHEN API requests are made THEN the DriveSphere System SHALL validate authentication tokens and session data
5. WHEN image uploads occur THEN the DriveSphere System SHALL validate file types and sizes before uploading to Cloudinary
