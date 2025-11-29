'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createListing } from '@/app/actions/listings';
import Image from 'next/image';

interface CarListingFormProps {
  registrationNumber: string;
  onBack: () => void;
}

export default function CarListingForm({ registrationNumber, onBack }: CarListingFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    variant: '',
    fuelType: 'petrol' as 'petrol' | 'diesel' | 'cng' | 'electric',
    transmission: 'manual' as 'manual' | 'automatic',
    kmDriven: '',
    city: '',
    state: '',
    description: '',
    price: '',
    yearOfOwnership: '',
    numberOfOwners: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
    if (images.length + fileArray.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    // Add new images
    setImages(prev => [...prev, ...fileArray]);

    // Create previews
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (error) setError('');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    // Check required fields
    if (!formData.brand.trim()) {
      setError('Brand is required');
      return false;
    }
    if (!formData.model.trim()) {
      setError('Model is required');
      return false;
    }
    if (!formData.variant.trim()) {
      setError('Variant is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.state.trim()) {
      setError('State is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }

    // Validate numeric fields
    const kmDriven = parseInt(formData.kmDriven);
    if (isNaN(kmDriven) || kmDriven < 0) {
      setError('Please enter a valid kilometers driven');
      return false;
    }

    const price = parseInt(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return false;
    }

    const yearOfOwnership = parseInt(formData.yearOfOwnership);
    const currentYear = new Date().getFullYear();
    if (isNaN(yearOfOwnership) || yearOfOwnership < 1900 || yearOfOwnership > currentYear) {
      setError(`Year of ownership must be between 1900 and ${currentYear}`);
      return false;
    }

    const numberOfOwners = parseInt(formData.numberOfOwners);
    if (isNaN(numberOfOwners) || numberOfOwners < 1 || numberOfOwners > 10) {
      setError('Number of owners must be between 1 and 10');
      return false;
    }

    // Validate images
    if (images.length === 0) {
      setError('Please upload at least one image');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Append all form fields
      formDataToSend.append('brand', formData.brand);
      formDataToSend.append('model', formData.model);
      formDataToSend.append('variant', formData.variant);
      formDataToSend.append('fuelType', formData.fuelType);
      formDataToSend.append('transmission', formData.transmission);
      formDataToSend.append('kmDriven', formData.kmDriven);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('state', formData.state);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('yearOfOwnership', formData.yearOfOwnership);
      formDataToSend.append('numberOfOwners', formData.numberOfOwners);

      // Append images
      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      const result = await createListing(formDataToSend);

      if (result.success) {
        setSuccess(true);
        // Redirect to My Garage after 2 seconds
        setTimeout(() => {
          router.push('/my-garage');
        }, 2000);
      } else {
        setError(result.error || 'Failed to create listing');
      }
    } catch (err) {
      console.error('Error creating listing:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 mb-4">
            <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Listing Submitted!</h2>
          <p className="text-gray-400 mb-4">
            Your car listing has been submitted for admin approval. You&apos;ll be notified once it&apos;s reviewed.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to My Garage...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">List Your Car</h2>
        <button
          onClick={onBack}
          className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
        >
          ← Back to verification
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Car Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Car Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brand */}
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-300 mb-2">
                Brand *
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g., Maruti Suzuki, Hyundai"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Model */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-2">
                Model *
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g., Swift, i20"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Variant */}
            <div>
              <label htmlFor="variant" className="block text-sm font-medium text-gray-300 mb-2">
                Variant *
              </label>
              <input
                type="text"
                id="variant"
                name="variant"
                value={formData.variant}
                onChange={handleChange}
                placeholder="e.g., VXI, Sportz"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Fuel Type */}
            <div>
              <label htmlFor="fuelType" className="block text-sm font-medium text-gray-300 mb-2">
                Fuel Type *
              </label>
              <select
                id="fuelType"
                name="fuelType"
                value={formData.fuelType}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="cng">CNG</option>
                <option value="electric">Electric</option>
              </select>
            </div>

            {/* Transmission */}
            <div>
              <label htmlFor="transmission" className="block text-sm font-medium text-gray-300 mb-2">
                Transmission *
              </label>
              <select
                id="transmission"
                name="transmission"
                value={formData.transmission}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>

            {/* Year of Ownership */}
            <div>
              <label htmlFor="yearOfOwnership" className="block text-sm font-medium text-gray-300 mb-2">
                Year of First Ownership *
              </label>
              <input
                type="number"
                id="yearOfOwnership"
                name="yearOfOwnership"
                value={formData.yearOfOwnership}
                onChange={handleChange}
                placeholder="e.g., 2018"
                required
                min="1900"
                max={new Date().getFullYear()}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Number of Owners */}
            <div>
              <label htmlFor="numberOfOwners" className="block text-sm font-medium text-gray-300 mb-2">
                Number of Owners *
              </label>
              <input
                type="number"
                id="numberOfOwners"
                name="numberOfOwners"
                value={formData.numberOfOwners}
                onChange={handleChange}
                placeholder="e.g., 1"
                required
                min="1"
                max="10"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Kilometers Driven */}
            <div>
              <label htmlFor="kmDriven" className="block text-sm font-medium text-gray-300 mb-2">
                Kilometers Driven *
              </label>
              <input
                type="number"
                id="kmDriven"
                name="kmDriven"
                value={formData.kmDriven}
                onChange={handleChange}
                placeholder="e.g., 45000"
                required
                min="0"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Location</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
                City *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Mumbai"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-2">
                State *
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g., Maharashtra"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>
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
            placeholder="Describe your car's condition, features, service history, etc."
            required
            rows={4}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
          />
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
            placeholder="e.g., 500000"
            required
            min="1"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Car Images * (Max 10 images, 5MB each)
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
                disabled={images.length >= 10}
                className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {images.length >= 10 ? 'Maximum images reached' : 'Choose Images'}
              </button>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-full h-32 bg-gray-700 rounded-lg overflow-hidden">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Listing'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
