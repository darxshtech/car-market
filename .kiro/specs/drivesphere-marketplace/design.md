# Design Document

## Overview

DriveSphere is a full-stack car marketplace platform built on Next.js 14 with App Router architecture. The system uses MongoDB for data persistence, NextAuth for Google OAuth 2.0 authentication, and server actions for backend operations. The platform implements a three-tier verification system: user identity verification, car ownership verification, and admin approval workflows. The architecture emphasizes server-side rendering for SEO, client-side interactivity for dynamic features, and secure route protection through middleware.

The platform serves three primary user roles: buyers who browse and express interest in vehicles, sellers who list cars after ownership verification, and admins who approve listings and manage the marketplace. A web scraping module allows admins to import listings from external sources, expanding inventory efficiently.

## Architecture

### System Architecture

The application follows a modern Next.js 14 App Router architecture with clear separation between server and client components:

**Frontend Layer:**
- Next.js 14 App Router for file-based routing and server components
- React Server Components (RSC) for initial page loads and SEO optimization
- Client Components for interactive features (forms, modals, carousels)
- TailwindCSS for styling with custom dark theme configuration
- Framer Motion for animations and transitions

**Backend Layer:**
- Next.js Server Actions for mutations (create, update, delete operations)
- Next.js Route Handlers for complex API logic and external integrations
- NextAuth for authentication and session management
- Mongoose ODM for MongoDB interactions
- Cloudinary SDK for image upload and management

**Data Layer:**
- MongoDB Atlas for production database
- Mongoose schemas with validation and indexing
- Collections: users, listings, interests, admin_logs

**External Services:**
- Google OAuth 2.0 for authentication
- Cloudinary for image storage and CDN
- TailorTalk for AI chatbot widget
- Web scraping via Cheerio/Puppeteer

### Deployment Architecture


- Vercel for Next.js application hosting with edge functions
- MongoDB Atlas for managed database with automatic backups
- Cloudinary for image CDN with global distribution
- Environment variables managed through Vercel dashboard

### Security Architecture

- NextAuth middleware for route protection
- Server-side session validation for all protected routes
- Environment variables for sensitive credentials (MongoDB URI, OAuth secrets, admin credentials)
- Input validation on both client and server
- CSRF protection through NextAuth
- Secure HTTP-only cookies for session management

## Components and Interfaces

### Authentication Components

**GoogleAuthProvider (Server Component)**
- Wraps NextAuth SessionProvider
- Provides authentication context to entire application
- Handles OAuth callback routing

**SignInButton (Client Component)**
```typescript
interface SignInButtonProps {
  callbackUrl?: string;
}
```
- Triggers Google OAuth flow via NextAuth signIn()
- Redirects to profile completion if first login

**ProfileCompletionForm (Client Component)**
```typescript
interface ProfileFormData {
  fullName: string;
  email: string; // read-only from Google
  mobileNumber: string;
  documentType: 'aadhaar' | 'pan';
  documentNumber: string;
}
```
- Validates input fields
- Calls server action to verify and save profile
- Redirects to home on success

**ProtectedRoute (Middleware)**
- Checks NextAuth session
- Redirects unauthenticated users to sign-in
- Validates admin credentials for /admin routes

### Car Listing Components

**CarCard (Server Component)**
```typescript
interface CarCardProps {
  listing: {
    id: string;
    images: string[];
    carName: string;
    model: string;
    ownerName: string;
    description: string;
    price: number;
    city: string;
    year: number;
  };
}
```
- Displays car thumbnail, name, masked owner, price
- Links to detail page
- Formats price in INR

**CarDetailPage (Server Component with Client Islands)**
```typescript
interface CarDetailData {
  id: string;
  images: string[];
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
  ownerName: string;
  ownerVerified: boolean;
  interestCount: number;
}
```
- Server component fetches data from MongoDB
- Client component for image carousel
- Client component for "I'm Interested" button with optimistic updates

**ImageCarousel (Client Component)**
```typescript
interface ImageCarouselProps {
  images: string[];
  alt: string;
}
```
- Displays multiple images with navigation
- Supports touch gestures on mobile
- Lazy loads images for performance

