'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type SortOption = 'price_asc' | 'price_desc' | 'year_desc' | 'km_asc' | 'newest';

interface SortDropdownProps {
  onSortChange?: (sort: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'year_desc', label: 'Year: Newest First' },
  { value: 'km_asc', label: 'KM: Low to High' },
];

export default function SortDropdown({ onSortChange }: SortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest');
  const [isOpen, setIsOpen] = useState(false);

  // Load sort from URL on mount
  useEffect(() => {
    const sortParam = searchParams.get('sort') as SortOption;
    if (sortParam && SORT_OPTIONS.some(opt => opt.value === sortParam)) {
      setSelectedSort(sortParam);
    }
  }, [searchParams]);

  const handleSortChange = (sort: SortOption) => {
    setSelectedSort(sort);
    setIsOpen(false);

    if (onSortChange) {
      onSortChange(sort);
    } else {
      // Update URL params
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', sort);
      router.push(`?${params.toString()}`);
    }
  };

  const selectedOption = SORT_OPTIONS.find(opt => opt.value === selectedSort);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <span className="text-sm font-medium">{selectedOption?.label}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  selectedSort === option.value
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
