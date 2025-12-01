# Implementation Plan

- [x] 1. Initialize Next.js project and configure dependencies





  - Create Next.js 14 app with App Router using `npx create-next-app@latest`
  - Install dependencies: mongoose, next-auth, tailwindcss, framer-motion, cloudinary, cheerio, puppeteer, zod, fast-check, vitest
  - Configure TailwindCSS with dark theme and cyan/blue accent colors
  - Set up TypeScript configuration
  - Create .env.local file structure with placeholders for MongoDB URI, NextAuth secrets, Google OAuth credentials, Cloudinary keys, admin credentials
  - _Requirements: 1.1, 11.1_

- [x] 2. Set up MongoDB connection and base schemas





  - Create lib/mongodb.ts with connection utility using Mongoose
  - Define User schema with googleId, email, fullName, mobileNumber, documentType, documentNumber, verified, banned fields
  - Define Listing schema with sellerId, brand, model, variant, fuelType, transmission, yearOfOwnership, numberOfOwners, kmDriven, city, state, description, price, images, status, interestCount, source fields
  - Define Interest schema with listingId, userId, compound unique index
  - Define AdminLog schema with action, targetId, targetType, details, timestamp
  - Add appropriate indexes to all schemas
  - _Requirements: 1.6, 4.6, 13.3_

- [x] 2.1 Write property test for User schema round-trip


  - **Property 3: User profile round-trip**
  - **Validates: Requirements 1.6**

- [x] 2.2 Write property test for Listing schema round-trip


  - **Property 18: Listing update round-trip**
  - **Validates: Requirements 6.4**

- [x] 3. Implement NextAuth configuration with Google OAuth





  - Create app/api/auth/[...nextauth]/route.ts with NextAuth configuration
  - Configure Google OAuth provider with client ID and secret from env
  - Implement custom callbacks to check profile completion status
  - Create session strategy with JWT
  - Add redirect logic to profile form for new users
  - _Requirements: 1.1, 1.2_

- [x] 4. Create authentication UI and profile completion flow





  - Create app/(auth)/signin/page.tsx with Google sign-in button
  - Create app/(auth)/complete-profile/page.tsx with profile form
  - Implement form with fields: fullName, email (read-only), mobileNumber, documentType (radio), documentNumber
  - Add client-side validation for all fields
  - Create server action completeProfile() to handle form submission
  - Implement mock verification logic checking name against document
  - Store user data in MongoDB on successful verification
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 4.1 Write property test for profile form email prefill


  - **Property 1: Profile form email prefill**
  - **Validates: Requirements 1.3**

- [x] 4.2 Write property test for profile validation completeness


  - **Property 2: Profile validation completeness**
  - **Validates: Requirements 1.4**

- [x] 4.3 Write property test for verification failure handling


  - **Property 4: Verification failure handling**
  - **Validates: Requirements 1.7**

- [x] 5. Build navigation and layout components


  - Create app/components/Navbar.tsx with links to Home, Buy Car, Sell Car, My Garage, Contact
  - Add profile dropdown menu with sign out option
  - Implement responsive mobile menu
  - Create app/components/Footer.tsx with links and contact info
  - Apply dark theme styling with cyan/blue accents
  - _Requirements: 2.5, 11.1, 11.2_

- [x] 6. Implement home page with hero section and featured listings



  - Create app/page.tsx as home page
  - Build hero section with tagline "DriveSphere — India's Trusted Car Market. Verified Users. Verified Cars."
  - Add "Buy a Car" and "Sell Your Car" CTA buttons with Framer Motion animations
  - Fetch approved listings from MongoDB (limit to 8 featured cars)
  - Create CarCard component to display car image, name, model, masked owner, description, price
  - Implement price formatting utility with INR symbol and Indian numbering
  - _Requirements: 2.1, 2.2, 11.3, 11.4, 11.5_

- [x] 6.1 Write property test for approved listings visibility


  - **Property 6: Approved listings visibility**
  - **Validates: Requirements 2.2, 5.1**

- [x] 6.2 Write property test for owner name masking


  - **Property 10: Owner name masking**
  - **Validates: Requirements 3.4**

- [x] 6.3 Write property test for price formatting consistency


  - **Property 13: Price formatting consistency**
  - **Validates: Requirements 11.5**