**InterestButton (Client Component)**
```typescript
interface InterestButtonProps {
  listingId: string;
  initialCount: number;
}
```
- Calls server action to increment interest
- Optimistic UI update
- Prevents duplicate clicks

### Seller Components

**OwnershipVerificationForm (Client Component)**
```typescript
interface OwnershipFormData {
  registrationNumber: string;
  ownerName: string;
}
```
- Validates registration format
- Calls mock verification API
- Enables car details form on success

**CarListingForm (Client Component)**
```typescript
interface CarListingFormData {
  brand: string;
  model: string;
  variant: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric';
  transmission: 'manual' | 'automatic';
  kmDriven: number;
  city: string;
  state: string;
  description: string;
  price: number;
  images: File[];
  yearOfOwnership: number;
  numberOfOwners: number;
}
```
- Multi-step form with validation
- Image upload with preview
- Calls server action to create listing

**MyGarageList (Server Component)**
- Fetches user's listings from MongoDB
- Displays approval status badges
- Provides edit/delete actions

**EditListingModal (Client Component)**
```typescript
interface EditListingProps {
  listingId: string;
  currentData: Partial<CarListingFormData>;
}
```
- Allows price, description, image updates
- Calls server action to update listing
- Optimistic UI updates

### Search and Filter Components

**SearchBar (Client Component)**
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
}
```
- Debounced search input
- Updates URL params for shareable links

**FilterPanel (Client Component)**
```typescript
interface FilterOptions {
  brands: string[];
  priceRange: [number, number];
  cities: string[];
  yearRange: [number, number];
  fuelTypes: string[];
  transmissions: string[];
}
```
- Multi-select filters
- Updates URL params
- Triggers server-side filtering

**SortDropdown (Client Component)**
```typescript
interface SortOption {
  label: string;
  value: 'price_asc' | 'price_desc' | 'year_desc' | 'km_asc';
}
```
- Dropdown for sort options
- Updates URL params

### Admin Components

**AdminAuthGuard (Middleware)**
- Validates admin credentials from env
- Protects /admin routes
- Redirects unauthorized users

**AdminDashboard (Server Component)**
- Displays metrics: total users, listings, pending approvals
- Fetches data from MongoDB aggregations

**PendingListingsTable (Server Component with Client Actions)**
```typescript
interface PendingListing {
  id: string;
  carDetails: CarDetailData;
  sellerInfo: {
    name: string;
    email: string;
  };
  submittedAt: Date;
}
```
- Lists pending approvals
- Client buttons for approve/reject actions

**UserManagementTable (Server Component with Client Actions)**
```typescript
interface UserRecord {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  listingCount: number;
  banned: boolean;
}
```
- Lists all users
- Ban/unban actions

**WebScraperForm (Client Component)**
```typescript
interface ScraperFormData {
  url: string;
}

