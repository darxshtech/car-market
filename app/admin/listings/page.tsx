'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { deleteListing, updateListingStatus } from '@/app/actions/admin';
import EditListingModal from '@/app/components/EditListingModal';

interface Listing {
  _id: string;
  brand: string;
  carModel: string;
  variant: string;
  price: number;
  images: string[];
  status: string;
  city: string;
  state: string;
  description: string;
  sellerId: {
    _id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  fuelType?: string;
  transmission?: string;
  yearOfOwnership?: number;
  numberOfOwners?: number;
  kmDriven?: number;
}

export default function AdminListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/listings');

      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingId(listingId);
      const result = await deleteListing(listingId);

      if (result.success) {
        setListings(prev => prev.filter(listing => listing._id !== listingId));
      } else {
        alert(result.error || 'Failed to delete listing');
      }
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusUpdate = async (listingId: string, newStatus: string) => {
    try {
      setProcessingId(listingId);
      const result = await updateListingStatus(listingId, newStatus);

      if (result.success) {
        setListings(prev => prev.map(listing =>
          listing._id === listingId
            ? { ...listing, status: newStatus }
            : listing
        ));
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEditSave = (updatedListing: any) => {
    setListings(prev => prev.map(listing =>
      listing._id === updatedListing._id
        ? { ...listing, ...updatedListing }
        : listing
    ));
    setEditingListing(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Manage Listings</h1>
            <p className="text-gray-400">View and manage all car listings</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">No listings found</h2>
            <p className="text-gray-400">There are no listings in the system.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {listings.map((listing) => (
              <div key={listing._id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="md:flex">
                  {/* Image */}
                  <div className="md:w-1/4">
                    <div className="relative h-48 md:h-full bg-gray-700">
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
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${listing.status === 'active' || listing.status === 'approved' ? 'bg-green-500 text-white' :
                            listing.status === 'inactive' ? 'bg-gray-500 text-white' :
                              listing.status === 'rejected' ? 'bg-red-500 text-white' :
                                listing.status === 'sold' ? 'bg-blue-500 text-white' :
                                  'bg-yellow-500 text-black'
                          }`}>
                          {listing.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="md:w-3/4 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {listing.brand} {listing.carModel}
                        </h3>
                        <p className="text-gray-400 text-sm">{listing.variant} • {listing.yearOfOwnership}</p>
                      </div>
                      <span className="text-xl font-bold text-cyan-400">
                        ₹{listing.price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Location</p>
                        <p className="text-gray-300 text-sm">{listing.city}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Seller</p>
                        <p className="text-gray-300 text-sm truncate" title={listing.sellerId?.email}>
                          {listing.sellerId?.fullName || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Date</p>
                        <p className="text-gray-300 text-sm">
                          {new Date(listing.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase">ID</p>
                        <p className="text-gray-300 text-sm truncate" title={listing._id}>
                          ...{listing._id.slice(-6)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => setEditingListing(listing)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                      >
                        Edit
                      </button>

                      {listing.status === 'active' || listing.status === 'approved' ? (
                        <button
                          onClick={() => handleStatusUpdate(listing._id, 'inactive')}
                          disabled={processingId === listing._id}
                          className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusUpdate(listing._id, 'active')}
                          disabled={processingId === listing._id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(listing._id)}
                        disabled={processingId === listing._id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingListing && (
          <EditListingModal
            listing={editingListing}
            onClose={() => setEditingListing(null)}
            onSave={handleEditSave}
          />
        )}
      </div>
    </div>
  );
}
