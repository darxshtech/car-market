'use server';

import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import Interest from '@/lib/models/Interest';
import {
  ownershipFormSchema,
  carListingFormSchema,
  sanitizeString,
  validateImageFiles,
} from '@/lib/validation';

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: any;
  fieldErrors?: Record<string, string[]>;
}

/**
 * DEMO MODE: Mock ownership verification - accepts any valid format
 * In production, this would call an actual vehicle registration API
 * 
 * DEMO: This function now accepts any input without strict validation
 * - Does NOT verify actual ownership
 * - Only checks basic format requirements
 */
export async function verifyOwnership(
  registrationNumber: string,
  ownerName: string
): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: 'You must be signed in to verify ownership',
      };
    }

    if (!session.user.profileComplete) {
      return {
        success: false,
        error: 'Please complete your profile first',
      };
    }

    // Sanitize inputs
    const sanitizedData = {
      registrationNumber: sanitizeString(registrationNumber),
      ownerName: sanitizeString(ownerName),
    };

    // DEMO MODE: Basic validation only - accept any non-empty values
    if (!sanitizedData.registrationNumber || sanitizedData.registrationNumber.trim().length === 0) {
      return {
        success: false,
        error: 'Registration number is required',
      };
    }

    if (!sanitizedData.ownerName || sanitizedData.ownerName.trim().length === 0) {
      return {
        success: false,
        error: 'Owner name is required',
      };
    }

    // DEMO MODE: Accept any format - no strict validation
    // In production, this would validate against actual registration format
    // and verify ownership through government APIs

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      message: 'Ownership verified successfully (Demo Mode)',
      data: {
        registrationNumber: sanitizedData.registrationNumber.toUpperCase(),
        ownerName: sanitizedData.ownerName,
      },
    };
  } catch (error) {
    console.error('Error verifying ownership:', error);
    return {
      success: false,
      error: 'An error occurred during verification',
    };
  }
}

/**
 * Create a new car listing
 * Uploads images to GridFS and creates listing with pending status
 */
export async function createListing(formData: FormData): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: 'You must be signed in to create a listing',
      };
    }

    if (!session.user.profileComplete) {
      return {
        success: false,
        error: 'Please complete your profile first',
      };
    }

    // Extract and sanitize form data
    const rawData = {
      brand: sanitizeString(formData.get('brand') as string),
      model: sanitizeString(formData.get('model') as string),
      variant: sanitizeString(formData.get('variant') as string),
      fuelType: formData.get('fuelType') as string,
      transmission: formData.get('transmission') as string,
      kmDriven: parseInt(formData.get('kmDriven') as string),
      city: sanitizeString(formData.get('city') as string),
      state: sanitizeString(formData.get('state') as string),
      description: sanitizeString(formData.get('description') as string),
      price: parseInt(formData.get('price') as string),
      yearOfOwnership: parseInt(formData.get('yearOfOwnership') as string),
      numberOfOwners: parseInt(formData.get('numberOfOwners') as string),
    };

    // Validate with Zod schema
    const validationResult = carListingFormSchema.safeParse(rawData);
    
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

    // Process and validate images
    const imageFiles = formData.getAll('images') as File[];
    
    const imageValidation = validateImageFiles(imageFiles);
    if (!imageValidation.valid) {
      return {
        success: false,
        error: imageValidation.errors.join(', '),
      };
    }

    // Upload images to GridFS
    const { uploadMultipleToGridFS } = await import('@/lib/gridfs');
    
    const imageBuffers = await Promise.all(
      imageFiles.map(async (file) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        contentType: file.type,
      }))
    );

    const imageUrls = await uploadMultipleToGridFS(imageBuffers);

    // Connect to database and create listing
    await connectDB();

    const listing = await Listing.create({
      sellerId: session.user.id,
      brand: validatedData.brand,
      carModel: validatedData.model,
      variant: validatedData.variant,
      fuelType: validatedData.fuelType,
      transmission: validatedData.transmission,
      yearOfOwnership: validatedData.yearOfOwnership,
      numberOfOwners: validatedData.numberOfOwners,
      kmDriven: validatedData.kmDriven,
      city: validatedData.city,
      state: validatedData.state,
      description: validatedData.description,
      price: validatedData.price,
      images: imageUrls,
      status: 'pending',
      source: 'user',
      interestCount: 0,
    });

    return {
      success: true,
      message: 'Listing created successfully and submitted for approval',
      data: {
        listingId: listing._id.toString(),
      },
    };
  } catch (error) {
    console.error('Error creating listing:', error);
    return {
      success: false,
      error: 'An error occurred while creating the listing',
    };
  }
}

/**
 * Express interest in a listing
 * Creates an interest record and increments the listing's interest count
 */
