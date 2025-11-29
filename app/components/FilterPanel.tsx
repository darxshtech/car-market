'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterPanelProps {
  brands?: string[];
  cities?: string[];
  onFilterChange?: (filters: FilterOptions) => void;
}

export interface FilterOptions {
  brands: string[];
  priceRange: [number, number];
  cities: string[];
  yearRange: [number, number];
  fuelTypes: string[];
  transmissions: string[];
}

const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric'];
const TRANSMISSIONS = ['manual', 'automatic'];
const CURRENT_YEAR = new Date().getFullYear();

export default function FilterPanel({ brands = [], cities = [], onFilterChange }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(10000000);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [yearMin, setYearMin] = useState<number>(2000);
  const [yearMax, setYearMax] = useState<number>(CURRENT_YEAR);
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load filters from URL on mount
  useEffect(() => {
    const brandsParam = searchParams.get('brands');
    const citiesParam = searchParams.get('cities');
    const fuelParam = searchParams.get('fuel');
    const transParam = searchParams.get('transmission');
    const priceMinParam = searchParams.get('priceMin');
    const priceMaxParam = searchParams.get('priceMax');
    const yearMinParam = searchParams.get('yearMin');
    const yearMaxParam = searchParams.get('yearMax');

    if (brandsParam) setSelectedBrands(brandsParam.split(','));
    if (citiesParam) setSelectedCities(citiesParam.split(','));
    if (fuelParam) setSelectedFuelTypes(fuelParam.split(','));
    if (transParam) setSelectedTransmissions(transParam.split(','));
    if (priceMinParam) setPriceMin(parseInt(priceMinParam));
    if (priceMaxParam) setPriceMax(parseInt(priceMaxParam));
    if (yearMinParam) setYearMin(parseInt(yearMinParam));
    if (yearMaxParam) setYearMax(parseInt(yearMaxParam));
  }, [searchParams]);

  const applyFilters = () => {
    const filters: FilterOptions = {
      brands: selectedBrands,
      priceRange: [priceMin, priceMax],
      cities: selectedCities,
      yearRange: [yearMin, yearMax],
      fuelTypes: selectedFuelTypes,
      transmissions: selectedTransmissions,
    };

    if (onFilterChange) {
      onFilterChange(filters);
    } else {
      // Update URL params
      const params = new URLSearchParams(searchParams.toString());
      
      if (selectedBrands.length > 0) params.set('brands', selectedBrands.join(','));
      else params.delete('brands');
      
      if (selectedCities.length > 0) params.set('cities', selectedCities.join(','));
      else params.delete('cities');
      
      if (selectedFuelTypes.length > 0) params.set('fuel', selectedFuelTypes.join(','));
      else params.delete('fuel');
      
      if (selectedTransmissions.length > 0) params.set('transmission', selectedTransmissions.join(','));
      else params.delete('transmission');
      
      if (priceMin > 0) params.set('priceMin', priceMin.toString());
      else params.delete('priceMin');
      
      if (priceMax < 10000000) params.set('priceMax', priceMax.toString());
      else params.delete('priceMax');
      
      if (yearMin > 2000) params.set('yearMin', yearMin.toString());
      else params.delete('yearMin');
      
      if (yearMax < CURRENT_YEAR) params.set('yearMax', yearMax.toString());
      else params.delete('yearMax');

      router.push(`?${params.toString()}`);
    }
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCities([]);
    setSelectedFuelTypes([]);
    setSelectedTransmissions([]);
    setPriceMin(0);
    setPriceMax(10000000);
    setYearMin(2000);
    setYearMax(CURRENT_YEAR);
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete('brands');
    params.delete('cities');
    params.delete('fuel');
    params.delete('transmission');
    params.delete('priceMin');
    params.delete('priceMax');
    params.delete('yearMin');
    params.delete('yearMax');
    router.push(`?${params.toString()}`);
  };

  const toggleArrayFilter = (array: string[], setArray: (arr: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(item => item !== value));
    } else {
      setArray([...array, value]);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">Filters</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden text-cyan-400 hover:text-cyan-300"
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className={`space-y-6 ${isExpanded ? 'block' : 'hidden md:block'}`}>
        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(parseInt(e.target.value) || 0)}
              placeholder="Min"
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(parseInt(e.target.value) || 10000000)}
              placeholder="Max"
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Year Range */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={yearMin}
              onChange={(e) => setYearMin(parseInt(e.target.value) || 2000)}
              placeholder="From"
              min={2000}
              max={CURRENT_YEAR}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="number"
              value={yearMax}
              onChange={(e) => setYearMax(parseInt(e.target.value) || CURRENT_YEAR)}
              placeholder="To"
              min={2000}
              max={CURRENT_YEAR}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Fuel Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Fuel Type</label>
          <div className="space-y-2">
            {FUEL_TYPES.map((fuel) => (
              <label key={fuel} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFuelTypes.includes(fuel)}
                  onChange={() => toggleArrayFilter(selectedFuelTypes, setSelectedFuelTypes, fuel)}
                  className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                />
                <span className="ml-2 text-gray-300 capitalize">{fuel}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Transmission */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Transmission</label>
          <div className="space-y-2">
            {TRANSMISSIONS.map((trans) => (
              <label key={trans} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTransmissions.includes(trans)}
                  onChange={() => toggleArrayFilter(selectedTransmissions, setSelectedTransmissions, trans)}
                  className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                />
                <span className="ml-2 text-gray-300 capitalize">{trans}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Brands (if provided) */}
        {brands.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Brand</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {brands.map((brand) => (
                <label key={brand} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleArrayFilter(selectedBrands, setSelectedBrands, brand)}
                    className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <span className="ml-2 text-gray-300">{brand}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Cities (if provided) */}
        {cities.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cities.map((city) => (
                <label key={city} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCities.includes(city)}
                    onChange={() => toggleArrayFilter(selectedCities, setSelectedCities, city)}
                    className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <span className="ml-2 text-gray-300">{city}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-700">
          <button
            onClick={applyFilters}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