- [x] 7. Create search and filter components


  - Create app/components/SearchBar.tsx with debounced search input
  - Create app/components/FilterPanel.tsx with filters for brand, budget range, city, year
  - Implement filter state management with URL params
  - Create app/components/SortDropdown.tsx for sorting options
  - Add filter logic to fetch listings based on selected criteria
  - _Requirements: 2.3, 2.4, 5.2, 5.3, 5.4_

- [x] 7.1 Write property test for filter matching accuracy


  - **Property 7: Filter matching accuracy**
  - **Validates: Requirements 2.4, 5.3**




- [x] 8. Build car detail page with image carousel and interest tracking
  - Create app/listings/[id]/page.tsx as dynamic route for car details
  - Fetch listing data from MongoDB by ID
  - Create ImageCarousel component with navigation and touch gestures
  - Display all car metadata: brand, model, variant, fuel, transmission, year, owners, km, city, state
  - Show masked owner name and verification badge
  - Display current interest count
  - Create InterestButton client component with server action expressInterest()
  - Implement optimistic UI update for interest count
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8.1 Write property test for car card navigation
  - **Property 8: Car card navigation**
  - **Validates: Requirements 3.1, 5.5**

- [x] 8.2 Write property test for car detail completeness
  - **Property 9: Car detail completeness**
  - **Validates: Requirements 3.3, 11.4**

- [x] 8.3 Write property test for image carousel completeness
  - **Property 11: Image carousel completeness**
  - **Validates: Requirements 3.2**

- [x] 8.4 Write property test for interest count increment
  - **Property 12: Interest count increment**
  - **Validates: Requirements 3.6**

- [x] 9. Implement Buy Car page with advanced filtering



  - Create app/buy-car/page.tsx
  - Fetch all approved listings from MongoDB with pagination
  - Integrate SearchBar, FilterPanel, and SortDropdown components
  - Display listings in grid layout using CarCard components
  - Implement server-side filtering and sorting logic
  - Add pagination controls
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Create Sell Car page with ownership verification



  - Create app/sell-car/page.tsx as protected route
  - Build OwnershipVerificationForm component with registration number and owner name fields
  - Create server action verifyOwnership() with mock API call
  - Show success/error messages based on verification result
  - Enable car details form only after successful verification
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10.1 Write property test for ownership verification requirement


  - **Property 14: Ownership verification requirement**
  - **Validates: Requirements 4.3, 4.4**

- [x] 11. Build car listing form with image upload







  - Create CarListingForm component with all required fields
  - Add fields: brand, model, variant, fuelType, transmission, kmDriven, city, state, description, price, yearOfOwnership, numberOfOwners
  - Implement multiple image upload with preview using GridFS for MongoDB storage
  - Add client-side validation for all fields
  - Create server action createListing() to handle form submission
  - Upload images to GridFS and store references in listing
  - Save listing to MongoDB with status "pending"
  - Show confirmation message after submission
  - _Requirements: 4.5, 4.6, 4.7_

- [x] 11.1 Write property test for listing form validation


  - **Property 15: Listing form validation**
  - **Validates: Requirements 4.5**

- [x] 11.2 Write property test for listing creation with pending status

  - **Property 16: Listing creation with pending status**
  - **Validates: Requirements 4.6**

- [x] 11.3 Write property test for file upload validation

  - **Property 34: File upload validation**
  - **Validates: Requirements 13.5**

- [x] 12. Implement My Garage dashboard for sellers


  - Create app/my-garage/page.tsx as protected route
  - Fetch listings where sellerId matches current user
  - Display listings with approval status badges (pending, approved, rejected, sold)
  - Create EditListingModal component for updating price, description, images
  - Create server actions in app/actions/listings.ts: updateListing(), markAsSold(), deleteListing()
  - Add confirmation dialogs for delete actions
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 12.1 Write property test for user-specific garage listings


  - **Property 17: User-specific garage listings**
  - **Validates: Requirements 6.1**


- [x] 12.2 Write property test for sold listing visibility






  - **Property 19: Sold listing visibility**
  - **Validates: Requirements 6.5**


- [x] 12.3 Write property test for listing deletion completeness


  - **Property 20: Listing deletion completeness**
  - **Validates: Requirements 6.6**

