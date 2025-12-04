'use server';

import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import User from '@/lib/models/User';
import AdminLog from '@/lib/models/AdminLog';
import { extractCarData, extractMultipleCarData, ScrapedCarData } from '@/lib/scraper';

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: any;
}

/**
 * Approve a listing
 * Only admin can approve listings
 */
export async function approveListing(listingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || session.user.email !== adminEmail) {
      return {
        success: false,
        error: 'Unauthorized',
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

    // Update status to approved
    await Listing.findByIdAndUpdate(listingId, { status: 'approved' });

    // Log admin action
    await AdminLog.create({
      action: 'approve_listing',
      targetId: listingId,
      targetType: 'listing',
      details: {
        listingBrand: listing.brand,
        listingModel: listing.carModel,
        adminEmail: session.user.email,
      },
    });

    return {
      success: true,
      message: 'Listing approved successfully',
    };
  } catch (error) {
    console.error('Error approving listing:', error);
    return {
      success: false,
      error: 'An error occurred while approving the listing',
    };
  }
}

/**
 * Reject a listing
 * Only admin can reject listings
 */
export async function rejectListing(listingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || session.user.email !== adminEmail) {
      return {
        success: false,
        error: 'Unauthorized',
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

    // Update status to rejected
    await Listing.findByIdAndUpdate(listingId, { status: 'rejected' });

    // Log admin action
    await AdminLog.create({
      action: 'reject_listing',
      targetId: listingId,
      targetType: 'listing',
      details: {
        listingBrand: listing.brand,
        listingModel: listing.carModel,
        adminEmail: session.user.email,
      },
    });

    return {
      success: true,
      message: 'Listing rejected successfully',
    };
  } catch (error) {
    console.error('Error rejecting listing:', error);
    return {
      success: false,
      error: 'An error occurred while rejecting the listing',
    };
  }
}

/**
 * Ban a user
 * Only admin can ban users
 */
export async function banUser(userId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || session.user.email !== adminEmail) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    await connectDB();

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Prevent admin from banning themselves
    if (user.email === adminEmail) {
      return {
        success: false,
        error: 'You cannot ban yourself',
      };
    }

    // Toggle banned status
    const newBannedStatus = !user.banned;
    await User.findByIdAndUpdate(userId, { banned: newBannedStatus });

    // Log admin action
    await AdminLog.create({
      action: newBannedStatus ? 'ban_user' : 'unban_user',
      targetId: userId,
      targetType: 'user',
      details: {
        userEmail: user.email,
        userName: user.fullName,
        adminEmail: session.user.email,
      },
    });

    return {
      success: true,
      message: newBannedStatus ? 'User banned successfully' : 'User unbanned successfully',
      data: {
        banned: newBannedStatus,
      },
    };
  } catch (error) {
    console.error('Error banning user:', error);
    return {
      success: false,
      error: 'An error occurred while updating user status',
    };
  }
}


/**
 * Scrape car listings from an external URL
 * Supports both single car pages and listing pages with multiple cars
 * Only admin can scrape listings
 */
export async function scrapeListing(url: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || session.user.email !== adminEmail) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Validate URL
    if (!url || typeof url !== 'string') {
      return {
        success: false,
        error: 'Invalid URL provided',
      };
    }

    // Try to extract multiple cars first (for listing pages)
    const multipleResult = await extractMultipleCarData(url);

    if (multipleResult.success && multipleResult.data && multipleResult.data.length > 0) {
      return {
        success: true,
        data: multipleResult.data,
        message: `Successfully scraped ${multipleResult.count} car listings`,
      };
    }

    // Fallback to single car extraction
    const singleResult = await extractCarData(url);

    if (!singleResult.success || !singleResult.data) {
      return {
        success: false,
        error: singleResult.error || 'Failed to scrape listing data',
      };
    }

    return {
      success: true,
      data: [singleResult.data], // Wrap in array for consistency
      message: 'Listing scraped successfully',
    };
  } catch (error) {
    console.error('Error scraping listing:', error);
    return {
      success: false,
      error: 'An error occurred while scraping the listing',
    };
  }
}

/**
 * Import scraped listings into the database
 * Only admin can import scraped listings
 */
