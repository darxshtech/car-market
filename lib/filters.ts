import { IListing } from './models/Listing';

export interface FilterCriteria {
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
  cities?: string[];
  yearMin?: number;
  yearMax?: number;
  fuelTypes?: string[];
  transmissions?: string[];
  searchQuery?: string;
}

/**
 * Filter listings based on provided criteria
 * This function implements the filter matching logic that should be tested
 */
export function filterListings(listings: IListing[], criteria: FilterCriteria): IListing[] {
  return listings.filter((listing) => {
    // Brand filter
    if (criteria.brands && criteria.brands.length > 0) {
      if (!criteria.brands.includes(listing.brand)) {
        return false;
      }
    }

    // Price range filter
    if (criteria.priceMin !== undefined && listing.price < criteria.priceMin) {
      return false;
    }
    if (criteria.priceMax !== undefined && listing.price > criteria.priceMax) {
      return false;
    }

    // City filter
    if (criteria.cities && criteria.cities.length > 0) {
      if (!criteria.cities.includes(listing.city)) {
        return false;
      }
    }

    // Year range filter
    if (criteria.yearMin !== undefined && listing.yearOfOwnership < criteria.yearMin) {
      return false;
    }
    if (criteria.yearMax !== undefined && listing.yearOfOwnership > criteria.yearMax) {
      return false;
    }

    // Fuel type filter
    if (criteria.fuelTypes && criteria.fuelTypes.length > 0) {
      if (!criteria.fuelTypes.includes(listing.fuelType)) {
        return false;
      }
    }

    // Transmission filter
    if (criteria.transmissions && criteria.transmissions.length > 0) {
      if (!criteria.transmissions.includes(listing.transmission)) {
        return false;
      }
    }

    // Search query filter (searches in brand, model, city)
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      const searchableText = `${listing.brand} ${listing.carModel} ${listing.city}`.toLowerCase();
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  });
}
