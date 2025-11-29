'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { updateListing } from '@/app/actions/listings';

interface Listing {
  _id: string;
  brand: string;
  carModel: string;
  variant: string;
  price: number;
  images: string[];
  description: string;
  city: string;
  state: string;
}

interface EditListingModalProps {
  listing: Listing;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditListingModal({ listing, onClose, onSuccess }: EditListingModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    price: listing.price.toString(),
    description: listing.description,
  });

  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const invalidFiles = fileArray.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    // Validate file sizes (5MB max per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = fileArray.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setError('Each image must be less than 5MB');
      return;
    }

    // Limit to 10 images total
    if (fileArray.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    // Set new images
    setNewImages(fileArray);

    // Create previews
    const previews: string[] = [];
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === fileArray.length) {
          setNewImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });

    if (error) setError('');
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate price
    const price = parseInt(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }

    // Validate description
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Append form fields
      formDataToSend.append('price', formData.price);
      formDataToSend.append('description', formData.description);

      // Append new images if any
      newImages.forEach((image) => {
        formDataToSend.append('images', image);
      });

      const result = await updateListing(listing._id, formDataToSend);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to update listing');
      }
    } catch (err) {
      console.error('Error updating listing:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Edit Listing</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Car Info (Read-only) */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              {listing.brand} {listing.carModel} {listing.variant}
            </h3>
            <p className="text-gray-400 text-sm">
              {listing.city}, {listing.state}
            </p>
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
              Price (₹) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Current Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Images
            </label>
            <div className="grid grid-cols-3 gap-2">
              {listing.images.map((image, index) => (
                <div key={index} className="relative h-24 bg-gray-700 rounded-lg overflow-hidden">
                  <Image
                    src={image}
                    alt={`Current ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* New Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Replace Images (Optional)
            </label>
            
            <div className="space-y-4">
              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Choose New Images
                </button>
                <p className="text-xs text-gray-400 mt-1">
                  Max 10 images, 5MB each. New images will replace all current images.
                </p>
              </div>

              {/* New Image Previews */}
              {newImagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {newImagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="relative h-24 bg-gray-700 rounded-lg overflow-hidden">
                        <Image
                          src={preview}
                          alt={`New ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
