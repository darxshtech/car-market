import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { verifyOwnership, createListing } from './listings';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock mongodb connection
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(async () => ({})),
}));

// Mock GridFS
vi.mock('@/lib/gridfs', () => ({
  uploadMultipleToGridFS: vi.fn(async (files) => 
    files.map((_: any, i: number) => `/api/images/mock-id-${i}`)
  ),
}));

// Mock Listing model
vi.mock('@/lib/models/Listing', () => ({
  default: {
    create: vi.fn(async (data) => ({
      _id: 'mock-listing-id',
      ...data,
    })),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

// Mock Interest model
vi.mock('@/lib/models/Interest', () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import Listing from '@/lib/models/Listing';
import Interest from '@/lib/models/Interest';

beforeEach(() => {
  vi.clearAllMocks();
});

// Generators
const validRegistrationNumberArbitrary = fc.tuple(
  fc.constantFrom('MH', 'DL', 'KA', 'TN', 'UP', 'GJ'),
  fc.integer({ min: 1, max: 99 }).map(n => n.toString().padStart(2, '0')),
  fc.constantFrom('A', 'B', 'C', 'AB', 'CD'),
  fc.integer({ min: 1, max: 9999 }).map(n => n.toString().padStart(4, '0'))
).map(([state, district, series, number]) => `${state}${district}${series}${number}`);

const validOwnerNameArbitrary = fc.tuple(
  fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2)
).map(([first, last]) => `${first} ${last}`);

const invalidOwnerNameArbitrary = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().split(/\s+/).length < 2);

describe('Ownership Verification Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 14: Ownership verification requirement
   * Validates: Requirements 4.3, 4.4
   * 
   * For any user attempting to access the car details form, the form should only be 
   * accessible after successful ownership verification with valid registration number and owner name.
   */
  it('Property 14: Ownership verification requirement - valid data passes verification', async () => {
    await fc.assert(
      fc.asyncProperty(
        validRegistrationNumberArbitrary,
        validOwnerNameArbitrary,
        async (regNumber, ownerName) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              profileComplete: true,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          const result = await verifyOwnership(regNumber, ownerName);

          // Valid registration and owner name should pass verification
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();
          expect(result.data.registrationNumber).toBe(regNumber.toUpperCase());
          expect(result.data.ownerName).toBe(ownerName);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000); // 2 minute timeout for 100 runs with 1s delay each

  it('Property 14: Ownership verification requirement - invalid data fails verification', async () => {
    await fc.assert(
      fc.asyncProperty(
        validRegistrationNumberArbitrary,
        invalidOwnerNameArbitrary,
        async (regNumber, invalidName) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              profileComplete: true,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          const result = await verifyOwnership(regNumber, invalidName);

          // Invalid owner name (single word) should fail verification
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Ownership verification requirement - unauthenticated users cannot verify', async () => {
    await fc.assert(
      fc.asyncProperty(
        validRegistrationNumberArbitrary,
        validOwnerNameArbitrary,
        async (regNumber, ownerName) => {
          // Mock unauthenticated session
          vi.mocked(getServerSession).mockResolvedValue(null);

          const result = await verifyOwnership(regNumber, ownerName);

          // Unauthenticated users should not be able to verify ownership
          expect(result.success).toBe(false);
          expect(result.error).toContain('signed in');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Ownership verification requirement - incomplete profile users cannot verify', async () => {
    await fc.assert(
      fc.asyncProperty(
        validRegistrationNumberArbitrary,
        validOwnerNameArbitrary,
        async (regNumber, ownerName) => {
          // Mock session with incomplete profile
          vi.mocked(getServerSession).mockResolvedValue({
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              profileComplete: false,
              banned: false,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          const result = await verifyOwnership(regNumber, ownerName);

          // Users with incomplete profiles should not be able to verify ownership
          expect(result.success).toBe(false);
          expect(result.error).toContain('complete your profile');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Generators for listing form data
const validBrandArbitrary = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2);
const validModelArbitrary = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2);
const validVariantArbitrary = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2);
const validFuelTypeArbitrary = fc.constantFrom('petrol', 'diesel', 'cng', 'electric');
const validTransmissionArbitrary = fc.constantFrom('manual', 'automatic');
const validKmDrivenArbitrary = fc.integer({ min: 0, max: 500000 });
const validCityArbitrary = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2);
const validStateArbitrary = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2);
const validDescriptionArbitrary = fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10);
const validPriceArbitrary = fc.integer({ min: 1, max: 100000000 });
const currentYear = new Date().getFullYear();
const validYearArbitrary = fc.integer({ min: 1900, max: currentYear });
const validOwnersArbitrary = fc.integer({ min: 1, max: 10 });

// Generator for valid image files
const validImageFileArbitrary = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.jpg`),
  type: fc.constantFrom('image/jpeg', 'image/png', 'image/webp', 'image/jpg'),
  size: fc.integer({ min: 1000, max: 5 * 1024 * 1024 }), // 1KB to 5MB
});

// Generator for invalid image files
const invalidImageTypeArbitrary = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.pdf`),
  type: fc.constantFrom('application/pdf', 'text/plain', 'video/mp4'),
  size: fc.integer({ min: 1000, max: 5 * 1024 * 1024 }),
});

const oversizedImageArbitrary = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.jpg`),
  type: fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
  size: fc.integer({ min: 5 * 1024 * 1024 + 1, max: 20 * 1024 * 1024 }), // Over 5MB
});

// Helper to create FormData from listing data
function createListingFormData(data: {
  brand: string;
  model: string;
  variant: string;
  fuelType: string;
  transmission: string;
  kmDriven: number;
  city: string;
  state: string;
  description: string;
  price: number;
  yearOfOwnership: number;
  numberOfOwners: number;
  images: Array<{ name: string; type: string; size: number }>;
}): FormData {
  const formData = new FormData();
  formData.append('brand', data.brand);
  formData.append('model', data.model);
  formData.append('variant', data.variant);
  formData.append('fuelType', data.fuelType);
  formData.append('transmission', data.transmission);
  formData.append('kmDriven', data.kmDriven.toString());
  formData.append('city', data.city);
  formData.append('state', data.state);
  formData.append('description', data.description);
  formData.append('price', data.price.toString());
  formData.append('yearOfOwnership', data.yearOfOwnership.toString());
  formData.append('numberOfOwners', data.numberOfOwners.toString());

  // Create mock File objects for images
  data.images.forEach((img) => {
    const buffer = Buffer.alloc(img.size);
    const file = new File([buffer], img.name, { type: img.type });
    formData.append('images', file);
  });

  return formData;
}

describe('Listing Form Validation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated session with complete profile
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        profileComplete: true,
        banned: false,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  /**
   * Feature: drivesphere-marketplace, Property 15: Listing form validation
   * Validates: Requirements 4.5
   * 
   * For any car listing form submission, if any required field is missing or invalid,
   * the validation should fail and prevent submission.
   */
  it('Property 15: Listing form validation - all valid fields pass validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandArbitrary,
        validModelArbitrary,
        validVariantArbitrary,
        validFuelTypeArbitrary,
        validTransmissionArbitrary,
        validKmDrivenArbitrary,
        validCityArbitrary,
        validStateArbitrary,
        validDescriptionArbitrary,
        validPriceArbitrary,
        validYearArbitrary,
        validOwnersArbitrary,
        fc.array(validImageFileArbitrary, { minLength: 1, maxLength: 10 }),
        async (brand, model, variant, fuelType, transmission, kmDriven, city, state, description, price, year, owners, images) => {
          const formData = createListingFormData({
            brand,
            model,
            variant,
            fuelType,
            transmission,
            kmDriven,
            city,
            state,
            description,
            price,
            yearOfOwnership: year,
            numberOfOwners: owners,
            images,
          });

          const result = await createListing(formData);

          // All valid fields should pass validation
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();
          expect(result.data.listingId).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15: Listing form validation - missing required fields fail validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('brand', 'model', 'variant', 'city', 'state', 'description'),
        async (missingField) => {
          const validData = {
            brand: 'Maruti Suzuki',
            model: 'Swift',
            variant: 'VXI',
            fuelType: 'petrol',
            transmission: 'manual',
            kmDriven: 50000,
            city: 'Mumbai',
            state: 'Maharashtra',
            description: 'Well maintained car with full service history',
            price: 500000,
            yearOfOwnership: 2018,
            numberOfOwners: 1,
            images: [{ name: 'car.jpg', type: 'image/jpeg', size: 100000 }],
          };

          const formData = createListingFormData(validData);
          // Remove the required field
          formData.delete(missingField);

          const result = await createListing(formData);

          // Missing required field should fail validation
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 15: Listing form validation - invalid numeric fields fail validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { field: 'kmDriven', value: -1 },
          { field: 'price', value: 0 },
          { field: 'price', value: -100 },
          { field: 'yearOfOwnership', value: 1800 },
          { field: 'yearOfOwnership', value: currentYear + 1 },
          { field: 'numberOfOwners', value: 0 },
          { field: 'numberOfOwners', value: 11 }
        ),
        async (invalidCase) => {
          const validData = {
            brand: 'Maruti Suzuki',
            model: 'Swift',
            variant: 'VXI',
            fuelType: 'petrol',
            transmission: 'manual',
            kmDriven: 50000,
            city: 'Mumbai',
            state: 'Maharashtra',
            description: 'Well maintained car with full service history',
            price: 500000,
            yearOfOwnership: 2018,
            numberOfOwners: 1,
            images: [{ name: 'car.jpg', type: 'image/jpeg', size: 100000 }],
          };

          // Set invalid value
          (validData as any)[invalidCase.field] = invalidCase.value;

          const formData = createListingFormData(validData);

          const result = await createListing(formData);

          // Invalid numeric values should fail validation
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 15: Listing form validation - invalid fuel type or transmission fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('hydrogen', 'nuclear', 'solar', 'invalid'),
        async (invalidFuelType) => {
          const validData = {
            brand: 'Maruti Suzuki',
            model: 'Swift',
            variant: 'VXI',
            fuelType: invalidFuelType,
            transmission: 'manual',
            kmDriven: 50000,
            city: 'Mumbai',
            state: 'Maharashtra',
            description: 'Well maintained car with full service history',
            price: 500000,
            yearOfOwnership: 2018,
            numberOfOwners: 1,
            images: [{ name: 'car.jpg', type: 'image/jpeg', size: 100000 }],
          };

          const formData = createListingFormData(validData);

          const result = await createListing(formData);

          // Invalid fuel type should fail validation
          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid fuel type');
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Listing Creation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated session with complete profile
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        profileComplete: true,
        banned: false,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  /**
   * Feature: drivesphere-marketplace, Property 16: Listing creation with pending status
   * Validates: Requirements 4.6
   * 
   * For any valid car listing submitted by a seller, the listing should be created in MongoDB
   * with status "pending" and should not appear in public listings until approved.
   */
  it('Property 16: Listing creation with pending status - all listings created with pending status', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandArbitrary,
        validModelArbitrary,
        validVariantArbitrary,
        validFuelTypeArbitrary,
        validTransmissionArbitrary,
        validKmDrivenArbitrary,
        validCityArbitrary,
        validStateArbitrary,
        validDescriptionArbitrary,
        validPriceArbitrary,
        validYearArbitrary,
        validOwnersArbitrary,
        fc.array(validImageFileArbitrary, { minLength: 1, maxLength: 10 }),
        async (brand, model, variant, fuelType, transmission, kmDriven, city, state, description, price, year, owners, images) => {
          const formData = createListingFormData({
            brand,
            model,
            variant,
            fuelType,
            transmission,
            kmDriven,
            city,
            state,
            description,
            price,
            yearOfOwnership: year,
            numberOfOwners: owners,
            images,
          });

          const result = await createListing(formData);

          // Verify listing was created successfully
          expect(result.success).toBe(true);

          // Verify Listing.create was called with pending status
          expect(vi.mocked(Listing.create)).toHaveBeenCalled();
          const createCall = vi.mocked(Listing.create).mock.calls[0][0] as any;
          expect(createCall.status).toBe('pending');
          expect(createCall.source).toBe('user');
          expect(createCall.interestCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('File Upload Validation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated session with complete profile
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        profileComplete: true,
        banned: false,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  /**
   * Feature: drivesphere-marketplace, Property 34: File upload validation
   * Validates: Requirements 13.5
   * 
   * For any file uploaded as a car image, the system should validate that the file type
   * is an allowed image format (JPEG, PNG, WebP) and size is within limits before uploading.
   */
  it('Property 34: File upload validation - valid image types and sizes pass validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validImageFileArbitrary, { minLength: 1, maxLength: 10 }),
        async (images) => {
          const validData = {
            brand: 'Maruti Suzuki',
            model: 'Swift',
            variant: 'VXI',
            fuelType: 'petrol',
            transmission: 'manual',
            kmDriven: 50000,
            city: 'Mumbai',
            state: 'Maharashtra',
            description: 'Well maintained car with full service history',
            price: 500000,
            yearOfOwnership: 2018,
            numberOfOwners: 1,
            images,
          };

          const formData = createListingFormData(validData);

          const result = await createListing(formData);

          // Valid image files should pass validation
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34: File upload validation - invalid image types fail validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(invalidImageTypeArbitrary, { minLength: 1, maxLength: 5 }),
        async (invalidImages) => {
          const validData = {
            brand: 'Maruti Suzuki',
            model: 'Swift',
            variant: 'VXI',
            fuelType: 'petrol',
            transmission: 'manual',
            kmDriven: 50000,
            city: 'Mumbai',
            state: 'Maharashtra',
            description: 'Well maintained car with full service history',
            price: 500000,
            yearOfOwnership: 2018,
            numberOfOwners: 1,
            images: invalidImages,
          };

          const formData = createListingFormData(validData);

          const result = await createListing(formData);

          // Invalid image types should fail validation
          expect(result.success).toBe(false);
          expect(result.error).toContain('JPEG, PNG, and WebP');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 34: File upload validation - oversized images fail validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(oversizedImageArbitrary, { minLength: 1, maxLength: 5 }),
        async (oversizedImages) => {
          const validData = {
            brand: 'Maruti Suzuki',
            model: 'Swift',
            variant: 'VXI',
            fuelType: 'petrol',
            transmission: 'manual',
            kmDriven: 50000,
            city: 'Mumbai',
            state: 'Maharashtra',
            description: 'Well maintained car with full service history',
            price: 500000,
            yearOfOwnership: 2018,
            numberOfOwners: 1,
            images: oversizedImages,
          };

          const formData = createListingFormData(validData);

          const result = await createListing(formData);

          // Oversized images should fail validation
          expect(result.success).toBe(false);
          expect(result.error).toContain('5MB');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 34: File upload validation - no images fail validation', async () => {
    const validData = {
      brand: 'Maruti Suzuki',
      model: 'Swift',
      variant: 'VXI',
      fuelType: 'petrol',
      transmission: 'manual',
      kmDriven: 50000,
      city: 'Mumbai',
      state: 'Maharashtra',
      description: 'Well maintained car with full service history',
      price: 500000,
      yearOfOwnership: 2018,
      numberOfOwners: 1,
      images: [],
    };

    const formData = createListingFormData(validData);

    const result = await createListing(formData);

    // No images should fail validation
    expect(result.success).toBe(false);
    expect(result.error).toContain('At least one image is required');
  });

  it('Property 34: File upload validation - more than 10 images fail validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validImageFileArbitrary, { minLength: 11, maxLength: 15 }),
        async (tooManyImages) => {
          const validData = {
            brand: 'Maruti Suzuki',
            model: 'Swift',
            variant: 'VXI',
            fuelType: 'petrol',
            transmission: 'manual',
            kmDriven: 50000,
            city: 'Mumbai',
            state: 'Maharashtra',
            description: 'Well maintained car with full service history',
            price: 500000,
            yearOfOwnership: 2018,
            numberOfOwners: 1,
            images: tooManyImages,
          };

          const formData = createListingFormData(validData);

          const result = await createListing(formData);

          // More than 10 images should fail validation
          expect(result.success).toBe(false);
          expect(result.error).toContain('Maximum 10 images');
        }
      ),
      { numRuns: 50 }
    );
  });
});


describe('My Garage Listing Management Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated session with complete profile
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        profileComplete: true,
        banned: false,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  /**
   * Feature: drivesphere-marketplace, Property 20: Listing deletion completeness
   * Validates: Requirements 6.6
   * 
   * For any listing deleted by its owner, the listing should be removed from MongoDB
   * and should not appear in any queries for that user's listings.
   */
  it('Property 20: Listing deletion completeness - deletes listing and associated interests', async () => {
    // Mock Listing model methods
    const mockListing = {
      _id: 'test-listing-id',
      sellerId: 'test-user-id',
      status: 'approved',
    };

    vi.mocked(Listing.findById).mockResolvedValue(mockListing as any);
    vi.mocked(Listing.findByIdAndDelete).mockResolvedValue(mockListing as any);

    // Mock Interest model
    const mockInterestDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 5 });
    vi.mocked(Interest.deleteMany as any).mockImplementation(mockInterestDeleteMany);

    const { deleteListing } = await import('./listings');
    const result = await deleteListing('test-listing-id');

    // Verify the listing was deleted
    expect(result.success).toBe(true);
    expect(vi.mocked(Listing.findByIdAndDelete)).toHaveBeenCalledWith('test-listing-id');
    
    // Verify associated interests were deleted
    expect(mockInterestDeleteMany).toHaveBeenCalledWith({ listingId: 'test-listing-id' });
  });

  it('Property 20: Listing deletion completeness - only owner can delete their listing', async () => {
    // Mock Listing model methods with different owner
    const mockListing = {
      _id: 'test-listing-id',
      sellerId: 'different-user-id',
      status: 'approved',
    };

    vi.mocked(Listing.findById).mockResolvedValue(mockListing as any);

    const { deleteListing } = await import('./listings');
    const result = await deleteListing('test-listing-id');

    // Verify deletion was denied
    expect(result.success).toBe(false);
    expect(result.error).toContain('only delete your own listings');
    expect(vi.mocked(Listing.findByIdAndDelete)).not.toHaveBeenCalled();
  });
});
