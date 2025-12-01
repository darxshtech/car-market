'use server';

import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import User from '@/lib/models/User';
import AdminLog from '@/lib/models/AdminLog';
import { extractMultipleCarData, extractSingleCarData, detectPageType, ScrapedCarData } from '@/lib/scraper';
import { extractWithPuppeteer } from '@/lib/scraper-enhanced';

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

    // Check if demo mode is requested
    if (url.toLowerCase().includes('demo') || url.toLowerCase().includes('test')) {
      // Demo mode uses extractMultipleCarData which has built-in demo support
      const multipleResult = await extractMultipleCarData(url);
      if (multipleResult.success && multipleResult.data && multipleResult.data.length > 0) {
        return {
          success: true,
          data: multipleResult.data,
          message: `Successfully scraped ${multipleResult.count} car listings`,
        };
      }
    }

    // Fetch HTML to detect page type
    let html: string;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        },
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        };
      }

      html = await response.text();
    } catch (fetchError) {
      console.error('Error fetching URL:', fetchError);
      return {
        success: false,
        error: fetchError instanceof Error && fetchError.name === 'AbortError'
          ? 'Request timed out after 15 seconds'
          : 'Failed to fetch the URL',
      };
    }

    // Parse HTML with cheerio for page type detection
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Detect page type
    const pageType = detectPageType(url, $);

    console.log(`Detected page type: ${pageType}`);

    // Route to appropriate extractor based on page type
    if (pageType === 'DETAIL_PAGE') {
      // Use enhanced Puppeteer scraper for detail pages to get ALL data
      console.log('Using enhanced Puppeteer scraper for comprehensive data extraction...');
      
      const enhancedResult = await extractWithPuppeteer(url);

      if (!enhancedResult.success || !enhancedResult.data) {
        // Fallback to regular scraper if Puppeteer fails
        console.log('Puppeteer failed, falling back to regular scraper...');
        const singleResult = await extractSingleCarData(url);

        if (!singleResult.success || !singleResult.data) {
          return {
            success: false,
            error: singleResult.error || 'Failed to scrape listing data',
          };
        }

        return {
          success: true,
          data: [singleResult.data], // Wrap in array for consistency
          message: 'Listing scraped successfully (basic data only)',
        };
      }

      return {
        success: true,
        data: [enhancedResult.data], // Wrap in array for consistency
        message: 'Listing scraped successfully with comprehensive data',
      };
    } else if (pageType === 'LISTING_PAGE') {
      // Use multiple car extraction for listing pages
      const multipleResult = await extractMultipleCarData(url);

      if (multipleResult.success && multipleResult.data && multipleResult.data.length > 0) {
        return {
          success: true,
          data: multipleResult.data,
          message: `Successfully scraped ${multipleResult.count} car listings`,
        };
      }

      return {
        success: false,
        error: multipleResult.error || 'Failed to scrape listing data',
      };
    } else {
      // Unknown page type - try enhanced scraper first
      console.log('Unknown page type, trying enhanced Puppeteer scraper first');

      // Try enhanced scraper first
      const enhancedResult = await extractWithPuppeteer(url);
      if (enhancedResult.success && enhancedResult.data) {
        return {
          success: true,
          data: [enhancedResult.data],
          message: 'Listing scraped successfully with comprehensive data',
        };
      }

      // Try single car extraction
      const singleResult = await extractSingleCarData(url);
      if (singleResult.success && singleResult.data) {
        return {
          success: true,
          data: [singleResult.data], // Wrap in array for consistency
          message: 'Listing scraped successfully (basic data only)',
        };
      }

      // Fallback to multiple car extraction
      const multipleResult = await extractMultipleCarData(url);
      if (multipleResult.success && multipleResult.data && multipleResult.data.length > 0) {
        return {
          success: true,
          data: multipleResult.data,
          message: `Successfully scraped ${multipleResult.count} car listings`,
        };
      }

      // All failed
      return {
        success: false,
        error: enhancedResult.error || singleResult.error || multipleResult.error || 'Failed to scrape listing data. The page structure may not be supported.',
      };
    }
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
    
    console.log('Import session:', session);
    console.log('Scraped data count:', scrapedData.length);
    
    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || session.user.email !== adminEmail) {
      console.error('Unauthorized import attempt:', session?.user?.email);
      return {
        success: false,
        error: 'Unauthorized - Admin access required',
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
      console.log('Creating admin user for scraped listings');
      try {
        adminUser = await User.create({
          googleId: 'admin-scraped',
          email: adminEmail,
          fullName: 'Admin Scraped',
          mobileNumber: '0000000000',
          documentType: 'pan',
          documentNumber: 'ADMIN00000',
          verified: true,
          banned: false,
        });
        console.log('Admin user created:', adminUser._id);
      } catch (userError) {
        console.error('Failed to create admin user:', userError);
        return {
          success: false,
          error: `Failed to create admin user: ${userError instanceof Error ? userError.message : 'Unknown error'}`,
        };
      }
    } else {
      console.log('Using existing admin user:', adminUser._id);
    }

    // Import each scraped listing
    const importedListings = [];
    const errors = [];
    
    for (const data of scrapedData) {
      try {
        console.log('Processing scraped data:', {
          carName: data.carName,
          model: data.model,
          price: data.price,
          imageCount: data.images?.length || 0
        });

        // Validate required fields
        if (!data.carName || !data.model) {
          const error = `Skipped: Missing car name or model`;
          console.error(error);
          errors.push(error);
          continue;
        }

        if (!data.price || data.price <= 0) {
          const error = `Skipped ${data.carName}: Invalid price (${data.price})`;
          console.error(error);
          errors.push(error);
          continue;
        }

        if (!data.images || data.images.length === 0) {
          const error = `Skipped ${data.carName}: No images`;
          console.error(error);
          errors.push(error);
          continue;
        }

        // Map fuel type from scraped data
        let fuelType: 'petrol' | 'diesel' | 'cng' | 'electric' = 'petrol';
        if (data.fuelType) {
          const fuelLower = data.fuelType.toLowerCase();
          if (fuelLower.includes('diesel')) fuelType = 'diesel';
          else if (fuelLower.includes('cng')) fuelType = 'cng';
          else if (fuelLower.includes('electric')) fuelType = 'electric';
        }

        // Map transmission from scraped data
        let transmission: 'manual' | 'automatic' = 'manual';
        if (data.transmission) {
          const transLower = data.transmission.toLowerCase();
          if (transLower.includes('automatic') || transLower.includes('amt') || 
              transLower.includes('cvt') || transLower.includes('dct')) {
            transmission = 'automatic';
          }
        }

        const listing = await Listing.create({
          sellerId: adminUser._id,
          brand: data.carName.split(' ')[0] || 'Unknown',
          carModel: data.model,
          variant: data.variant || 'Standard',
          fuelType,
          transmission,
          yearOfOwnership: data.yearOfPurchase || new Date().getFullYear(),
          numberOfOwners: data.numberOfOwners || 1,
          kmDriven: data.kmDriven || 0,
          city: data.city || 'Unknown',
          state: 'Unknown', // Would need to be extracted or mapped
          description: data.description || `Imported listing: ${data.carName} ${data.model}`,
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
        console.error('Failed data:', JSON.stringify(data, null, 2));
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : '';
        console.error('Error stack:', errorStack);
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
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Full error stack:', errorStack);
    return {
      success: false,
      error: `An error occurred while importing listings: ${errorMsg}`,
    };
  }
}