export async function expressInterest(listingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: 'You must be signed in to express interest',
      };
    }

    if (!session.user.profileComplete) {
      return {
        success: false,
        error: 'Please complete your profile first',
      };
    }

    await connectDB();

    // Check if listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return {
        success: false,
        error: 'Listing not found',
      };
    }

    // Check if user already expressed interest
    const existingInterest = await Interest.findOne({
      listingId,
      userId: session.user.id,
    });

    if (existingInterest) {
      return {
        success: false,
        error: 'You have already expressed interest in this listing',
      };
    }

    // Create interest record
    await Interest.create({
      listingId,
      userId: session.user.id,
    });

    // Increment interest count
    await Listing.findByIdAndUpdate(listingId, {
      $inc: { interestCount: 1 },
    });

    // Get updated count
    const updatedListing = await Listing.findById(listingId);

    return {
      success: true,
      message: 'Interest expressed successfully',
      data: {
        interestCount: updatedListing?.interestCount || 0,
      },
    };
  } catch (error) {
    console.error('Error expressing interest:', error);
    return {
      success: false,
      error: 'An error occurred while expressing interest',
    };
  }
}

/**
 * Update a listing (price, description, images)
 * Only the owner can update their listing
 */
export async function updateListing(
  listingId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: 'You must be signed in to update a listing',
      };
    }

    if (!session.user.profileComplete) {
      return {
        success: false,
        error: 'Please complete your profile first',
      };
    }

    await connectDB();

    // Check if listing exists and belongs to user
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return {
        success: false,
        error: 'Listing not found',
      };
    }

    if (listing.sellerId.toString() !== session.user.id) {
      return {
        success: false,
        error: 'You can only update your own listings',
      };
    }

    // Extract update data
    const price = formData.get('price') as string;
    const description = formData.get('description') as string;
    const imageFiles = formData.getAll('images') as File[];

    const updates: any = {};

    // Update price if provided
    if (price) {
      const priceNum = parseInt(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return {
          success: false,
          error: 'Invalid price',
        };
      }
      updates.price = priceNum;
    }

    // Update description if provided
    if (description && description.trim()) {
      updates.description = description.trim();
    }

    // Update images if provided
    if (imageFiles.length > 0) {
      if (imageFiles.length > 10) {
        return {
          success: false,
          error: 'Maximum 10 images allowed',
        };
      }

      // Validate image files
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      for (const file of imageFiles) {
        if (!validImageTypes.includes(file.type)) {
          return {
            success: false,
            error: 'Only JPEG, PNG, and WebP images are allowed',
          };
        }

        if (file.size > maxSize) {
          return {
            success: false,
            error: 'Each image must be less than 5MB',
          };
        }
      }

      // Upload new images to GridFS
      const { uploadMultipleToGridFS } = await import('@/lib/gridfs');
      
      const imageBuffers = await Promise.all(
        imageFiles.map(async (file) => ({
          buffer: Buffer.from(await file.arrayBuffer()),
          filename: file.name,
          contentType: file.type,
        }))
      );

      const imageUrls = await uploadMultipleToGridFS(imageBuffers);
      updates.images = imageUrls;
    }

    // Update listing
    await Listing.findByIdAndUpdate(listingId, updates);

    return {
      success: true,
      message: 'Listing updated successfully',
    };
  } catch (error) {
    console.error('Error updating listing:', error);
    return {
      success: false,
      error: 'An error occurred while updating the listing',
    };
  }
}

/**
 * Mark a listing as sold
 * Only the owner can mark their listing as sold
 */
export async function markAsSold(listingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: 'You must be signed in to mark a listing as sold',
      };
    }

    if (!session.user.profileComplete) {
      return {
        success: false,
        error: 'Please complete your profile first',
      };
    }

    await connectDB();

    // Check if listing exists and belongs to user
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return {
        success: false,
        error: 'Listing not found',
      };
    }

    if (listing.sellerId.toString() !== session.user.id) {
      return {
        success: false,
        error: 'You can only mark your own listings as sold',
      };
    }

    // Update status to sold
    await Listing.findByIdAndUpdate(listingId, { status: 'sold' });

    return {
      success: true,
      message: 'Listing marked as sold',
    };
  } catch (error) {
    console.error('Error marking listing as sold:', error);
    return {
      success: false,
      error: 'An error occurred while marking the listing as sold',
    };
  }
}

/**
 * Delete a listing
 * Only the owner can delete their listing
 */
export async function deleteListing(listingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: 'You must be signed in to delete a listing',
      };
    }

    if (!session.user.profileComplete) {
      return {
        success: false,
        error: 'Please complete your profile first',
      };
    }

    await connectDB();

    // Check if listing exists and belongs to user
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return {
        success: false,
        error: 'Listing not found',
      };
    }

    if (listing.sellerId.toString() !== session.user.id) {
      return {
        success: false,
        error: 'You can only delete your own listings',
      };
    }

    // Delete listing
    await Listing.findByIdAndDelete(listingId);

    // Delete associated interests
    await Interest.deleteMany({ listingId });

    return {
      success: true,
      message: 'Listing deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting listing:', error);
    return {
      success: false,
      error: 'An error occurred while deleting the listing',
    };
  }
}