- [x] 13. Set up admin authentication and middleware


  - Create middleware.ts in root directory to protect /admin routes
  - Implement admin credential validation using ADMIN_EMAIL and ADMIN_PASS from env
  - Create app/admin/login/page.tsx with admin login form
  - Add session management for admin users using NextAuth

  - Redirect unauthorized users to home page
  - Also protect /sell-car and /my-garage routes for authenticated users


  - _Requirements: 7.1, 7.2, 12.1, 12.2, 12.3_

- [x] 13.1 Write property test for admin authentication requirement


  - **Property 21: Admin authentication requirement**
  - **Validates: Requirements 7.2, 12.3**

- [x] 14. Build admin dashboard with metrics


  - Create app/admin/page.tsx as admin dashboard
  - Fetch and display total users count from MongoDB

  - Fetch and display total listings count
  - Fetch and display pending approvals count



  - Use MongoDB aggregation for efficient metric calculation
  - Display metrics in card layout with icons
  - Add navigation links to listings, users, and scraper pages
  - _Requirements: 7.3_

- [x] 14.1 Write property test for dashboard metrics accuracy


  - **Property 22: Dashboard metrics accuracy**
  - **Validates: Requirements 7.3**


- [x] 15. Implement listing approval workflow for admin



  - Create app/admin/listings/page.tsx to show pending listings
  - Display pending listings in table with car details, images, and seller info

  - Create server actions in app/actions/admin.ts: approveListing(), rejectListing()
  - Add approve/reject buttons for each listing
  - Update listing status in MongoDB when action is taken
  - Log admin actions to AdminLog collection
  - Show success/error messages after actions
  - _Requirements: 7.4, 7.5, 7.6_

- [x] 15.1 Write property test for listing approval state transition


  - **Property 23: Listing approval state transition**
  - **Validates: Requirements 7.5**

- [x] 15.2 Write property test for listing rejection state transition


  - **Property 24: Listing rejection state transition**
  - **Validates: Requirements 7.6**

- [x] 16. Create web scraper module


  - Create lib/scraper.ts with scraping functions using Cheerio and Puppeteer
  - Implement extractCarData() function to scrape: images, carName, model, price, ownerName, yearOfPurchase, kmDriven, numberOfOwners, city
  - Add error handling for failed scraping attempts
  - Create server action in app/actions/admin.ts: scrapeListing() to handle scraping requests
  - Return scraped data in structured format
  - _Requirements: 8.2, 8.4_

- [x] 16.1 Write property test for scraped data extraction completeness


  - **Property 25: Scraped data extraction completeness**
  - **Validates: Requirements 8.2**

- [x] 16.2 Write property test for scraper error handling


  - **Property 26: Scraper error handling**
  - **Validates: Requirements 8.4**

- [x] 17. Build admin web scraper interface



  - Create app/admin/scraper/page.tsx
  - Add input field for external listing URL
  - Create button to trigger scraping
  - Display scraped data in preview table after scraping completes
  - Show loading state during scraping
  - Add "Approve & Import" button for each scraped listing
  - Create server action in app/actions/admin.ts: importScrapedListings() to save to MongoDB with status "approved" and source "scraped"
  - Display confirmation message with count of imported listings
  - _Requirements: 8.1, 8.3, 8.5, 8.6_

- [x] 17.1 Write property test for scraped listing import


  - **Property 27: Scraped listing import**
  - **Validates: Requirements 8.5**

- [x] 18. Implement user management for admin



  - Create app/admin/users/page.tsx
  - Fetch and display all users with name, email, mobile, verification status, listing count
  - Create server action in app/actions/admin.ts: banUser() to update user banned status
  - Add ban/unban buttons for each user
  - Show confirmation dialog before banning
  - Log admin actions to AdminLog collection
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 18.1 Write property test for banned user access prevention


  - **Property 5: Banned user access prevention**
  - **Validates: Requirements 9.3, 9.4**



- [x] 18.2 Write property test for user management data completeness


  - **Property 28: User management data completeness**
  - **Validates: Requirements 9.2**

