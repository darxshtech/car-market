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

export interface MultipleScrapedResult {
  success: boolean;
  data?: ScrapedCarData[];
  error?: string;
  count?: number;
}

/**
 * Extract multiple car listings from CarDekho or similar listing pages
 * This function scrapes all available cars from a listing page
 */
export async function extractMultipleCarData(url: string): Promise<MultipleScrapedResult> {
  try {
    // Validate URL
    if (!url || !isValidUrl(url)) {
      return {
        success: false,
        error: 'Invalid URL provided',
      };
    }

    // Check if demo mode is requested
    if (url.toLowerCase().includes('demo') || url.toLowerCase().includes('test')) {
      return generateDemoData();
    }

    // Fetch the HTML content with better headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });

    console.log(`Fetch response status: ${response.status}`);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch URL: ${response.status} ${response.statusText}. The website may be blocking automated requests. Try using the demo URL: "https://demo.test" to see how the scraper works.`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Detect website type
    const isCarDekho = url.includes('cardekho.com');
    const isCarWale = url.includes('carwale.com');
    const isCars24 = url.includes('cars24.com');

    const cars: ScrapedCarData[] = [];

    if (isCarDekho) {
      // CarDekho specific selectors
      console.log('Detected CarDekho website');
      const carCards = $('.gsc_col, .usedCarTile, [data-track-label*="car"], .card, .listing-card');
      console.log(`Found ${carCards.length} potential car cards on CarDekho`);
      
      carCards.each((_, card) => {
        const $card = $(card);
        
        try {
          const carData = extractCarDekhoCard($, $card);
          if (carData && carData.carName) {
            cars.push(carData);
          }
        } catch (error) {
          console.error('Error extracting CarDekho card:', error);
        }
      });
    } else if (isCarWale) {
      // CarWale specific selectors
      console.log('Detected CarWale website');
      const carCards = $('.used-car-item, .car-info, .listing-item, [data-vehicle-id], .vehicle-card');
      console.log(`Found ${carCards.length} potential car cards on CarWale`);
      
      carCards.each((_, card) => {
        const $card = $(card);
        
        try {
          const carData = extractCarWaleCard($, $card);
          if (carData && carData.carName) {
            cars.push(carData);
          }
        } catch (error) {
          console.error('Error extracting CarWale card:', error);
        }
      });
    } else if (isCars24) {
      // Cars24 specific selectors
      console.log('Detected Cars24 website');
      const carCards = $('.car-card, [data-car-id], .vehicle-card, .listing-card, article');
      console.log(`Found ${carCards.length} potential car cards on Cars24`);
      
      carCards.each((_, card) => {
        const $card = $(card);
        
        try {
          const carData = extractCars24Card($, $card);
          if (carData && carData.carName) {
            cars.push(carData);
          }
        } catch (error) {
          console.error('Error extracting Cars24 card:', error);
        }
      });
    } else {
      // Generic scraping for other sites
      console.log('Using generic scraping');
      const carCards = $('.car-card, .listing-card, .vehicle-card, [data-car], [data-listing], .car-item, .vehicle-item');
      console.log(`Found ${carCards.length} potential car cards`);
      
      carCards.each((_, card) => {
        const $card = $(card);
        
        try {
          const carData = extractGenericCard($, $card);
          if (carData && carData.carName) {
            cars.push(carData);
          }
        } catch (error) {
          console.error('Error extracting generic card:', error);
        }
      });
    }

    console.log(`Successfully extracted ${cars.length} cars`);

    if (cars.length === 0) {
      return {
        success: false,
        error: 'No car listings found on the page. The page structure might not be supported yet. Try a different URL or contact support.',
      };
    }

    return {
      success: true,
      data: cars,
      count: cars.length,
    };
  } catch (error) {
    console.error('Scraping error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error',
    };
  }
}

/**
 * Extract car data from a CarDekho card element
 */
function extractCarDekhoCard($: cheerio.CheerioAPI, $card: cheerio.Cheerio<any>): ScrapedCarData | null {
  try {
    // Extract car name
    const carName = $card.find('h3, .title, [data-track-label*="title"], a[title]').first().text().trim() ||
                    $card.find('a').first().attr('title') || '';

    // Extract price
    const priceText = $card.find('.price, [data-price], .amount, strong:contains("₹")').first().text().trim();
    const price = parsePrice(priceText);

    // Extract year
    const yearText = $card.text();
    const yearMatch = yearText.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Extract km driven
    const kmText = $card.text();
    const kmMatch = kmText.match(/(\d[\d,]*)\s*(?:km|Km|KM)/i);
    const kmDriven = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;

    // Extract number of owners
    const ownerText = $card.text().toLowerCase();
    const ownerMatch = ownerText.match(/(\d+)(?:st|nd|rd|th)?\s*owner/);
    const numberOfOwners = ownerMatch ? parseInt(ownerMatch[1]) : 1;

    // Extract city
    const cityText = $card.find('.location, [data-location], .city').first().text().trim();
    const city = cityText || 'Unknown';

    // Extract images - filter out logos and icons
    const images: string[] = [];
    $card.find('img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
      const alt = $(img).attr('alt') || '';
      const className = $(img).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !isLogoOrIcon(src, alt, className)) {
        // Convert relative URLs to absolute
        const absoluteUrl = src.startsWith('http') ? src : `https://www.cardekho.com${src}`;
        images.push(absoluteUrl);
      }
    });

    // Extract model from car name
    const nameParts = carName.split(' ');
    const model = nameParts.length > 1 ? nameParts.slice(1).join(' ') : carName;

    return {
      images: images.slice(0, 10),
      carName,
      model,
      price,
      ownerName: 'CarDekho Seller',
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting CarDekho card:', error);
    return null;
  }
}

