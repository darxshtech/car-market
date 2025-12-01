import { z } from 'zod';

/**
 * Sanitize string input to prevent XSS attacks
 * Removes potentially dangerous HTML tags and scripts
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) {
    return '';
  }
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Sanitize object with string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      (sanitized[key] as any) = sanitizeString(sanitized[key] as string);
    }
  }
  return sanitized;
}

// Profile Form Validation Schema
export const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
  email: z.string().email('Invalid email address'),
  mobileNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Mobile number must be a valid 10-digit Indian number'),
  documentType: z.enum(['aadhaar', 'pan'], {
    errorMap: () => ({ message: 'Document type must be either Aadhaar or PAN' }),
  }),
  documentNumber: z.string().refine(
    (val) => {
      // Aadhaar: 12 digits
      // PAN: 10 alphanumeric characters (e.g., ABCDE1234F)
      return /^\d{12}$/.test(val) || /^[A-Z]{5}\d{4}[A-Z]$/.test(val);
    },
    {
      message: 'Document number must be a valid Aadhaar (12 digits) or PAN (10 characters)',
    }
  ),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

// Ownership Verification Form Schema
export const ownershipFormSchema = z.object({
  registrationNumber: z
    .string()
    .min(5, 'Registration number must be at least 5 characters')
    .max(20, 'Registration number must be less than 20 characters')
    .regex(
      /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/,
      'Invalid registration number format (e.g., MH12AB1234)'
    ),
  ownerName: z
    .string()
    .min(2, 'Owner name must be at least 2 characters')
    .max(100, 'Owner name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Owner name can only contain letters and spaces'),
});

export type OwnershipFormData = z.infer<typeof ownershipFormSchema>;

// Car Listing Form Schema
export const carListingFormSchema = z.object({
  brand: z
    .string()
    .min(2, 'Brand must be at least 2 characters')
    .max(50, 'Brand must be less than 50 characters'),
  model: z
    .string()
    .min(1, 'Model must be at least 1 character')
    .max(50, 'Model must be less than 50 characters'),
  variant: z
    .string()
    .min(1, 'Variant must be at least 1 character')
    .max(50, 'Variant must be less than 50 characters'),
  fuelType: z.enum(['petrol', 'diesel', 'cng', 'electric'], {
    errorMap: () => ({ message: 'Invalid fuel type' }),
  }),
  transmission: z.enum(['manual', 'automatic'], {
    errorMap: () => ({ message: 'Transmission must be manual or automatic' }),
  }),
  kmDriven: z
    .number()
    .int('Kilometers driven must be a whole number')
    .min(0, 'Kilometers driven cannot be negative')
    .max(1000000, 'Kilometers driven seems unrealistic'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City must be less than 50 characters'),
  state: z
    .string()
    .min(2, 'State must be at least 2 characters')
    .max(50, 'State must be less than 50 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  price: z
    .number()
    .int('Price must be a whole number')
    .min(10000, 'Price must be at least ₹10,000')
    .max(100000000, 'Price must be less than ₹10 crore'),
  yearOfOwnership: z
    .number()
    .int('Year must be a whole number')
    .min(1990, 'Year must be 1990 or later')
    .max(new Date().getFullYear(), `Year cannot be in the future`),
  numberOfOwners: z
    .number()
    .int('Number of owners must be a whole number')
    .min(1, 'Number of owners must be at least 1')
    .max(10, 'Number of owners seems unrealistic'),
});

export type CarListingFormData = z.infer<typeof carListingFormSchema>;

// Listing Update Schema (partial of car listing)
export const listingUpdateSchema = carListingFormSchema.partial().extend({
  id: z.string().min(1, 'Listing ID is required'),
});

export type ListingUpdateData = z.infer<typeof listingUpdateSchema>;

// Admin Login Schema
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type AdminLoginData = z.infer<typeof adminLoginSchema>;

// File Upload Validation
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

export function validateImageFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!files || files.length === 0) {
    return { valid: false, errors: ['At least one image is required'] };
  }

  if (files.length > 10) {
    return { valid: false, errors: ['Maximum 10 images allowed'] };
  }

  files.forEach((file, index) => {
    const result = validateImageFile(file);
    if (!result.valid) {
      errors.push(`Image ${index + 1}: ${result.error}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// Contact Form Schema
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be less than 2000 characters'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Ban User Schema
export const banUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().optional(),
});

export type BanUserData = z.infer<typeof banUserSchema>;

// Scraper URL Schema
export const scraperUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

export type ScraperUrlData = z.infer<typeof scraperUrlSchema>;
