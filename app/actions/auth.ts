'use server';

import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { profileFormSchema, sanitizeObject, ProfileFormData } from '@/lib/validation';

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Demo verification function - accepts any valid format without strict validation
 * In production, this would call actual Aadhaar/PAN verification APIs
 * 
 * DEMO MODE: This function now accepts any input with valid format
 * - Does NOT verify name matching with document
 * - Only checks basic format requirements
 */
function mockVerifyDocument(fullName: string, documentType: string, documentNumber: string): boolean {
  // Demo mode: Just verify basic format, no strict validation
  
  // Check if name is not empty
  if (!fullName || fullName.trim().length === 0) {
    return false;
  }
  
  // Check document format only (no name matching)
  if (documentType === 'aadhaar') {
    // Aadhaar should be 12 digits
    if (!/^\d{12}$/.test(documentNumber)) {
      return false;
    }
  } else if (documentType === 'pan') {
    // PAN should be 10 characters (5 letters, 4 digits, 1 letter)
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(documentNumber.toUpperCase())) {
      return false;
    }
  }
  
  // Demo: Accept any name without matching against document
  // In production, this would verify name matches government records
  return true;
}

export async function completeProfile(formData: ProfileFormData): Promise<ActionResult> {
  try {
    // Get the current session
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Sanitize input data
    const sanitizedData = sanitizeObject(formData);

    // Validate with Zod schema
    const validationResult = profileFormSchema.safeParse(sanitizedData);
    
    if (!validationResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(err.message);
      });
      
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors,
      };
    }

    const validatedData = validationResult.data;

    // Perform demo verification (format check only)
    const isVerified = mockVerifyDocument(
      validatedData.fullName,
      validatedData.documentType,
      validatedData.documentNumber
    );

    if (!isVerified) {
      return {
        success: false,
        error: 'Verification failed. Please ensure the document number format is correct.',
      };
    }

    // Connect to database
    await connectDB();

    // Extract Google ID from session
    // For new users, the session.user.id will be the Google provider account ID
    const googleId = session.user.id;

    // Check if user already exists
    const existingUser = await User.findOne({ googleId });
    
    if (existingUser) {
      return {
        success: false,
        error: 'Profile already completed',
      };
    }

    // Create new user
    const newUser = await User.create({
      googleId,
      email: validatedData.email,
      fullName: validatedData.fullName,
      mobileNumber: validatedData.mobileNumber,
      documentType: validatedData.documentType,
      documentNumber: validatedData.documentNumber,
      verified: true, // Set to true after successful mock verification
      banned: false,
    });

    if (!newUser) {
      return {
        success: false,
        error: 'Failed to create user profile',
      };
    }

    return {
      success: true,
      message: 'Profile completed successfully',
    };
  } catch (error) {
    console.error('Error completing profile:', error);
    return {
      success: false,
      error: 'An error occurred while completing your profile. Please try again.',
    };
  }
}

