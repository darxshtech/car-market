import * as cheerio from 'cheerio';

export interface ScrapedCarData {
  images: string[];
  carName: string;
  model: string;
  price: number;
  ownerName: string;
  yearOfPurchase: number;
  kmDriven: number;
  numberOfOwners: number;
  city: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedCarData;
  error?: string;
}

/**
 * Extract car data from an external listing URL
 * This is a mock implementation that demonstrates the structure
 * In production, this would use actual selectors based on the target website
 */
export async function extractCarData(url: string): Promise<ScrapeResult> {
  try {
    // Validate URL
    if (!url || !isValidUrl(url)) {
      return {
        success: false,
        error: 'Invalid URL provided',
      };
    }

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract data using CSS selectors
    // Note: These selectors are generic and would need to be customized
    // for specific websites in production
    const data: ScrapedCarData = {
      images: extractImages($),
      carName: extractCarName($),
      model: extractModel($),
      price: extractPrice($),
      ownerName: extractOwnerName($),
      yearOfPurchase: extractYear($),
      kmDriven: extractKmDriven($),
      numberOfOwners: extractNumberOfOwners($),
      city: extractCity($),
    };

    // Validate extracted data
    if (!data.carName || !data.model || data.price === 0) {
      return {
        success: false,
        error: 'Failed to extract required car data from the page',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Scraping error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error',
    };
  }
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractImages($: cheerio.CheerioAPI): string[] {
  const images: string[] = [];
  
  // Try common image selectors
  $('img[src*="car"], img[alt*="car"], .car-image img, .listing-image img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && isValidImageUrl(src)) {
      images.push(src);
    }
  });

  return images.slice(0, 10); // Limit to 10 images
}

function extractCarName($: cheerio.CheerioAPI): string {
  // Try common selectors for car name/title
  const selectors = [
    'h1.car-title',
    'h1.listing-title',
    '.car-name',
    'h1[itemprop="name"]',
    'h1',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) return text;
  }

  return '';
}

function extractModel($: cheerio.CheerioAPI): string {
  // Try to extract model from various locations
  const selectors = [
    '.car-model',
    '[data-model]',
    '.model-name',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) return text;
  }

  // Fallback: try to extract from car name
  const carName = extractCarName($);
  const parts = carName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : carName;
}

function extractPrice($: cheerio.CheerioAPI): number {
  const selectors = [
    '.price',
    '[itemprop="price"]',
    '.car-price',
    '.listing-price',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const price = parsePrice(text);
    if (price > 0) return price;
  }

  return 0;
}

function extractOwnerName($: cheerio.CheerioAPI): string {
  const selectors = [
    '.owner-name',
    '.seller-name',
    '[itemprop="seller"]',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) return text;
  }

  return 'Unknown Owner';
}

function extractYear($: cheerio.CheerioAPI): number {
  const selectors = [
    '.year',
    '[data-year]',
    '.car-year',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const year = parseInt(text.replace(/\D/g, ''));
    if (year >= 1990 && year <= new Date().getFullYear()) {
      return year;
    }
  }

  return new Date().getFullYear();
}

function extractKmDriven($: cheerio.CheerioAPI): number {
  const selectors = [
    '.km-driven',
    '.mileage',
    '[data-km]',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const km = parseInt(text.replace(/\D/g, ''));
    if (km > 0) return km;
  }

  return 0;
}

function extractNumberOfOwners($: cheerio.CheerioAPI): number {
  const selectors = [
    '.owners',
    '.owner-count',
    '[data-owners]',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const owners = parseInt(text.replace(/\D/g, ''));
    if (owners > 0 && owners <= 10) return owners;
  }

  return 1;
}

function extractCity($: cheerio.CheerioAPI): string {
  const selectors = [
    '.city',
    '.location',
    '[itemprop="addressLocality"]',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) return text;
  }

  return 'Unknown';
}

function parsePrice(text: string): number {
  // Remove currency symbols and commas
  const cleaned = text.replace(/[₹$,]/g, '').trim();
  
  // Handle lakhs and crores
  if (cleaned.toLowerCase().includes('lakh')) {
    const num = parseFloat(cleaned.replace(/[^\d.]/g, ''));
    return num * 100000;
  }
  if (cleaned.toLowerCase().includes('crore')) {
    const num = parseFloat(cleaned.replace(/[^\d.]/g, ''));
    return num * 10000000;
  }
  
  return parseInt(cleaned.replace(/\D/g, ''));
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Handle relative URLs
  if (url.startsWith('/')) return true;
  
  // Check if it's a valid URL
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