- [x] 19. Integrate TailorTalk AI chatbot widget







  - Create app/components/TailorTalkWidget.tsx as client component
  - Load TailorTalk embed script dynamically
  - Position widget as floating button in bottom-right corner
  - Label widget as "DriveSphere AI Assistant"
  - Add widget to Home, Buy Car, Sell Car, and Car Detail pages
  - Ensure widget doesn't obstruct critical UI elements
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 20. Enhance route protection middleware


  - Update middleware.ts to check banned status and deny access if user is banned
  - Ensure /sell-car and /my-garage routes redirect unauthenticated users to /signin
  - Validate session tokens on each request
  - Handle expired sessions with redirect to signin
  - _Requirements: 12.1, 12.2, 12.4, 12.5, 9.4_

- [x] 20.1 Write property test for protected route authentication



  - **Property 29: Protected route authentication**
  - **Validates: Requirements 12.1, 12.2**

- [x] 20.2 Write property test for session validation on protected routes

  - **Property 30: Session validation on protected routes**
  - **Validates: Requirements 12.4**

- [x] 20.3 Write property test for expired session handling

  - **Property 31: Expired session handling**
  - **Validates: Requirements 12.5**

- [x] 21. Add input validation and sanitization



  - Create lib/validation.ts with Zod schemas for all forms
  - Add validation schemas for profile form, listing form, ownership form, admin forms
  - Update server actions in app/actions/auth.ts and app/actions/listings.ts to use Zod validation
  - Sanitize user inputs to prevent XSS and injection attacks
  - Validate file uploads for type and size
  - Add error handling for validation failures
  - _Requirements: 13.2, 13.5_

- [x] 21.1 Write property test for input sanitization


  - **Property 32: Input sanitization**
  - **Validates: Requirements 13.2**

- [x] 22. Implement secure data storage


  - Create lib/encryption.ts with functions to encrypt/decrypt sensitive data using crypto module
  - Update User model to encrypt Aadhaar and PAN numbers before storing in MongoDB
  - Decrypt only when needed for verification
  - Store all sensitive credentials in environment variables
  - Validate environment variables on app startup in lib/mongodb.ts
  - _Requirements: 13.1, 13.3_

- [x] 22.1 Write property test for sensitive data encryption


  - **Property 33: Sensitive data encryption**
  - **Validates: Requirements 13.3**

- [x] 23. Enhance responsive design and animations


  - Review and enhance responsive design with TailwindCSS breakpoints (mobile, tablet, desktop)
  - Add Framer Motion animations to hero section, car cards, modals
  - Implement smooth transitions for page navigation
  - Test layout on different screen sizes
  - Optimize touch interactions for mobile devices
  - _Requirements: 11.2, 11.3_

- [x] 23.1 Write property test for responsive layout adaptation


  - **Property 35: Responsive layout adaptation**
  - **Validates: Requirements 11.2**

- [x] 24. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. Create Contact page


  - Create app/contact/page.tsx with contact form
  - Add fields for name, email, subject, message
  - Create server action in app/actions/contact.ts to handle contact form submission
  - Display success message after submission
  - Add contact information and social media links

- [x] 26. Add error handling and loading states


  - Create app/error.tsx for global error boundary
  - Create app/loading.tsx for global loading state
  - Add loading skeletons for car cards and detail pages
  - Implement toast notifications library (e.g., react-hot-toast) for success/error messages
  - Create app/not-found.tsx for 404 errors

- [x] 27. Optimize images and performance


  - Review and ensure Next.js Image component is used for all images
  - Configure image optimization in next.config.js
  - Implement lazy loading for images below the fold
  - Add image placeholders with blur effect
  - Optimize bundle size with dynamic imports for heavy components

- [x] 28. Update environment variables documentation


  - Update .env.example with all required variables including ADMIN_EMAIL, ADMIN_PASS
  - Document environment variable setup in README.md
  - Add notes about MongoDB connection string format
  - Document Google OAuth setup steps
  - Add admin credentials setup instructions

- [x] 29. Final testing and bug fixes


  - Test complete user flow: signup → browse → list car → admin approval
  - Test all protected routes with different user states
  - Test admin panel functionality
  - Test web scraper with sample URLs
  - Test responsive design on multiple devices
  - Fix any bugs discovered during testing

- [x] 30. Final Checkpoint - Ensure all tests pass


  - Run all tests with `npm test`
  - Ensure all property-based tests pass
  - Verify no TypeScript errors with `npm run build`
  - Ask the user if questions arise
