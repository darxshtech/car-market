'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { markAsSold, deleteListing } from '@/app/actions/listings';
import EditListingModal from '@/app/components/EditListingModal';

interface Listing {
  _id: string;
  brand: string;
  carModel: string;
  variant: string;
  price: number;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'sold';
  city: string;
  state: string;
  description: string;
  interestCount: number;
  createdAt: string;
}

export default function MyGaragePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    } else if (status === 'authenticated' && !session?.user?.profileComplete) {
      router.push('/complete-profile');
    }
  }, [status, session, router]);

  // Fetch user's listings
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.profileComplete) {
      fetchListings();
    }
  }, [status, session]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-listings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSold = async (listingId: string) => {
    if (!confirm('Are you sure you want to mark this listing as sold?')) {
      return;
    }

    try {
      const result = await markAsSold(listingId);
      
      if (result.success) {
        // Update local state
        setListings(prev =>
          prev.map(listing =>
            listing._id === listingId
              ? { ...listing, status: 'sold' as const }
              : listing
          )
        );
      } else {
        alert(result.error || 'Failed to mark as sold');
      }
    } catch (err) {
      console.error('Error marking as sold:', err);
      alert('An error occurred');
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(listingId);
      const result = await deleteListing(listingId);
      
      if (result.success) {
        // Remove from local state
        setListings(prev => prev.filter(listing => listing._id !== listingId));
      } else {
        alert(result.error || 'Failed to delete listing');
      }
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert('An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-900/50 text-yellow-200 border-yellow-500',
      approved: 'bg-green-900/50 text-green-200 border-green-500',
      rejected: 'bg-red-900/50 text-red-200 border-red-500',
      sold: 'bg-blue-900/50 text-blue-200 border-blue-500',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Garage</h1>
          <p className="text-gray-400">Manage your car listings</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">No listings yet</h2>
            <p className="text-gray-400 mb-6">Start by creating your first car listing</p>
            <button
              onClick={() => router.push('/sell-car')}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
            >
              List Your Car
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing._id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-500 transition-colors">
                {/* Image */}
                <div className="relative h-48 bg-gray-700">
                  {listing.images.length > 0 ? (
                    <Image
                      src={listing.images[0]}
                      alt={`${listing.brand} ${listing.carModel}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(listing.status)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {listing.brand} {listing.carModel}
                  </h3>
                  <p className="text-gray-400 text-sm mb-2">{listing.variant}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-cyan-400">
                      ₹{listing.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm text-gray-400">
                      {listing.interestCount} interested
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-4">
                    {listing.city}, {listing.state}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingListing(listing)}
                      disabled={listing.status === 'sold'}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    
                    {listing.status === 'approved' && (
                      <button
                        onClick={() => handleMarkAsSold(listing._id)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Mark Sold
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDelete(listing._id)}
                      disabled={deletingId === listing._id}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === listing._id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSuccess={() => {
            setEditingListing(null);
            fetchListings();
          }}
        />
      )}
    </div>
  );
}
