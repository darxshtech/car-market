import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import '@/lib/models/User';
import CarCard from './components/CarCard';
import TailorTalkWidget from './components/TailorTalkWidget';
import Locations from './components/Locations';
import Brands from './components/Brands';
import HeroSlider from './components/HeroSlider';
import User from '@/lib/models/User'; // Import User model for populate
import CarCard from './components/CarCard';
import TailorTalkWidget from './components/TailorTalkWidget';
import HeroSection from './components/HeroSection';
import FeaturedListings from './components/FeaturedListings';

async function getFeaturedListings() {
  try {
    await connectDB();

    // Fetch approved listings, limit to 8 for featured section
    const listings = await Listing.find({ status: 'approved' })
      .populate('sellerId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    // Convert MongoDB documents to plain objects and serialize
    return listings.map((listing: any) => ({
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
      seller: listing.sellerId ? {
        fullName: listing.sellerId.fullName,
      } : undefined,
    }));
  } catch (error) {
    console.error('Error fetching featured listings:', error);
    return [];
  }
}

export default async function Home() {
  const featuredListings = await getFeaturedListings();

  return (
    <div className="bg-gray-900 min-h-screen">
      {/* Hero Section with Background Slider */}
      <section className="relative bg-black py-20 px-4 sm:px-6 lg:px-8 min-h-[600px] overflow-hidden">
        {/* Background Slider */}
        <HeroSlider />
        
        {/* Content Overlay */}
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 animate-fade-in drop-shadow-lg">
            DriveSphere — India&apos;s Trusted Car Market
          </h1>
          <p className="text-xl sm:text-2xl text-cyan-400 mb-8 font-semibold drop-shadow-lg">
            Verified Users. Verified Cars.
          </p>
          <p className="text-gray-100 text-lg mb-12 max-w-2xl mx-auto drop-shadow-lg">
            Buy and sell cars with confidence. Every user is verified, every listing is approved by our team.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/buy-car"
              className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
            >
              <span className="relative z-10">Buy a Car</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            <Link
              href="/sell-car"
              className="group relative px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-lg border-2 border-cyan-500 hover:border-cyan-400 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
            >
              <span className="relative z-10">Sell Your Car</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <Locations />

      {/* Brands Section */}
      <Brands />

      {/* Featured Listings Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Featured Cars</h2>
              <p className="text-gray-400">Handpicked vehicles for you</p>
            </div>
            <Link
              href="/buy-car"
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-2 transition-colors"
            >
              View All
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Car Grid */}
          {featuredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredListings.map((listing) => (
                <CarCard key={listing._id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No featured listings available at the moment.</p>
              <p className="text-gray-500 mt-2">Check back soon for amazing deals!</p>
            </div>
          )}
        </div>
      </section>
      {/* Hero Section with Animations */}
      <HeroSection />

      {/* Featured Listings Section with Animations */}
      <FeaturedListings listings={featuredListings} />

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Why Choose DriveSphere?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Verified Users</h3>
              <p className="text-gray-400">Every user is verified with government ID for your safety</p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Approved Listings</h3>
              <p className="text-gray-400">All listings are reviewed and approved by our team</p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Assistance</h3>
              <p className="text-gray-400">Get instant help from our AI assistant anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* TailorTalk AI Assistant Widget */}
      <TailorTalkWidget />
    </div>
  );
}
