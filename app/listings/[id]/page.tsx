import { notFound } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import ImageCarousel from '@/app/components/ImageCarousel';
import InterestButton from '@/app/components/InterestButton';
import TailorTalkWidget from '@/app/components/TailorTalkWidget';
import { formatINR, maskOwnerName } from '@/lib/utils';

interface PageProps {
  params: {
    id: string;
  };
}

async function getListingDetails(id: string) {
  try {
    await connectDB();
    
    const listing = await Listing.findById(id)
      .populate('sellerId', 'fullName verified')
      .lean();

    if (!listing || listing.status !== 'approved') {
      return null;
    }

    // Convert to plain object and serialize
    const seller = listing.sellerId as any;
    return {
      _id: listing._id.toString(),
      images: listing.images,
      brand: listing.brand,
      model: listing.carModel,
      variant: listing.variant,
      fuelType: listing.fuelType,
      transmission: listing.transmission,
      yearOfOwnership: listing.yearOfOwnership,
      numberOfOwners: listing.numberOfOwners,
      kmDriven: listing.kmDriven,
      city: listing.city,
      state: listing.state,
      description: listing.description,
      price: listing.price,
      interestCount: listing.interestCount,
      seller: seller ? {
        fullName: seller.fullName,
        verified: seller.verified,
      } : null,
    };
  } catch (error) {
    console.error('Error fetching listing:', error);
    return null;
  }
}

export default async function ListingDetailPage({ params }: PageProps) {
  const listing = await getListingDetails(params.id);

  if (!listing) {
    notFound();
  }

  const carName = `${listing.brand} ${listing.model}`;
  const ownerName = listing.seller?.fullName ? maskOwnerName(listing.seller.fullName) : 'Owner';

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <a
          href="/buy-car"
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Listings
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images */}
          <div className="lg:col-span-2">
            <ImageCarousel images={listing.images} alt={carName} />
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{carName}</h1>
              <p className="text-gray-400 text-lg mb-4">{listing.variant}</p>
              <p className="text-4xl font-bold text-cyan-400">{formatINR(listing.price)}</p>
            </div>

            {/* Interest Button */}
            <InterestButton listingId={listing._id} initialCount={listing.interestCount} />

            {/* Owner Info */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Seller</p>
                  <p className="text-white font-medium">{ownerName}</p>
                </div>
                {listing.seller?.verified && (
                  <div className="flex items-center gap-1 text-cyan-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Verified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Specifications */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Key Specifications</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Year</span>
                  <span className="text-white font-medium">{listing.yearOfOwnership}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Kilometers</span>
                  <span className="text-white font-medium">{listing.kmDriven.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fuel Type</span>
                  <span className="text-white font-medium capitalize">{listing.fuelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Transmission</span>
                  <span className="text-white font-medium capitalize">{listing.transmission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Owners</span>
                  <span className="text-white font-medium">{listing.numberOfOwners}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Location</span>
                  <span className="text-white font-medium">{listing.city}, {listing.state}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Description</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
        </div>
      </div>

      {/* TailorTalk AI Assistant Widget */}
      <TailorTalkWidget />
    </div>
  );
}
