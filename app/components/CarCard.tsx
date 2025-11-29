import Link from 'next/link';
import Image from 'next/image';
import { formatINR, maskOwnerName } from '@/lib/utils';

interface CarCardProps {
  listing: {
    _id: string;
    images: string[];
    brand: string;
    model: string;
    variant?: string;
    price: number;
    city: string;
    yearOfOwnership: number;
    kmDriven: number;
    fuelType: string;
    transmission: string;
    description?: string;
    seller?: {
      fullName: string;
    };
  };
}

export default function CarCard({ listing }: CarCardProps) {
  const carName = `${listing.brand} ${listing.model}`;
  const imageUrl = listing.images[0] || '/placeholder-car.jpg';
  const ownerName = listing.seller?.fullName ? maskOwnerName(listing.seller.fullName) : 'Owner';

  return (
    <Link href={`/listings/${listing._id}`}>
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 cursor-pointer border border-gray-700 hover:border-cyan-500">
        {/* Image */}
        <div className="relative h-48 w-full bg-gray-700">
          <Image
            src={imageUrl}
            alt={carName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Car Name */}
          <h3 className="text-xl font-bold text-white mb-2 truncate">
            {carName}
          </h3>

          {/* Variant */}
          {listing.variant && (
            <p className="text-sm text-gray-400 mb-2">{listing.variant}</p>
          )}

          {/* Price */}
          <p className="text-2xl font-bold text-cyan-400 mb-3">
            {formatINR(listing.price)}
          </p>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div className="text-gray-400">
              <span className="text-gray-500">Year:</span> {listing.yearOfOwnership}
            </div>
            <div className="text-gray-400">
              <span className="text-gray-500">KM:</span> {listing.kmDriven.toLocaleString()}
            </div>
            <div className="text-gray-400">
              <span className="text-gray-500">Fuel:</span> {listing.fuelType}
            </div>
            <div className="text-gray-400">
              <span className="text-gray-500">Type:</span> {listing.transmission}
            </div>
          </div>

          {/* Location and Owner */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-700">
            <div className="flex items-center text-gray-400 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {listing.city}
            </div>
            <div className="text-gray-400 text-sm">
              {ownerName}
            </div>
          </div>

          {/* Description Preview */}
          {listing.description && (
            <p className="text-gray-500 text-sm mt-3 line-clamp-2">
              {listing.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