export async function importScrapedListings(
  scrapedData: ScrapedCarData[]
): Promise<ActionResult> {
  try {
    const session = await getServerSession();

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || session.user.email !== adminEmail) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (!Array.isArray(scrapedData) || scrapedData.length === 0) {
      return {
        success: false,
        error: 'No data provided for import',
      };
    }

    await connectDB();

    // Create a default admin user as seller if not exists
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        googleId: 'admin-scraped',
        email: adminEmail,
        fullName: 'Admin (Scraped)',
        mobileNumber: '0000000000',
        documentType: 'pan',
        documentNumber: 'ADMIN00000',
        verified: true,
        banned: false,
      });
    }

    // Import each scraped listing
    const importedListings = [];
    const errors = [];

    for (const data of scrapedData) {
      try {
        // Validate required fields
        if (!data.carName || !data.model) {
          errors.push(`Skipped: Missing car name or model`);
          continue;
        }

        if (!data.price || data.price <= 0) {
          errors.push(`Skipped ${data.carName}: Invalid price`);
          continue;
        }

        if (!data.images || data.images.length === 0) {
          errors.push(`Skipped ${data.carName}: No images`);
          continue;
        }

        const listing = await Listing.create({
          sellerId: adminUser._id,
          brand: data.carName.split(' ')[0] || 'Unknown',
          carModel: data.model,
          variant: 'Standard',
          fuelType: 'petrol', // Default, would need to be extracted
          transmission: 'manual', // Default, would need to be extracted
          yearOfOwnership: data.yearOfPurchase || new Date().getFullYear(),
          numberOfOwners: data.numberOfOwners || 1,
          kmDriven: data.kmDriven || 0,
          city: data.city || 'Unknown',
          state: 'Unknown', // Would need to be extracted or mapped
          description: `Imported listing: ${data.carName} ${data.model}`,
          price: data.price,
          images: data.images.slice(0, 10), // Limit to 10 images
          status: 'approved', // Scraped listings are auto-approved
          interestCount: 0,
          source: 'scraped',
        });

        importedListings.push(listing);

        // Log admin action
        await AdminLog.create({
          action: 'import_scraped',
          targetId: listing._id,
          targetType: 'listing',
          details: {
            carName: data.carName,
            model: data.model,
            price: data.price,
            adminEmail: session.user.email,
          },
        });
      } catch (error) {
        console.error('Error importing listing:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to import ${data.carName}: ${errorMsg}`);
        // Continue with other listings
      }
    }

    if (importedListings.length === 0 && errors.length > 0) {
      return {
        success: false,
        error: `Failed to import any listings. Errors: ${errors.join(', ')}`,
      };
    }

    const message = importedListings.length > 0
      ? `Successfully imported ${importedListings.length} listing(s)${errors.length > 0 ? `. Errors: ${errors.join(', ')}` : ''}`
      : 'No listings were imported';

    return {
      success: importedListings.length > 0,
      message,
      data: {
        count: importedListings.length,
        listings: importedListings,
        errors,
      },
    };
  } catch (error) {
    console.error('Error importing scraped listings:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `An error occurred while importing listings: ${errorMsg}`,
    };
  }
}

/**
 * Delete a listing
 * Only admin can delete listings
 */
export async function deleteListing(listingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || session.user.email !== adminEmail) {
      return {
        success: false,
        error: 'Unauthorized',
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

    // Delete listing
    await Listing.findByIdAndDelete(listingId);

    // Log admin action
    await AdminLog.create({
      action: 'delete_listing',
      targetId: listingId,
      targetType: 'listing',
      details: {
        listingBrand: listing.brand,
        listingModel: listing.carModel,
        adminEmail: session.user.email,
      },
    });

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

/**
 * Update listing status (Activate/Deactivate)
 * Only admin can update listing status
 */
export async function updateListingStatus(listingId: string, status: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || session.user.email !== adminEmail) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    await connectDB();

    // Validate status
    const validStatuses = ['active', 'inactive', 'approved', 'rejected', 'sold'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: 'Invalid status',
      };
    }

    // Check if listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return {
        success: false,
        error: 'Listing not found',
      };
    }

    // Update status
    await Listing.findByIdAndUpdate(listingId, { status });

    // Log admin action
    await AdminLog.create({
      action: 'update_listing_status',
      targetId: listingId,
      targetType: 'listing',
      details: {
        listingBrand: listing.brand,
        listingModel: listing.carModel,
        oldStatus: listing.status,
        newStatus: status,
        adminEmail: session.user.email,
      },
    });

    return {
      success: true,
      message: `Listing status updated to ${status}`,
    };
  } catch (error) {
    console.error('Error updating listing status:', error);
    return {
      success: false,
      error: 'An error occurred while updating the listing status',
    };
  }
}
