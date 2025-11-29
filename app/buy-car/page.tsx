import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import CarCard from '../components/CarCard';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import SortDropdown, { SortOption } from '../components/SortDropdown';
import TailorTalkWidget from '../components/TailorTalkWidget';

interface SearchParams {
  q?: string;
  brands?: string;
  cities?: string;
  fuel?: string;
  transmission?: string;
  priceMin?: string;
  priceMax?: string;
  yearMin?: string;
  yearMax?: string;
  sort?: SortOption;
  page?: string;
}

interface PageProps {
  searchParams: SearchParams;
}

const ITEMS_PER_PAGE = 12;

async function getListings(searchParams: SearchParams) {
  try {
    await connectDB();

    // Build filter query
    const filter: any = { status: 'approved' };

    // Search query
    if (searchParams.q) {
      filter.$or = [
        { brand: { $regex: searchParams.q, $options: 'i' } },
        { carModel: { $regex: searchParams.q, $options: 'i' } },
        { city: { $regex: searchParams.q, $options: 'i' } },
      ];
    }

    // Brand filter
    if (searchParams.brands) {
      filter.brand = { $in: searchParams.brands.split(',') };
    }

    // City filter
    if (searchParams.cities) {
      filter.city = { $in: searchParams.cities.split(',') };
    }

    // Fuel type filter
    if (searchParams.fuel) {
      filter.fuelType = { $in: searchParams.fuel.split(',') };
    }

    // Transmission filter
    if (searchParams.transmission) {
      filter.transmission = { $in: searchParams.transmission.split(',') };
    }

    // Price range filter
    if (searchParams.priceMin || searchParams.priceMax) {
      filter.price = {};
      if (searchParams.priceMin) {
        filter.price.$gte = parseInt(searchParams.priceMin);
      }
      if (searchParams.priceMax) {
        filter.price.$lte = parseInt(searchParams.priceMax);
      }
    }

    // Year range filter
    if (searchParams.yearMin || searchParams.yearMax) {
      filter.yearOfOwnership = {};
      if (searchParams.yearMin) {
        filter.yearOfOwnership.$gte = parseInt(searchParams.yearMin);
      }
      if (searchParams.yearMax) {
        filter.yearOfOwnership.$lte = parseInt(searchParams.yearMax);
      }
    }

    // Build sort query
    let sort: any = { createdAt: -1 }; // Default: newest first

    switch (searchParams.sort) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'year_desc':
        sort = { yearOfOwnership: -1 };
        break;
      case 'km_asc':
        sort = { kmDriven: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Pagination
    const page = parseInt(searchParams.page || '1');
    const skip = (page - 1) * ITEMS_PER_PAGE;

    // Get total count for pagination
    const totalCount = await Listing.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Fetch listings
    const listings = await Listing.find(filter)
      .populate('sellerId', 'fullName')
      .sort(sort)
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .lean();

    // Get unique brands and cities for filters
    const allListings = await Listing.find({ status: 'approved' }).lean();
    const brandSet = new Set(allListings.map((l: any) => l.brand));
    const citySet = new Set(allListings.map((l: any) => l.city));
    const brands = Array.from(brandSet).sort();
    const cities = Array.from(citySet).sort();

    // Convert to plain objects
    const serializedListings = listings.map((listing: any) => ({
      _id: listing._id.toString(),
      images: listing.images,
      brand: listing.brand,
      model: listing.carModel,
      variant: listing.variant,
      price: listing.price,
      city: listing.city,
      yearOfOwnership: listing.yearOfOwnership,
      kmDriven: listing.kmDriven,
      fuelType: listing.fuelType,
      transmission: listing.transmission,
      description: listing.description,
      seller: listing.sellerId
        ? {
            fullName: listing.sellerId.fullName,
          }
        : undefined,
    }));

    return {
      listings: serializedListings,
      brands,
      cities,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    console.error('Error fetching listings:', error);
    return {
      listings: [],
      brands: [],
      cities: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
}

export default async function BuyCarPage({ searchParams }: PageProps) {
  const { listings, brands, cities, pagination } = await getListings(searchParams);

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Buy a Car</h1>
          <p className="text-gray-400">
            Browse {pagination.totalCount} verified car{pagination.totalCount !== 1 ? 's' : ''} from trusted sellers
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterPanel brands={brands} cities={cities} />
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            {/* Sort and Results Count */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-400">
                Showing {listings.length} of {pagination.totalCount} results
              </p>
              <SortDropdown />
            </div>

            {/* Listings Grid */}
            {listings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {listings.map((listing) => (
                    <CarCard key={listing._id} listing={listing} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2">
                    {pagination.hasPrevPage && (
                      <a
                        href={`?${new URLSearchParams({
                          ...searchParams,
                          page: (pagination.currentPage - 1).toString(),
                        }).toString()}`}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Previous
                      </a>
                    )}

                    <span className="text-gray-400">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>

                    {pagination.hasNextPage && (
                      <a
                        href={`?${new URLSearchParams({
                          ...searchParams,
                          page: (pagination.currentPage + 1).toString(),
                        }).toString()}`}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                      >
                        Next
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-600 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">No cars found</h3>
                <p className="text-gray-400 mb-4">
                  Try adjusting your filters or search query
                </p>
                <a
                  href="/buy-car"
                  className="inline-block px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Clear Filters
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TailorTalk AI Assistant Widget */}
      <TailorTalkWidget />
    </div>
  );
}