/**
 * Extract car data from a CarWale card element
 */
function extractCarWaleCard($: cheerio.CheerioAPI, $card: cheerio.Cheerio<any>): ScrapedCarData | null {
  try {
    // Extract car name - CarWale uses specific classes
    const carName = $card.find('.car-name, .vehicle-name, h3, .title, a').first().text().trim() ||
                    $card.find('a').first().attr('title') || '';

    // Extract price - CarWale shows prices in specific format
    const priceText = $card.find('.price, .car-price, .amount, [data-price]').first().text().trim();
    const price = parsePrice(priceText);

    // Extract year
    const yearText = $card.text();
    const yearMatch = yearText.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Extract km driven
    const kmText = $card.text();
    const kmMatch = kmText.match(/(\d[\d,]*)\s*(?:km|Km|KM)/i);
    const kmDriven = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;

    // Extract number of owners
    const ownerText = $card.text().toLowerCase();
    const ownerMatch = ownerText.match(/(\d+)(?:st|nd|rd|th)?\s*owner/);
    const numberOfOwners = ownerMatch ? parseInt(ownerMatch[1]) : 1;

    // Extract city
    const cityText = $card.find('.location, .city, [data-location]').first().text().trim();
    const city = cityText || 'Unknown';

    // Extract images - filter out logos and icons
    const images: string[] = [];
    $card.find('img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src') || $(img).attr('data-original');
      const alt = $(img).attr('alt') || '';
      const className = $(img).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !isLogoOrIcon(src, alt, className)) {
        // Convert relative URLs to absolute
        const absoluteUrl = src.startsWith('http') ? src : `https://www.carwale.com${src}`;
        images.push(absoluteUrl);
      }
    });

    // Extract model from car name
    const nameParts = carName.split(' ');
    const model = nameParts.length > 1 ? nameParts.slice(1).join(' ') : carName;

    return {
      images: images.slice(0, 10),
      carName,
      model,
      price,
      ownerName: 'CarWale Seller',
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting CarWale card:', error);
    return null;
  }
}

/**
 * Extract car data from a Cars24 card element
 */
