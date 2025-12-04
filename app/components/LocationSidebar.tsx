'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface LocationSidebarProps {
    locations: { _id: string; count: number }[];
}

export default function LocationSidebar({ locations }: LocationSidebarProps) {
    const searchParams = useSearchParams();
    const currentCity = searchParams.get('city');

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 sticky top-24">
            <h3 className="text-xl font-semibold text-white mb-4">Locations</h3>
            <div className="space-y-2">
                <Link
                    href="/locations"
                    className={`block px-4 py-2 rounded-lg transition-colors ${!currentCity
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                >
                    All Locations
                </Link>
                {locations.map((location) => (
                    <Link
                        key={location._id}
                        href={`/locations?city=${encodeURIComponent(location._id)}`}
                        className={`flex justify-between items-center px-4 py-2 rounded-lg transition-colors ${currentCity === location._id
                            ? 'bg-cyan-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <span>{location._id}</span>
                        {currentCity === location._id && (
                            <span className="text-sm text-cyan-100">
                                {location.count}
                            </span>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
