'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { approveListing, rejectListing } from '@/app/actions/admin';

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
}

export default function AdminListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingListings();
  }, []);

  const fetchPendingListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pending-listings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load pending listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listingId: string) => {
    if (!confirm('Are you sure you want to approve this listing?')) {
      return;
    }

    try {
      setProcessingId(listingId);
      const result = await approveListing(listingId);
      
      if (result.success) {
        // Remove from list
        setListings(prev => prev.filter(listing => listing._id !== listingId));
      } else {
        alert(result.error || 'Failed to approve listing');
      }
    } catch (err) {
      console.error('Error approving listing:', err);
      alert('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (listingId: string) => {
    if (!confirm('Are you sure you want to reject this listing?')) {
      return;
    }

    try {
      setProcessingId(listingId);
      const result = await rejectListing(listingId);
      
      if (result.success) {
        // Remove from list
        setListings(prev => prev.filter(listing => listing._id !== listingId));
      } else {
        alert(result.error || 'Failed to reject listing');
      }
    } catch (err) {
      console.error('Error rejecting listing:', err);
      alert('An error occurred');
    } finally {
      setProcessingId(null);
    }
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
            <h1 className="text-4xl font-bold text-white mb-2">Pending Listings</h1>
            <p className="text-gray-400">Review and approve car listings</p>
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
            <h2 className="text-2xl font-bold text-white mb-2">No pending listings</h2>
            <p className="text-gray-400">All listings have been reviewed</p>
          </div>
        ) : (
          <div className="space-y-6">
            {listings.map((listing) => (
              <div key={listing._id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="md:flex">
                  {/* Image */}
                  <div className="md:w-1/3">
                    <div className="relative h-64 md:h-full bg-gray-700">
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
                    </div>
                  </div>

                  {/* Content */}
                  <div className="md:w-2/3 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">
                          {listing.brand} {listing.carModel}
                        </h3>
                        <p className="text-gray-400">{listing.variant}</p>
                      </div>
                      <span className="text-2xl font-bold text-cyan-400">
                        ₹{listing.price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">Location</p>
                        <p className="text-white">{listing.city}, {listing.state}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Seller</p>
                        <p className="text-white">{listing.sellerId.fullName}</p>
                        <p className="text-gray-400 text-xs">{listing.sellerId.email}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-1">Description</p>
                      <p className="text-white text-sm">{listing.description}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-1">Submitted</p>
                      <p className="text-white text-sm">
                        {new Date(listing.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(listing._id)}
                        disabled={processingId === listing._id}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === listing._id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(listing._id)}
                        disabled={processingId === listing._id}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === listing._id ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