function extractCars24Card($: cheerio.CheerioAPI, $card: cheerio.Cheerio<any>): ScrapedCarData | null {
  try {
    // Extract car name - Cars24 uses specific structure
    const carName = $card.find('h1, h2, h3, .car-name, .vehicle-name, [data-car-name]').first().text().trim() ||
                    $card.find('a').first().attr('title') || '';

    // Extract price
    const priceText = $card.find('.price, [data-price], .amount, strong').first().text().trim();
    const price = parsePrice(priceText);

    // Extract year
    const yearText = $card.text();
    const yearMatch = yearText.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Extract km driven
    const kmText = $card.text();
    const kmMatch = kmText.match(/(\d[\d,]*)\s*(?:km|Km|KM)/i);
    const kmDriven = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;

    // Extract number of owners
    const ownerText = $card.text().toLowerCase();
    const ownerMatch = ownerText.match(/(\d+)(?:st|nd|rd|th)?\s*owner/);
    const numberOfOwners = ownerMatch ? parseInt(ownerMatch[1]) : 1;

    // Extract city
    const cityText = $card.find('.location, .city, [data-location]').first().text().trim();
    const city = cityText || 'Unknown';

    // Extract images - filter out logos and icons
    const images: string[] = [];
    $card.find('img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
      const alt = $(img).attr('alt') || '';
      const className = $(img).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !isLogoOrIcon(src, alt, className)) {
        // Convert relative URLs to absolute
        const absoluteUrl = src.startsWith('http') ? src : `https://www.cars24.com${src}`;
        images.push(absoluteUrl);
      }
    });

    // Extract model from car name
    const nameParts = carName.split(' ');
    const model = nameParts.length > 1 ? nameParts.slice(1).join(' ') : carName;

    return {
      images: images.slice(0, 10),
      carName,
      model,
      price,
      ownerName: 'Cars24 Seller',
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting Cars24 card:', error);
    return null;
  }
}

/**
 * Extract car data from a generic card element
 */
function extractGenericCard($: cheerio.CheerioAPI, $card: cheerio.Cheerio<any>): ScrapedCarData | null {
  try {
    // Extract car name
    const carName = $card.find('h2, h3, .title, .car-name').first().text().trim();

    // Extract price
    const priceText = $card.find('.price, .amount, [data-price]').first().text().trim();
    const price = parsePrice(priceText);

    // Extract year
    const yearText = $card.text();
    const yearMatch = yearText.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Extract km driven
    const kmText = $card.text();
    const kmMatch = kmText.match(/(\d[\d,]*)\s*(?:km|Km|KM)/i);
    const kmDriven = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;

    // Extract number of owners
    const ownerText = $card.text().toLowerCase();
    const ownerMatch = ownerText.match(/(\d+)(?:st|nd|rd|th)?\s*owner/);
    const numberOfOwners = ownerMatch ? parseInt(ownerMatch[1]) : 1;

    // Extract city
    const cityText = $card.find('.location, .city, [data-location]').first().text().trim();
    const city = cityText || 'Unknown';

    // Extract images - filter out logos and icons
    const images: string[] = [];
    $card.find('img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      const alt = $(img).attr('alt') || '';
      const className = $(img).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !isLogoOrIcon(src, alt, className)) {
        images.push(src);
      }
    });

    // Extract model from car name
    const nameParts = carName.split(' ');
    const model = nameParts.length > 1 ? nameParts.slice(1).join(' ') : carName;

    return {
      images: images.slice(0, 10),
      carName,
      model,
      price,
      ownerName: 'Seller',
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting generic card:', error);
    return null;
  }
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
  
  // Try common image selectors with priority order
  const selectors = [
    'img[src*="car"]',
    'img[alt*="car"]',
    'img[alt*="vehicle"]',
    '.car-image img',
    '.listing-image img',
    '.gallery img',
    '.slider img',
    '.carousel img',
    '[data-gallery] img',
    'img[src*="vehicle"]',
    'img[src*="auto"]',
    // Fallback to all images if nothing specific found
    'img[src]',
  ];

  const seenUrls = new Set<string>();
  
  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
      const alt = $(el).attr('alt') || '';
      const className = $(el).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !seenUrls.has(src) && !isLogoOrIcon(src, alt, className)) {
        seenUrls.add(src);
        images.push(src);
      }
    });
    
    // Stop if we have enough images
    if (images.length >= 10) break;
  }

  return images.slice(0, 10); // Limit to 10 images
}

function extractCarName($: cheerio.CheerioAPI): string {
  // Try common selectors for car name/title with priority order
  const selectors = [
    'h1.car-title',
    'h1.listing-title',
    'h1.vehicle-title',
    '.car-name',
    '.vehicle-name',
    '.listing-name',
    'h1[itemprop="name"]',
    '[data-car-name]',
    '[data-vehicle-name]',
    'title', // Page title as fallback
    'h1',
    'h2.car-title',
    'h2.listing-title',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    // Filter out generic titles
    if (text && text.length > 3 && !text.toLowerCase().includes('buy') && !text.toLowerCase().includes('sell')) {
      return text;
    }
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
    '.vehicle-price',
    '[data-price]',
    '.amount',
    '.cost',
    'span:contains("₹")',
    'div:contains("₹")',
    'p:contains("₹")',
  ];

  for (const selector of selectors) {
    let foundPrice = 0;
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      const price = parsePrice(text);
      if (price > 0) {
        foundPrice = price;
        return false; // Break the loop
      }
    });
    if (foundPrice > 0) return foundPrice;
  }

  // Try to find price in the entire page text as last resort
  const bodyText = $('body').text();
  const priceMatch = bodyText.match(/₹\s*[\d,]+(?:\s*(?:lakh|crore))?/i);
  if (priceMatch) {
    const price = parsePrice(priceMatch[0]);
    if (price > 0) return price;
  }

  return 0;
}

