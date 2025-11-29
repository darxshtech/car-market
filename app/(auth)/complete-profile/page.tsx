'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { completeProfile, ProfileFormData } from '@/app/actions/auth';

export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    email: '',
    mobileNumber: '',
    documentType: 'aadhaar',
    documentNumber: '',
  });

  // Prefill email from Google OAuth
  useEffect(() => {
    if (session?.user?.email) {
      setFormData(prev => ({
        ...prev,
        email: session.user.email,
      }));
    }
  }, [session]);

  // Redirect if profile is already complete
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.profileComplete) {
      router.push('/');
    }
  }, [status, session, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleDocumentTypeChange = (type: 'aadhaar' | 'pan') => {
    setFormData(prev => ({
      ...prev,
      documentType: type,
      documentNumber: '', // Clear document number when type changes
    }));
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }

    if (!formData.mobileNumber.trim()) {
      setError('Mobile number is required');
      return false;
    }

    if (!/^\d{10}$/.test(formData.mobileNumber)) {
      setError('Mobile number must be 10 digits');
      return false;
    }

    if (!formData.documentNumber.trim()) {
      setError('Document number is required');
      return false;
    }

    if (formData.documentType === 'aadhaar') {
      if (!/^\d{12}$/.test(formData.documentNumber)) {
        setError('Aadhaar number must be 12 digits');
        return false;
      }
    } else if (formData.documentType === 'pan') {
      if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(formData.documentNumber)) {
        setError('PAN number must be in format: ABCDE1234F');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await completeProfile(formData);

      if (result.success) {
        // Update the session to reflect profile completion
        await update();
        // Redirect to home page
        router.push('/');
      } else {
        setError(result.error || 'Failed to complete profile');
      }
    } catch (err) {
      console.error('Profile completion error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">Complete Your Profile</h1>
          <p className="text-gray-300 text-sm">
            We need a few more details to verify your identity
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email from your Google account</p>
          </div>

          {/* Mobile Number */}
          <div>
            <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-300 mb-2">
              Mobile Number *
            </label>
            <input
              type="tel"
              id="mobileNumber"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              required
              maxLength={10}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="10-digit mobile number"
            />
          </div>

          {/* Document Type (Radio) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Document Type *
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="documentType"
                  value="aadhaar"
                  checked={formData.documentType === 'aadhaar'}
                  onChange={() => handleDocumentTypeChange('aadhaar')}
                  className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 focus:ring-cyan-500 focus:ring-2"
                />
                <span className="ml-2 text-gray-300">Aadhaar</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="documentType"
                  value="pan"
                  checked={formData.documentType === 'pan'}
                  onChange={() => handleDocumentTypeChange('pan')}
                  className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 focus:ring-cyan-500 focus:ring-2"
                />
                <span className="ml-2 text-gray-300">PAN</span>
              </label>
            </div>
          </div>

          {/* Document Number */}
          <div>
            <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-300 mb-2">
              {formData.documentType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'} *
            </label>
            <input
              type="text"
              id="documentNumber"
              name="documentNumber"
              value={formData.documentNumber}
              onChange={handleChange}
              required
              maxLength={formData.documentType === 'aadhaar' ? 12 : 10}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent uppercase"
              placeholder={formData.documentType === 'aadhaar' ? '12-digit Aadhaar' : 'ABCDE1234F'}
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.documentType === 'aadhaar' 
                ? 'Enter your 12-digit Aadhaar number' 
                : 'Enter your 10-character PAN (e.g., ABCDE1234F)'}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Verifying...' : 'Complete Profile'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your information is secure and will be used only for verification purposes
        </p>
      </div>
    </div>
  );
}
