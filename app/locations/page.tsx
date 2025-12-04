import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import LocationSidebar from '@/app/components/LocationSidebar';
import CarCard from '@/app/components/CarCard';
import Link from 'next/link';

interface PageProps {
    searchParams: {
        city?: string;
    };
}

const cityImages: { [key: string]: string } = {
    'Mumbai': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=800&auto=format&fit=crop',
    'Delhi NCR': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=800&auto=format&fit=crop',
    'Bangalore': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=800&auto=format&fit=crop',
    'Hyderabad': 'https://images.unsplash.com/photo-1572445271230-a78b5944a659?q=80&w=800&auto=format&fit=crop',
    'Pune': 'https://images.unsplash.com/photo-1569317002804-ab77bcf1bce4?q=80&w=800&auto=format&fit=crop',
    'Chennai': 'https://images.unsplash.com/photo-1582510003544-524378ae365d?q=80&w=800&auto=format&fit=crop',
    'Kolkata': 'https://images.unsplash.com/photo-1535999852114-dbef3d633271?q=80&w=800&auto=format&fit=crop',
    'Ahmedabad': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=800&auto=format&fit=crop',
};

const defaultImage = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=800&auto=format&fit=crop';

const POPULAR_CITIES = ['Pune', 'Mumbai', 'Bangalore', 'Hyderabad', 'Delhi NCR', 'Chennai', 'Kolkata', 'Ahmedabad'];

async function getLocations() {
    await connectDB();
    const dbLocations = await Listing.aggregate([
        { $match: { status: 'approved' } },
        {
            $group: {
                _id: '$city',
                count: { $sum: 1 },
            },
        },
    ]);

    // Create a map of locations from DB
    const locationMap = new Map(dbLocations.map((l: any) => [l._id, l.count]));

    // Ensure popular cities are present
    POPULAR_CITIES.forEach(city => {
        if (!locationMap.has(city)) {
            locationMap.set(city, 0);
        }
    });

    // Convert back to array and sort by count (desc) then name (asc)
    return Array.from(locationMap.entries())
        .map(([city, count]) => ({ _id: city, count }))
        .sort((a, b) => b.count - a.count || a._id.localeCompare(b._id));
}

async function getListingsByCity(city: string) {
    await connectDB();
    const listings = await Listing.find({ status: 'approved', city })
        .populate('sellerId', 'fullName')
        .sort({ createdAt: -1 })
        .lean();

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
}

export default async function LocationsPage({ searchParams }: PageProps) {
    const locations = await getLocations();
    const selectedCity = searchParams.city;
    const listings = selectedCity ? await getListingsByCity(selectedCity) : [];

    return (
        <div className="min-h-screen bg-gray-900 py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                        {selectedCity ? `${selectedCity} Cars` : 'All Locations'}
                    </h1>
                    <p className="text-gray-400 text-lg">
                        {selectedCity
                            ? `Browse available cars in ${selectedCity}`
                            : 'Find cars in your city'}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <LocationSidebar locations={locations} />
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {selectedCity ? (
                            // Show Listings for Selected City
                            <div>
                                {listings.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {listings.map((listing) => (
                                            <CarCard key={listing._id} listing={listing} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                                        <p className="text-gray-400 text-lg">No cars found in {selectedCity}.</p>
                                        <Link href="/locations" className="text-cyan-400 hover:text-cyan-300 mt-2 inline-block">
                                            View all locations
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Show All Locations Grid
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {locations.map((location, index) => (
                                    <Link key={location._id} href={`/locations?city=${encodeURIComponent(location._id)}`}>
                                        <div className="group relative h-64 rounded-xl overflow-hidden cursor-pointer shadow-lg border border-gray-700 hover:border-cyan-500 transition-all duration-300">
                                            {/* Background Image */}
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                                style={{ backgroundImage: `url(${cityImages[location._id] || defaultImage})` }}
                                            />

                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                                            {/* Content */}
                                            <div className="absolute inset-0 flex flex-col justify-end p-6">
                                                <h3 className="text-xl font-bold text-white mb-1 transform translate-y-0 transition-transform duration-300">
                                                    {location._id}
                                                </h3>
                                                <p className="text-cyan-400 font-medium opacity-100 transition-opacity duration-300">
                                                    {location.count} Cars Available
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