function extractOwnerName($: cheerio.CheerioAPI): string {
  const selectors = [
    '.owner-name',
    '.seller-name',
    '[itemprop="seller"]',
    '[data-seller]',
    '[data-owner]',
    '.seller',
    '.owner',
    'span:contains("Seller")',
    'div:contains("Seller")',
    'span:contains("Owner")',
    'div:contains("Owner")',
  ];

  for (const selector of selectors) {
    let foundName = '';
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      // Filter out labels and keep only names
      if (text && text.length > 3 && text.length < 100 && !text.toLowerCase().includes('seller:') && !text.toLowerCase().includes('owner:')) {
        // Check if it looks like a name (has at least 2 words)
        const words = text.split(/\s+/);
        if (words.length >= 2) {
          foundName = text;
          return false; // Break the loop
        }
      }
    });
    if (foundName) return foundName;
  }

  return 'Unknown Owner';
}

function extractYear($: cheerio.CheerioAPI): number {
  const selectors = [
    '.year',
    '[data-year]',
    '.car-year',
    '.vehicle-year',
    '.model-year',
    '[data-model-year]',
    'span:contains("Year")',
    'div:contains("Year")',
    'td:contains("Year")',
  ];

  const currentYear = new Date().getFullYear();

  for (const selector of selectors) {
    let foundYear = 0;
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      // Extract 4-digit year
      const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 1990 && year <= currentYear) {
          foundYear = year;
          return false; // Break the loop
        }
      }
    });
    if (foundYear > 0) return foundYear;
  }

  // Try to find year in the entire page text
  const bodyText = $('body').text();
  const yearMatch = bodyText.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1990 && year <= currentYear) {
      return year;
    }
  }

  return currentYear;
}

function extractKmDriven($: cheerio.CheerioAPI): number {
  const selectors = [
    '.km-driven',
    '.mileage',
    '.odometer',
    '[data-km]',
    '[data-mileage]',
    'span:contains("km")',
    'div:contains("km")',
    'td:contains("km")',
    'span:contains("Km")',
    'div:contains("Km")',
  ];

  for (const selector of selectors) {
    let foundKm = 0;
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      // Extract numbers followed by km/Km
      const kmMatch = text.match(/(\d[\d,]*)\s*(?:km|Km|KM|kilometers)/i);
      if (kmMatch) {
        const km = parseInt(kmMatch[1].replace(/,/g, ''));
        if (km > 0 && km < 1000000) {
          foundKm = km;
          return false; // Break the loop
        }
      }
    });
    if (foundKm > 0) return foundKm;
  }

  // Try to find km in the entire page text
  const bodyText = $('body').text();
  const kmMatch = bodyText.match(/(\d[\d,]*)\s*(?:km|Km|KM|kilometers)/i);
  if (kmMatch) {
    const km = parseInt(kmMatch[1].replace(/,/g, ''));
    if (km > 0 && km < 1000000) return km;
  }

  return 0;
}

function extractNumberOfOwners($: cheerio.CheerioAPI): number {
  const selectors = [
    '.owners',
    '.owner-count',
    '[data-owners]',
    'span:contains("owner")',
    'div:contains("owner")',
    'td:contains("owner")',
    'span:contains("Owner")',
    'div:contains("Owner")',
  ];

  for (const selector of selectors) {
    let foundOwners = 0;
    $(selector).each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      
      // Check for "1st owner", "2nd owner", etc.
      const ordinalMatch = text.match(/(\d+)(?:st|nd|rd|th)\s*owner/);
      if (ordinalMatch) {
        const owners = parseInt(ordinalMatch[1]);
        if (owners > 0 && owners <= 10) {
          foundOwners = owners;
          return false; // Break the loop
        }
      }
      
      // Check for "X owners"
      const countMatch = text.match(/(\d+)\s*owners?/);
      if (countMatch) {
        const owners = parseInt(countMatch[1]);
        if (owners > 0 && owners <= 10) {
          foundOwners = owners;
          return false; // Break the loop
        }
      }
    });
    if (foundOwners > 0) return foundOwners;
  }

  // Try to find owner info in the entire page text
  const bodyText = $('body').text().toLowerCase();
  const ordinalMatch = bodyText.match(/(\d+)(?:st|nd|rd|th)\s*owner/);
  if (ordinalMatch) {
    const owners = parseInt(ordinalMatch[1]);
    if (owners > 0 && owners <= 10) return owners;
  }

  return 1;
}

