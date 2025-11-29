'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { verifyOwnership } from '@/app/actions/listings';
import CarListingForm from '@/app/components/CarListingForm';
import TailorTalkWidget from '@/app/components/TailorTalkWidget';

export default function SellCarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [step, setStep] = useState<'verification' | 'listing'>('verification');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verificationData, setVerificationData] = useState<{
    registrationNumber: string;
    ownerName: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    ownerName: '',
  });

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/signin');
    return null;
  }

  if (!session?.user?.profileComplete) {
    router.push('/complete-profile');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleVerifyOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.registrationNumber.trim() || !formData.ownerName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyOwnership(
        formData.registrationNumber,
        formData.ownerName
      );

      if (result.success) {
        setVerificationData(result.data);
        setStep('listing');
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  if (step === 'listing') {
    return (
      <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Ownership verified for {verificationData?.registrationNumber}</span>
            </div>
          </div>

          <CarListingForm 
            registrationNumber={verificationData?.registrationNumber || ''}
            onBack={() => {
              setStep('verification');
              setVerificationData(null);
              setFormData({ registrationNumber: '', ownerName: '' });
            }}
          />
        </div>

        {/* TailorTalk AI Assistant Widget */}
        <TailorTalkWidget />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Sell Your Car</h1>
          <p className="text-gray-400">
            First, let&apos;s verify your vehicle ownership
          </p>
        </div>

        {/* Ownership Verification Form */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Ownership Verification</h2>
          
          <form onSubmit={handleVerifyOwnership} className="space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Registration Number */}
            <div>
              <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-300 mb-2">
                Vehicle Registration Number *
              </label>
              <input
                type="text"
                id="registrationNumber"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="e.g., MH12AB1234"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 uppercase focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter your vehicle registration number (e.g., MH12AB1234)
              </p>
            </div>

            {/* Owner Name */}
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-300 mb-2">
                Owner Name (as per RC) *
              </label>
              <input
                type="text"
                id="ownerName"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Enter full name as per registration certificate"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter the owner name exactly as it appears on the registration certificate
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/30 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium mb-1">Why do we verify ownership?</p>
                  <p className="text-blue-300">
                    We verify vehicle ownership to ensure only legitimate owners can list cars on our platform, 
                    maintaining trust and safety for all users.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Ownership'
              )}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Having trouble? <a href="/contact" className="text-cyan-400 hover:text-cyan-300">Contact support</a>
        </p>
      </div>

      {/* TailorTalk AI Assistant Widget */}
      <TailorTalkWidget />
    </div>
  );
}
