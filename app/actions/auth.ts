'use server';

import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { profileFormSchema, sanitizeObject, type ProfileFormData } from '@/lib/validation';

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Mock verification function that checks if the name matches the document
 * In production, this would call actual Aadhaar/PAN verification APIs
 */
function mockVerifyDocument(fullName: string, documentType: string, documentNumber: string): boolean {
  // Mock verification logic:
  // - Check if document number has valid format
  // - Simulate name matching (in real scenario, this would call external API)
  
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
  
  // Mock: Simulate verification failure if name is too short
  // In production, this would verify against actual government records
  if (fullName.trim().split(' ').length < 2) {
    return false;
  }
  
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

    // Perform mock verification
    const isVerified = mockVerifyDocument(
      validatedData.fullName,
      validatedData.documentType,
      validatedData.documentNumber
    );

    if (!isVerified) {
      return {
        success: false,
        error: 'Verification failed. Please ensure your name matches your document and the document number is valid.',
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