function extractCity($: cheerio.CheerioAPI): string {
  const selectors = [
    '.city',
    '.location',
    '[itemprop="addressLocality"]',
    '[data-city]',
    '[data-location]',
    '.address',
    'span:contains("Location")',
    'div:contains("Location")',
    'span:contains("City")',
    'div:contains("City")',
  ];

  for (const selector of selectors) {
    let foundCity = '';
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      // Filter out long addresses, keep only city names
      if (text && text.length > 2 && text.length < 50 && !text.includes('\n')) {
        // Extract city from "City, State" format
        const parts = text.split(',');
        if (parts.length > 0) {
          const city = parts[0].trim();
          if (city.length > 2) {
            foundCity = city;
            return false; // Break the loop
          }
        }
      }
    });
    if (foundCity) return foundCity;
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

/**
 * Check if an image is likely a logo or icon
 */
function isLogoOrIcon(src: string, alt: string, className: string): boolean {
  const lowerSrc = src.toLowerCase();
  const lowerAlt = alt.toLowerCase();
  const lowerClass = className.toLowerCase();
  
  // Check for common logo/icon patterns in URL
  const logoPatterns = [
    'logo', 'icon', 'sprite', 'badge', 'button',
    'arrow', 'chevron', 'menu', 'nav', 'header',
    'footer', 'social', 'brand', 'favicon',
    'placeholder', 'loading', 'spinner'
  ];
  
  for (const pattern of logoPatterns) {
    if (lowerSrc.includes(pattern) || lowerAlt.includes(pattern) || lowerClass.includes(pattern)) {
      return true;
    }
  }
  
  // Check for SVG (often used for icons)
  if (lowerSrc.endsWith('.svg')) {
    return true;
  }
  
  // Check for very small dimensions in the URL (like 24x24, 32x32)
  if (/\d{1,2}x\d{1,2}/.test(lowerSrc)) {
    return true;
  }
  
  return false;
}


/**
 * Generate demo/mock data for testing the scraper
 */
function generateDemoData(): MultipleScrapedResult {
  const demoCars: ScrapedCarData[] = [
    {
      images: [
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
      ],
      carName: 'Maruti Suzuki Swift',
      model: 'Swift VXI',
      price: 550000,
      ownerName: 'Demo Seller',
      yearOfPurchase: 2019,
      kmDriven: 35000,
      numberOfOwners: 1,
      city: 'Mumbai',
    },
    {
      images: [
        'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800',
        'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800',
      ],
      carName: 'Hyundai Creta',
      model: 'Creta SX',
      price: 1250000,
      ownerName: 'Demo Seller',
      yearOfPurchase: 2020,
      kmDriven: 28000,
      numberOfOwners: 1,
      city: 'Delhi',
    },
    {
      images: [
        'https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800',
      ],
      carName: 'Honda City',
      model: 'City VX',
      price: 750000,
      ownerName: 'Demo Seller',
      yearOfPurchase: 2018,
      kmDriven: 45000,
      numberOfOwners: 2,
      city: 'Bangalore',
    },
    {
      images: [
        'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800',
      ],
      carName: 'Tata Nexon',
      model: 'Nexon XZ Plus',
      price: 950000,
      ownerName: 'Demo Seller',
      yearOfPurchase: 2021,
      kmDriven: 15000,
      numberOfOwners: 1,
      city: 'Pune',
    },
    {
      images: [
        'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      ],
      carName: 'Mahindra XUV500',
      model: 'XUV500 W8',
      price: 1100000,
      ownerName: 'Demo Seller',
      yearOfPurchase: 2019,
      kmDriven: 40000,
      numberOfOwners: 1,
      city: 'Chennai',
    },
  ];

  return {
    success: true,
    data: demoCars,
    count: demoCars.length,
  };
}
