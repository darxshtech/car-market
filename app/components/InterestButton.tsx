'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { expressInterest } from '@/app/actions/listings';

interface InterestButtonProps {
  listingId: string;
  initialCount: number;
}

export default function InterestButton({ listingId, initialCount }: InterestButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [interestCount, setInterestCount] = useState(initialCount);
  const [hasExpressed, setHasExpressed] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleExpressInterest = async () => {
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }

    if (!session?.user?.profileComplete) {
      router.push('/complete-profile');
      return;
    }

    // Optimistic update
    setInterestCount(prev => prev + 1);
    setHasExpressed(true);
    setError('');

    startTransition(async () => {
      const result = await expressInterest(listingId);

      if (result.success) {
        // Update with actual count from server
        if (result.data?.interestCount !== undefined) {
          setInterestCount(result.data.interestCount);
        }
      } else {
        // Revert optimistic update on error
        setInterestCount(prev => prev - 1);
        setHasExpressed(false);
        setError(result.error || 'Failed to express interest');
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleExpressInterest}
        disabled={hasExpressed || isPending}
        className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
          hasExpressed
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-cyan-600 hover:bg-cyan-700 text-white hover:scale-105'
        } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : hasExpressed ? (
          "Interest Expressed ✓"
        ) : (
          "I'm Interested"
        )}
      </button>

      {/* Interest Count */}
      <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>{interestCount} {interestCount === 1 ? 'person' : 'people'} interested</span>
      </div>

      {error && (
        <div className="text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
