'use server';

import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import User from '@/lib/models/User';
import AdminLog from '@/lib/models/AdminLog';
import { extractCarData, ScrapedCarData } from '@/lib/scraper';

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
 * Scrape a car listing from an external URL
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

    // Extract car data from URL
    const result = await extractCarData(url);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to scrape listing data',
      };
    }

    return {
      success: true,
      data: result.data,
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
    for (const data of scrapedData) {
      try {
        const listing = await Listing.create({
          sellerId: adminUser._id,
          brand: data.carName.split(' ')[0] || 'Unknown',
          carModel: data.model,
          variant: 'Standard',
          fuelType: 'petrol', // Default, would need to be extracted
          transmission: 'manual', // Default, would need to be extracted
          yearOfOwnership: data.yearOfPurchase,
          numberOfOwners: data.numberOfOwners,
          kmDriven: data.kmDriven,
          city: data.city,
          state: 'Unknown', // Would need to be extracted or mapped
          description: `Imported listing: ${data.carName} ${data.model}`,
          price: data.price,
          images: data.images,
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
        // Continue with other listings
      }
    }

    return {
      success: true,
      message: `Successfully imported ${importedListings.length} listing(s)`,
      data: {
        count: importedListings.length,
        listings: importedListings,
      },
    };
  } catch (error) {
    console.error('Error importing scraped listings:', error);
    return {
      success: false,
      error: 'An error occurred while importing listings',
    };
  }
}
