'use server';

import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import Interest from '@/lib/models/Interest';

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: any;
}

/**
 * Mock ownership verification
 * In production, this would call an actual vehicle registration API
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

    // Validate inputs
    if (!registrationNumber || !ownerName) {
      return {
        success: false,
        error: 'Registration number and owner name are required',
      };
    }

    // Mock verification logic
    // In production, this would call an external API to verify vehicle ownership
    
    // Validate registration number format (Indian format: XX00XX0000)
    const regNumberPattern = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i;
    if (!regNumberPattern.test(registrationNumber.replace(/\s+/g, ''))) {
      return {
        success: false,
        error: 'Invalid registration number format. Expected format: XX00XX0000',
      };
    }

    // Mock: Simulate verification success if owner name has at least 2 words
    const nameParts = ownerName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return {
        success: false,
        error: 'Ownership verification failed. Please ensure the name matches the registration documents.',
      };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: 'Ownership verified successfully',
      data: {
        registrationNumber: registrationNumber.toUpperCase(),
        ownerName,
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

    // Extract form data
    const brand = formData.get('brand') as string;
    const model = formData.get('model') as string;
    const variant = formData.get('variant') as string;
    const fuelType = formData.get('fuelType') as string;
    const transmission = formData.get('transmission') as string;
    const kmDriven = formData.get('kmDriven') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const yearOfOwnership = formData.get('yearOfOwnership') as string;
    const numberOfOwners = formData.get('numberOfOwners') as string;

    // Validate required fields
    if (!brand || !model || !variant || !fuelType || !transmission || 
        !kmDriven || !city || !state || !description || !price || 
        !yearOfOwnership || !numberOfOwners) {
      return {
        success: false,
        error: 'All fields are required',
      };
    }

    // Validate numeric fields
    const kmDrivenNum = parseInt(kmDriven);
    const priceNum = parseInt(price);
    const yearNum = parseInt(yearOfOwnership);
    const ownersNum = parseInt(numberOfOwners);

    if (isNaN(kmDrivenNum) || kmDrivenNum < 0) {
      return {
        success: false,
        error: 'Invalid kilometers driven',
      };
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      return {
        success: false,
        error: 'Invalid price',
      };
    }

    const currentYear = new Date().getFullYear();
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
      return {
        success: false,
        error: `Year of ownership must be between 1900 and ${currentYear}`,
      };
    }

    if (isNaN(ownersNum) || ownersNum < 1 || ownersNum > 10) {
      return {
        success: false,
        error: 'Number of owners must be between 1 and 10',
      };
    }

    // Validate fuel type and transmission
    const validFuelTypes = ['petrol', 'diesel', 'cng', 'electric'];
    const validTransmissions = ['manual', 'automatic'];

    if (!validFuelTypes.includes(fuelType)) {
      return {
        success: false,
        error: 'Invalid fuel type',
      };
    }

    if (!validTransmissions.includes(transmission)) {
      return {
        success: false,
        error: 'Invalid transmission type',
      };
    }

    // Process images
    const imageFiles = formData.getAll('images') as File[];
    
    if (imageFiles.length === 0) {
      return {
        success: false,
        error: 'At least one image is required',
      };
    }

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
      brand,
      carModel: model,
      variant,
      fuelType,
      transmission,
      yearOfOwnership: yearNum,
      numberOfOwners: ownersNum,
      kmDriven: kmDrivenNum,
      city,
      state,
      description,
      price: priceNum,
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