interface ScrapedData {
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
```
- Input for external URL
- Calls server action to scrape
- Displays preview table
- Import button to save to MongoDB

### UI Components

**Navbar (Server Component with Client Menu)**
- Logo and navigation links
- Profile dropdown (client component)
- Responsive mobile menu

**HeroSection (Server Component)**
- Promotional banner with CTA buttons
- Animated text with Framer Motion

**Footer (Server Component)**
- Links to pages
- Contact information
- Social media links

**TailorTalkWidget (Client Component)**
- Loads TailorTalk embed script
- Positioned as floating widget
- Conditional rendering based on route

## Data Models

### User Schema

```typescript
interface User {
  _id: ObjectId;
  googleId: string; // unique
  email: string; // unique
  fullName: string;
  mobileNumber: string;
  documentType: 'aadhaar' | 'pan';
  documentNumber: string; // encrypted
  verified: boolean;
  banned: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `googleId`: unique
- `email`: unique
- `banned`: for filtering

### Listing Schema

```typescript
interface Listing {
  _id: ObjectId;
  sellerId: ObjectId; // ref: User
  brand: string;
  model: string;
  variant: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric';
  transmission: 'manual' | 'automatic';
  yearOfOwnership: number;
  numberOfOwners: number;
  kmDriven: number;
  city: string;
  state: string;
  description: string;
  price: number;
  images: string[]; // Cloudinary URLs
  status: 'pending' | 'approved' | 'rejected' | 'sold';
  interestCount: number;
  source: 'user' | 'scraped';
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `sellerId`: for user listings
- `status`: for filtering approved/pending
- `brand, city, price`: compound index for search
- `createdAt`: for sorting

### Interest Schema

```typescript
interface Interest {
  _id: ObjectId;
  listingId: ObjectId; // ref: Listing
  userId: ObjectId; // ref: User
  createdAt: Date;
}
```

**Indexes:**
- `listingId, userId`: compound unique index (prevent duplicates)
- `listingId`: for counting interests

### AdminLog Schema

```typescript
interface AdminLog {
  _id: ObjectId;
  action: 'approve_listing' | 'reject_listing' | 'ban_user' | 'import_scraped';
  targetId: ObjectId;
  targetType: 'listing' | 'user';
  details: Record<string, any>;
  timestamp: Date;
}
```

**Indexes:**
- `timestamp`: for audit trail
- `targetId, targetType`: compound index


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication and User Management Properties

**Property 1: Profile form email prefill**
*For any* successful Google OAuth response containing an email, the profile completion form should prefill the email field with that value and mark it as read-only.
**Validates: Requirements 1.3**

**Property 2: Profile validation completeness**
*For any* profile form submission, if any required field (fullName, mobileNumber, documentType, documentNumber) is missing or empty, the validation should fail and prevent submission.
**Validates: Requirements 1.4**

**Property 3: User profile round-trip**
*For any* valid user profile data that passes verification, storing it in MongoDB and then retrieving it should return equivalent data with all fields preserved.
**Validates: Requirements 1.6**

**Property 4: Verification failure handling**
*For any* profile submission where the name does not match the document record, the verification should fail and display an error message without creating a user record.
**Validates: Requirements 1.7**

**Property 5: Banned user access prevention**
*For any* user account marked as banned in MongoDB, attempts to access protected routes should be denied and redirect to an error page.
**Validates: Requirements 9.3, 9.4**

### Listing Display and Search Properties

**Property 6: Approved listings visibility**
*For any* set of listings in MongoDB, only those with status "approved" should appear in the home page featured grid and Buy Car page.
**Validates: Requirements 2.2, 5.1**

**Property 7: Filter matching accuracy**
*For any* combination of filter criteria (brand, price range, city, year, fuel type, transmission), all displayed listings should match every selected filter criterion.
**Validates: Requirements 2.4, 5.3**

**Property 8: Car card navigation**
*For any* car listing displayed as a card, clicking the card should navigate to a detail page with the URL containing that listing's unique identifier.
**Validates: Requirements 3.1, 5.5**

**Property 9: Car detail completeness**
*For any* car listing, the detail page should display all metadata fields: brand, model, variant, fuelType, transmission, yearOfOwnership, numberOfOwners, kmDriven, city, state, description, price, and images.
**Validates: Requirements 3.3, 11.4**

**Property 10: Owner name masking**
*For any* owner name in the format "FirstName LastName", the display should show "FirstName L." where L is the first character of the last name.
**Validates: Requirements 3.4**

**Property 11: Image carousel completeness**
*For any* listing with N images, the image carousel should display all N images and allow navigation between them.
**Validates: Requirements 3.2**

**Property 12: Interest count increment**
*For any* listing, when a user clicks "I'm Interested", the interest count should increase by exactly 1 and the updated count should be persisted in MongoDB.
**Validates: Requirements 3.6**

**Property 13: Price formatting consistency**
*For any* numeric price value, the displayed format should include the rupee symbol (₹) and use Indian numbering system with commas (e.g., ₹5,00,000).
**Validates: Requirements 11.5**

### Seller Workflow Properties

**Property 14: Ownership verification requirement**
*For any* user attempting to access the car details form, the form should only be accessible after successful ownership verification with valid registration number and owner name.
**Validates: Requirements 4.3, 4.4**

**Property 15: Listing form validation**
*For any* car listing form submission, if any required field (brand, model, variant, fuelType, transmission, kmDriven, city, state, price, images) is missing or invalid, the validation should fail and prevent submission.
**Validates: Requirements 4.5**

**Property 16: Listing creation with pending status**
*For any* valid car listing submitted by a seller, the listing should be created in MongoDB with status "pending" and should not appear in public listings until approved.
**Validates: Requirements 4.6**

**Property 17: User-specific garage listings**
*For any* authenticated user viewing My Garage, only listings where sellerId matches the user's ID should be displayed.
**Validates: Requirements 6.1**

**Property 18: Listing update round-trip**
*For any* listing owned by a user, updating the price, description, or images and then retrieving the listing should reflect all changes accurately.
**Validates: Requirements 6.4**

**Property 19: Sold listing visibility**
*For any* listing marked as "sold", it should not appear in public Buy Car page results but should remain visible in the seller's My Garage with sold status.
**Validates: Requirements 6.5**

**Property 20: Listing deletion completeness**
*For any* listing deleted by its owner, the listing should be removed from MongoDB and should not appear in any queries for that user's listings.
**Validates: Requirements 6.6**

### Admin Workflow Properties

**Property 21: Admin authentication requirement**
*For any* access attempt to /admin routes, if the provided credentials do not match ADMIN_EMAIL and ADMIN_PASS from environment variables, access should be denied and redirect to home page.
**Validates: Requirements 7.2, 12.3**

**Property 22: Dashboard metrics accuracy**
*For any* database state, the admin dashboard should display counts that match: total users = count of User documents, total listings = count of Listing documents, pending approvals = count of Listings with status "pending".
**Validates: Requirements 7.3**

**Property 23: Listing approval state transition**
*For any* listing with status "pending", when an admin approves it, the status should change to "approved" and the listing should immediately appear in public search results.
**Validates: Requirements 7.5**

**Property 24: Listing rejection state transition**
*For any* listing with status "pending", when an admin rejects it, the status should change to "rejected" and the listing should not appear in public search results.
**Validates: Requirements 7.6**

**Property 25: Scraped data extraction completeness**
*For any* valid external car listing URL, the scraper should extract and return data containing all required fields: images, carName, model, price, ownerName, yearOfPurchase, kmDriven, numberOfOwners, and city.
**Validates: Requirements 8.2**

**Property 26: Scraper error handling**
*For any* invalid URL or scraping failure, the system should return an error response with details about the failure without creating any database records.
**Validates: Requirements 8.4**

**Property 27: Scraped listing import**
*For any* scraped data approved for import, new Listing documents should be created in MongoDB with status "approved", source "scraped", and all extracted fields populated.
**Validates: Requirements 8.5**

**Property 28: User management data completeness**
*For any* user in the database, the admin user management view should display name, email, mobileNumber, verified status, and count of listings created by that user.
**Validates: Requirements 9.2**

### Security and Access Control Properties

**Property 29: Protected route authentication**
*For any* unauthenticated request to protected routes (/sell-car, /my-garage), the system should redirect to the sign-in page without rendering the protected content.
**Validates: Requirements 12.1, 12.2**

**Property 30: Session validation on protected routes**
*For any* authenticated user accessing protected routes, the NextAuth middleware should verify the session token before allowing access.
**Validates: Requirements 12.4**

**Property 31: Expired session handling**
*For any* request with an expired session token to protected routes, the system should redirect to the sign-in page and clear the invalid session.
**Validates: Requirements 12.5**

**Property 32: Input sanitization**
*For any* user input received through forms or API requests, the system should validate and sanitize the input to remove potentially malicious content before processing.
**Validates: Requirements 13.2**

**Property 33: Sensitive data encryption**
*For any* user profile containing Aadhaar or PAN numbers, these fields should be encrypted before storage in MongoDB and decrypted only when needed for verification.
**Validates: Requirements 13.3**

**Property 34: File upload validation**
*For any* file uploaded as a car image, the system should validate that the file type is an allowed image format (JPEG, PNG, WebP) and size is within limits before uploading to Cloudinary.
**Validates: Requirements 13.5**

### Responsive Design Properties

**Property 35: Responsive layout adaptation**
*For any* page rendered at mobile (< 768px), tablet (768px-1024px), or desktop (> 1024px) viewport widths, the layout should adapt with appropriate breakpoints and maintain usability.
**Validates: Requirements 11.2**


## Error Handling

### Client-Side Error Handling

**Form Validation Errors:**
- Display inline error messages below form fields
- Highlight invalid fields with red borders
- Prevent form submission until all errors are resolved
- Show field-specific error messages (e.g., "Mobile number must be 10 digits")

**Network Errors:**
- Display toast notifications for failed API calls
- Implement retry logic for transient failures
- Show loading states during async operations
- Provide user-friendly error messages (avoid technical jargon)

**Authentication Errors:**
- Redirect to sign-in page with error message
- Clear invalid session data
- Display OAuth-specific errors (e.g., "Google authentication failed")

**Image Upload Errors:**
- Validate file size and type before upload
- Display progress indicators during upload
- Show specific errors (e.g., "File too large", "Invalid format")
- Allow users to retry failed uploads

### Server-Side Error Handling

**Database Errors:**
- Catch MongoDB connection errors and return 503 Service Unavailable
- Handle duplicate key errors (e.g., existing email) with 409 Conflict
- Log database errors for debugging
- Return generic error messages to clients (don't expose internal details)

**Authentication Errors:**
- Return 401 Unauthorized for invalid credentials
- Return 403 Forbidden for insufficient permissions
- Log authentication failures for security monitoring
- Implement rate limiting to prevent brute force attacks

**Validation Errors:**
- Return 400 Bad Request with detailed validation errors
- Use Zod or similar library for schema validation
- Validate all inputs on server side even if client validates
- Sanitize inputs to prevent injection attacks

**External Service Errors:**
- Handle Cloudinary upload failures gracefully
- Implement timeout for web scraping operations
- Catch and log OAuth provider errors
- Provide fallback behavior when external services are unavailable

**Server Action Errors:**
- Wrap all server actions in try-catch blocks
- Return structured error objects: `{ success: false, error: string }`
- Log errors with context (user ID, action type, timestamp)
- Use error boundaries in React to catch rendering errors

### Error Logging and Monitoring

**Logging Strategy:**
- Use structured logging with consistent format
- Include request ID, user ID, timestamp, error type
- Log to console in development, external service in production
- Separate error logs by severity (info, warning, error, critical)

**Monitoring:**
- Track error rates and patterns
- Set up alerts for critical errors
- Monitor API response times
- Track failed authentication attempts

## Testing Strategy

### Unit Testing

**Framework:** Vitest for unit tests with React Testing Library for component tests

**Unit Test Coverage:**

1. **Utility Functions:**
   - Name masking function (maskOwnerName)
   - Price formatting function (formatINR)
   - Input validation functions
   - Date formatting utilities

2. **Form Validation:**
   - Profile form validation logic
   - Car listing form validation
   - Ownership verification form validation
   - Admin login validation

3. **Data Transformations:**
   - Listing data mapping from MongoDB to UI format
   - User profile data transformations
   - Scraped data normalization

4. **Component Rendering:**
   - CarCard renders with correct data
   - Navbar shows appropriate links based on auth state
   - Filter panel displays selected filters
   - Admin dashboard shows correct metrics

5. **Error Handling:**
   - Error boundary catches and displays errors
   - Form error messages display correctly
   - Network error handling in components

### Property-Based Testing

**Framework:** fast-check for JavaScript/TypeScript property-based testing

**Configuration:**
- Minimum 100 iterations per property test
- Use seed for reproducible failures
- Generate edge cases automatically (empty strings, large numbers, special characters)

**Property Test Coverage:**

Each property-based test must be tagged with a comment referencing the design document property:
```typescript
// Feature: drivesphere-marketplace, Property 10: Owner name masking
```

**Test Categories:**

1. **Authentication Properties:**
   - Property 1: Profile form email prefill
   - Property 2: Profile validation completeness
   - Property 3: User profile round-trip
   - Property 4: Verification failure handling

2. **Listing Display Properties:**
   - Property 6: Approved listings visibility
   - Property 7: Filter matching accuracy
   - Property 9: Car detail completeness
   - Property 10: Owner name masking
   - Property 11: Image carousel completeness
   - Property 12: Interest count increment
   - Property 13: Price formatting consistency

3. **Seller Workflow Properties:**
   - Property 15: Listing form validation
   - Property 16: Listing creation with pending status
   - Property 17: User-specific garage listings
   - Property 18: Listing update round-trip
   - Property 19: Sold listing visibility
   - Property 20: Listing deletion completeness

4. **Admin Workflow Properties:**
   - Property 22: Dashboard metrics accuracy
   - Property 23: Listing approval state transition
   - Property 24: Listing rejection state transition
   - Property 25: Scraped data extraction completeness
   - Property 27: Scraped listing import
   - Property 28: User management data completeness

5. **Security Properties:**
   - Property 32: Input sanitization
   - Property 33: Sensitive data encryption
   - Property 34: File upload validation

**Generator Strategies:**

- **User Data Generator:** Generate random names, emails, phone numbers, document numbers
- **Listing Data Generator:** Generate random car details with valid ranges (year 2000-2024, km 0-500000, price 100000-10000000)
- **Filter Combination Generator:** Generate random combinations of filters
- **Malicious Input Generator:** Generate SQL injection attempts, XSS payloads, path traversal attempts

### Integration Testing

**Framework:** Playwright for end-to-end testing

**Integration Test Scenarios:**

1. **Complete User Journey:**
   - Sign in with Google OAuth (mocked)
   - Complete profile verification
   - Browse listings with filters
   - Express interest in a car
   - Create a new listing
   - View My Garage

2. **Admin Workflow:**
   - Admin login
   - View pending listings
   - Approve/reject listings
   - Use web scraper
   - Manage users

3. **Error Scenarios:**
   - Failed authentication
   - Network errors during form submission
   - Invalid file uploads
   - Expired sessions

### Test Data Management

**Test Database:**
- Use separate MongoDB database for testing
- Seed with realistic test data
- Clean up after each test suite
- Use factories for generating test data

**Mocking Strategy:**
- Mock Google OAuth in tests
- Mock Cloudinary uploads
- Mock external scraping targets
- Use MSW (Mock Service Worker) for API mocking

### Continuous Testing

**Pre-commit Hooks:**
- Run unit tests and linting
- Check TypeScript compilation
- Format code with Prettier

**CI/CD Pipeline:**
- Run all unit tests
- Run property-based tests
- Run integration tests on staging
- Check test coverage (target: 80%+)
- Deploy only if all tests pass

## API Design

### Server Actions

Server actions are used for mutations and form submissions:

**Authentication Actions:**
```typescript
// app/actions/auth.ts
async function completeProfile(formData: ProfileFormData): Promise<ActionResult>
async function verifyUser(documentData: DocumentData): Promise<ActionResult>
```

**Listing Actions:**
```typescript
// app/actions/listings.ts
async function createListing(formData: CarListingFormData): Promise<ActionResult>
async function updateListing(id: string, updates: Partial<CarListingFormData>): Promise<ActionResult>
async function deleteListing(id: string): Promise<ActionResult>
async function markAsSold(id: string): Promise<ActionResult>
async function expressInterest(listingId: string): Promise<ActionResult>
```

**Admin Actions:**
```typescript
// app/actions/admin.ts
async function approveListing(id: string): Promise<ActionResult>
async function rejectListing(id: string): Promise<ActionResult>
async function banUser(userId: string): Promise<ActionResult>
async function scrapeListing(url: string): Promise<ScrapedData>
async function importScrapedListings(data: ScrapedData[]): Promise<ActionResult>
```

### Route Handlers

Route handlers are used for complex queries and external integrations:

**Listing Routes:**
```typescript
// app/api/listings/route.ts
GET /api/listings - Fetch listings with filters and pagination
GET /api/listings/[id] - Fetch single listing details

// app/api/listings/search/route.ts
GET /api/listings/search?q=query&filters={} - Search listings
```

**User Routes:**
```typescript
// app/api/users/me/route.ts
GET /api/users/me - Get current user profile
PATCH /api/users/me - Update user profile
```

**Admin Routes:**
```typescript
// app/api/admin/stats/route.ts
GET /api/admin/stats - Get dashboard statistics

// app/api/admin/users/route.ts
GET /api/admin/users - List all users with pagination
```

**Scraper Routes:**
```typescript
// app/api/scraper/route.ts
POST /api/scraper - Scrape external URL
```

### Response Formats

**Success Response:**
```typescript
{
  success: true,
  data: T,
  message?: string
}
```

**Error Response:**
```typescript
{
  success: false,
  error: string,
  details?: Record<string, string[]> // Field-specific errors
}
```

**Paginated Response:**
```typescript
{
  success: true,
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

## Performance Considerations

### Frontend Optimization

**Code Splitting:**
- Use dynamic imports for heavy components (image carousel, admin panel)
- Lazy load routes that aren't immediately needed
- Split vendor bundles to improve caching

**Image Optimization:**
- Use Next.js Image component for automatic optimization
- Serve images from Cloudinary CDN with transformations
- Implement lazy loading for images below the fold
- Use appropriate image formats (WebP with JPEG fallback)

**Caching Strategy:**
- Cache static assets with long TTL
- Use SWR or React Query for client-side data caching
- Implement stale-while-revalidate for listing data
- Cache user session data in memory

### Backend Optimization

**Database Optimization:**
- Create indexes on frequently queried fields (status, sellerId, city, brand)
- Use compound indexes for complex queries
- Implement pagination for large result sets
- Use MongoDB aggregation pipeline for dashboard metrics

**Server-Side Caching:**
- Cache featured listings with short TTL (5 minutes)
- Cache filter options (brands, cities) with longer TTL
- Use Redis for session storage in production
- Implement query result caching for expensive operations

**API Optimization:**
- Implement request debouncing for search
- Use server-side pagination
- Limit response payload size
- Compress responses with gzip

### Monitoring and Metrics

**Performance Metrics:**
- Track page load times
- Monitor API response times
- Measure Time to First Byte (TTFB)
- Track Core Web Vitals (LCP, FID, CLS)

**Resource Monitoring:**
- Monitor database connection pool usage
- Track memory usage
- Monitor Cloudinary bandwidth usage
- Set up alerts for performance degradation

## Deployment Strategy

### Environment Configuration

**Development:**
- Local MongoDB instance or MongoDB Atlas free tier
- Local Cloudinary account for testing
- Mock OAuth for faster development
- Hot reload enabled

**Staging:**
- MongoDB Atlas shared cluster
- Cloudinary development account
- Real Google OAuth with test credentials
- Same configuration as production

**Production:**
- MongoDB Atlas dedicated cluster with backups
- Cloudinary production account with CDN
- Google OAuth with production credentials
- Environment variables managed through Vercel

### Deployment Pipeline

1. **Build Phase:**
   - Install dependencies
   - Run TypeScript compilation
   - Run linting and formatting checks
   - Build Next.js application

2. **Test Phase:**
   - Run unit tests
   - Run property-based tests
   - Run integration tests on staging
   - Check test coverage

3. **Deploy Phase:**
   - Deploy to Vercel
   - Run database migrations if needed
   - Verify deployment health
   - Monitor error rates

### Rollback Strategy

- Keep previous deployment available
- Implement feature flags for gradual rollout
- Monitor error rates after deployment
- Automatic rollback if error rate exceeds threshold

## Future Enhancements

### Phase 2 Features

1. **Advanced Search:**
   - Full-text search with Elasticsearch
   - Saved searches and alerts
   - Comparison tool for multiple cars

2. **Messaging System:**
   - Direct messaging between buyers and sellers
   - Real-time notifications
   - Message history and archiving

3. **Payment Integration:**
   - Booking deposits through payment gateway
   - Escrow service for transactions
   - Invoice generation

4. **Enhanced Verification:**
   - Integration with actual Aadhaar/PAN verification APIs
   - Vehicle history reports
   - Insurance verification

5. **Analytics Dashboard:**
   - Seller analytics (views, interests, conversion)
   - Market trends and pricing insights
   - User behavior analytics

### Scalability Considerations

- Implement microservices architecture for scraper
- Use message queue for async operations
- Implement read replicas for database
- Use CDN for static assets
- Implement rate limiting and DDoS protection
