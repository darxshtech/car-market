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
 * Page type enum for detecting listing vs detail pages
 */
export enum PageType {
  LISTING_PAGE = 'LISTING_PAGE',
  DETAIL_PAGE = 'DETAIL_PAGE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Interface for website-specific detail page extractors
 */
export interface DetailPageExtractor {
  canHandle(url: string): boolean;
  extract($: cheerio.CheerioAPI, url: string): ScrapedCarData | null;
}

/**
 * Detect whether a URL points to a listing page or detail page
 * Uses URL pattern analysis and content structure analysis as fallback
 */
export function detectPageType(url: string, $: cheerio.CheerioAPI): PageType {
  // URL pattern analysis for detail pages
  const detailPatterns = [
    /\/used-[^\/]+\/\d+/,           // CarDekho detail pattern: /used-car-name/12345
    /\/car\/[^\/]+\/\d+/,            // Generic detail pattern: /car/name/12345
    /\/buy-used-[^\/]+\/\d+/,        // Cars24 detail pattern: /buy-used-car-name/12345
    /\/[^\/]+-\d+\.html/,            // OLX detail pattern: /car-name-12345.html
    /\/listing\/\d+/,                // Generic listing detail: /listing/12345
    /\/vehicle\/\d+/,                // Generic vehicle detail: /vehicle/12345
    /\/ad\/\d+/,                     // Ad detail pattern: /ad/12345
    /\/details\/\d+/,                // Details pattern: /details/12345
  ];
  
  // URL pattern analysis for listing pages
  const listingPatterns = [
    /\/used-cars\+in\+/,             // CarDekho listing pattern: /used-cars+in+city
    /\/used-cars\//,                 // Generic listing pattern: /used-cars/
    /\/buy-used-cars/,               // Generic buy listing: /buy-used-cars
    /\/search/,                      // Search results page
    /\/listings/,                    // Listings page
    /\/cars-for-sale/,               // Cars for sale page
    /\/browse/,                      // Browse page
  ];
  
  // Check URL patterns for detail pages first (more specific)
  for (const pattern of detailPatterns) {
    if (pattern.test(url)) {
      return PageType.DETAIL_PAGE;
    }
  }
  
  // Check URL patterns for listing pages
  for (const pattern of listingPatterns) {
    if (pattern.test(url)) {
      return PageType.LISTING_PAGE;
    }
  }
  
  // Content structure analysis as fallback
  // Check for multiple car cards (indicates listing page)
  const carCardSelectors = [
    '.car-card',
    '.listing-card',
    '.vehicle-card',
    '[data-car]',
    '[data-listing]',
    '.gsc_col',
    '.usedCarTile',
    '.used-car-item',
  ];
  
  let carCardCount = 0;
  for (const selector of carCardSelectors) {
    const count = $(selector).length;
    if (count > carCardCount) {
      carCardCount = count;
    }
  }
  
  // If we find multiple car cards, it's a listing page
  if (carCardCount > 1) {
    return PageType.LISTING_PAGE;
  }
  
  // Check for detail page layout indicators
  const detailLayoutSelectors = [
    '.car-detail',
    '.vehicle-detail',
    '.detail-page',
    '.car-info-detail',
    '.vehicle-info-detail',
    '.product-detail',
    '.listing-detail',
    '[data-detail-page]',
    '.gallery',
    '.image-carousel',
    '.car-gallery',
  ];
  
  for (const selector of detailLayoutSelectors) {
    if ($(selector).length > 0) {
      return PageType.DETAIL_PAGE;
    }
  }
  
  // Check for single large image gallery (common in detail pages)
  const galleryImages = $('.gallery img, .image-carousel img, .car-gallery img').length;
  if (galleryImages >= 3) {
    return PageType.DETAIL_PAGE;
  }
  
  // If we have exactly one car card, it might be a detail page
  if (carCardCount === 1) {
    return PageType.DETAIL_PAGE;
  }
  
  // Unable to determine page type
  return PageType.UNKNOWN;
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

    // Fetch the HTML content with better headers and timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
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
    
    clearTimeout(timeoutId);

    console.log(`Fetch response status: ${response.status}`);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch URL: ${response.status} ${response.statusText}. The website may be blocking automated requests. Try using the demo URL: "https://demo.test" to see how the scraper works.`,
      };
    }

    const html = await response.text();
    
    // Check HTML size to prevent memory issues
    const htmlSizeInMB = Buffer.byteLength(html, 'utf8') / (1024 * 1024);
    console.log(`HTML size: ${htmlSizeInMB.toFixed(2)} MB`);
    
    if (htmlSizeInMB > 10) {
      return {
        success: false,
        error: 'HTML content too large (>10MB). The page may be too complex to scrape.',
      };
    }
    
    let $: cheerio.CheerioAPI;
    try {
      $ = cheerio.load(html, {
        xml: false,
      });
    } catch (loadError) {
      console.error('Error loading HTML with cheerio:', loadError);
      return {
        success: false,
        error: 'Failed to parse HTML. The page structure may be too complex or malformed.',
      };
    }

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
      
      let processedCount = 0;
      const MAX_CARDS = 20; // Reduced limit to prevent stack overflow
      
      try {
        carCards.each((_, card) => {
          if (processedCount >= MAX_CARDS) {
            console.log(`Reached maximum card limit (${MAX_CARDS}), stopping extraction`);
            return false; // Break the loop
          }
          
          const $card = $(card);
          processedCount++;
          
          try {
            const carData = extractCarDekhoCard($, $card);
            if (carData && carData.carName) {
              cars.push(carData);
            }
          } catch (error) {
            console.error(`Error extracting CarDekho card ${processedCount}:`, error);
          }
        });
      } catch (loopError) {
        console.error('Error during card extraction loop:', loopError);
        // Continue with whatever cars we've extracted so far
      }
    } else if (isCarWale) {
      // CarWale specific selectors
      console.log('Detected CarWale website');
      const carCards = $('.used-car-item, .car-info, .listing-item, [data-vehicle-id], .vehicle-card');
      console.log(`Found ${carCards.length} potential car cards on CarWale`);
      
      let processedCount = 0;
      const MAX_CARDS = 20; // Reduced limit to prevent stack overflow
      
      try {
        carCards.each((_, card) => {
          if (processedCount >= MAX_CARDS) {
            console.log(`Reached maximum card limit (${MAX_CARDS}), stopping extraction`);
            return false; // Break the loop
          }
          
          const $card = $(card);
          processedCount++;
          
          try {
            const carData = extractCarWaleCard($, $card);
            if (carData && carData.carName) {
              cars.push(carData);
            }
          } catch (error) {
            console.error(`Error extracting CarWale card ${processedCount}:`, error);
          }
        });
      } catch (loopError) {
        console.error('Error during card extraction loop:', loopError);
        // Continue with whatever cars we've extracted so far
      }
    } else if (isCars24) {
      // Cars24 specific selectors
      console.log('Detected Cars24 website');
      const carCards = $('.car-card, [data-car-id], .vehicle-card, .listing-card, article');
      console.log(`Found ${carCards.length} potential car cards on Cars24`);
      
      let processedCount = 0;
      const MAX_CARDS = 20; // Reduced limit to prevent stack overflow
      
      try {
        carCards.each((_, card) => {
          if (processedCount >= MAX_CARDS) {
            console.log(`Reached maximum card limit (${MAX_CARDS}), stopping extraction`);
            return false; // Break the loop
          }
          
          const $card = $(card);
          processedCount++;
          
          try {
            const carData = extractCars24Card($, $card);
            if (carData && carData.carName) {
              cars.push(carData);
            }
          } catch (error) {
            console.error(`Error extracting Cars24 card ${processedCount}:`, error);
          }
        });
      } catch (loopError) {
        console.error('Error during card extraction loop:', loopError);
        // Continue with whatever cars we've extracted so far
      }
    } else {
      // Generic scraping for other sites
      console.log('Using generic scraping');
      const carCards = $('.car-card, .listing-card, .vehicle-card, [data-car], [data-listing], .car-item, .vehicle-item');
      console.log(`Found ${carCards.length} potential car cards`);
      
      let processedCount = 0;
      const MAX_CARDS = 20; // Reduced limit to prevent stack overflow
      
      try {
        carCards.each((_, card) => {
          if (processedCount >= MAX_CARDS) {
            console.log(`Reached maximum card limit (${MAX_CARDS}), stopping extraction`);
            return false; // Break the loop
          }
          
          const $card = $(card);
          processedCount++;
          
          try {
            const carData = extractGenericCard($, $card);
            if (carData && carData.carName) {
              cars.push(carData);
            }
          } catch (error) {
            console.error(`Error extracting generic card ${processedCount}:`, error);
          }
        });
      } catch (loopError) {
        console.error('Error during card extraction loop:', loopError);
        // Continue with whatever cars we've extracted so far
      }
    }

    console.log(`Successfully extracted ${cars.length} cars`);

    if (cars.length === 0) {
      // Check if this is a car detail/info page rather than a listing page
      const isDetailPage = url.includes('/new-') || 
                          url.includes('/upcoming-') ||
                          (!url.includes('used') && !url.includes('buy'));
      
      if (isDetailPage) {
        return {
          success: false,
          error: 'This appears to be a car information/review page, not a used car listing page. Please use a URL from the "Used Cars" section with actual listings for sale. Example: https://www.cardekho.com/used-cars+in+delhi',
        };
      }
      
      return {
        success: false,
        error: 'No car listings found on the page. The page structure might not be supported yet. Try a different URL or use the demo URL: "https://demo.test"',
      };
    }

    return {
      success: true,
      data: cars,
      count: cars.length,
    };
  } catch (error) {
    console.error('Scraping error:', error);
    
    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out after 15 seconds. The website may be slow or blocking requests.',
      };
    }
    
    // Handle stack overflow errors
    if (error instanceof RangeError || (error instanceof Error && error.message.includes('stack'))) {
      return {
        success: false,
        error: 'Maximum call stack exceeded. The page structure is too complex. Try using demo mode or a different URL.',
      };
    }
    
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

    // Skip if car name looks like a news article or category
    if (!carName || 
        carName.toLowerCase().includes('news') ||
        carName.toLowerCase().includes('best') ||
        carName.toLowerCase().includes('top') ||
        carName.toLowerCase().includes('features') ||
        carName.toLowerCase().includes('review') ||
        carName.toLowerCase().includes('cars between') ||
        carName.toLowerCase().includes('upcoming') ||
        carName.toLowerCase().includes('cars with') ||
        carName.length > 100) {
      return null;
    }

    // Extract price
    const priceText = $card.find('.price, [data-price], .amount, strong:contains("₹")').first().text().trim();
    const price = parsePrice(priceText);

    // Skip if no valid price found
    if (!price || price <= 0 || isNaN(price)) {
      return null;
    }

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
      const src = $(img).attr('src') || 
                  $(img).attr('data-src') || 
                  $(img).attr('data-lazy-src') ||
                  $(img).attr('data-original') ||
                  $(img).attr('data-lazy') ||
                  $(img).attr('srcset')?.split(',')[0]?.split(' ')[0];
      const alt = $(img).attr('alt') || '';
      const className = $(img).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !isLogoOrIcon(src, alt, className)) {
        // Convert relative URLs to absolute
        const absoluteUrl = src.startsWith('http') ? src : `https://www.cardekho.com${src}`;
        images.push(absoluteUrl);
      }
    });

    // If no images found in card, this might be a detail page - skip validation
    // The detail page scraper will handle it differently
    if (images.length === 0) {
      return null;
    }

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

    // Skip if car name looks like a news article or category
    if (!carName || 
        carName.toLowerCase().includes('news') ||
        carName.toLowerCase().includes('best') ||
        carName.toLowerCase().includes('top') ||
        carName.toLowerCase().includes('features') ||
        carName.toLowerCase().includes('review') ||
        carName.toLowerCase().includes('cars between') ||
        carName.toLowerCase().includes('upcoming') ||
        carName.toLowerCase().includes('cars with') ||
        carName.length > 100) {
      return null;
    }

    // Extract price - CarWale shows prices in specific format
    const priceText = $card.find('.price, .car-price, .amount, [data-price]').first().text().trim();
    const price = parsePrice(priceText);

    // Skip if no valid price found
    if (!price || price <= 0 || isNaN(price)) {
      return null;
    }

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
      const src = $(img).attr('src') || 
                  $(img).attr('data-src') || 
                  $(img).attr('data-lazy-src') || 
                  $(img).attr('data-original') ||
                  $(img).attr('data-lazy') ||
                  $(img).attr('srcset')?.split(',')[0]?.split(' ')[0];
      const alt = $(img).attr('alt') || '';
      const className = $(img).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !isLogoOrIcon(src, alt, className)) {
        // Convert relative URLs to absolute
        const absoluteUrl = src.startsWith('http') ? src : `https://www.carwale.com${src}`;
        images.push(absoluteUrl);
      }
    });

    // If no images found in card, this might be a detail page - skip validation
    if (images.length === 0) {
      return null;
    }

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

    // Skip if car name looks like a news article or category
    if (!carName || 
        carName.toLowerCase().includes('news') ||
        carName.toLowerCase().includes('best') ||
        carName.toLowerCase().includes('top') ||
        carName.toLowerCase().includes('features') ||
        carName.toLowerCase().includes('review') ||
        carName.toLowerCase().includes('cars between') ||
        carName.toLowerCase().includes('upcoming') ||
        carName.toLowerCase().includes('cars with') ||
        carName.length > 100) {
      return null;
    }

    // Extract price
    const priceText = $card.find('.price, [data-price], .amount, strong').first().text().trim();
    const price = parsePrice(priceText);

    // Skip if no valid price found
    if (!price || price <= 0 || isNaN(price)) {
      return null;
    }

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
      const src = $(img).attr('src') || 
                  $(img).attr('data-src') || 
                  $(img).attr('data-lazy-src') ||
                  $(img).attr('data-original') ||
                  $(img).attr('data-lazy') ||
                  $(img).attr('srcset')?.split(',')[0]?.split(' ')[0];
      const alt = $(img).attr('alt') || '';
      const className = $(img).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !isLogoOrIcon(src, alt, className)) {
        // Convert relative URLs to absolute
        const absoluteUrl = src.startsWith('http') ? src : `https://www.cars24.com${src}`;
        images.push(absoluteUrl);
      }
    });

    // If no images found in card, this might be a detail page - skip validation
    if (images.length === 0) {
      return null;
    }

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

    // Skip if car name looks like a news article or category
    if (!carName || 
        carName.toLowerCase().includes('news') ||
        carName.toLowerCase().includes('best') ||
        carName.toLowerCase().includes('top') ||
        carName.toLowerCase().includes('features') ||
        carName.toLowerCase().includes('review') ||
        carName.toLowerCase().includes('cars between') ||
        carName.toLowerCase().includes('upcoming') ||
        carName.toLowerCase().includes('cars with') ||
        carName.length > 100) {
      return null;
    }

    // Extract price
    const priceText = $card.find('.price, .amount, [data-price]').first().text().trim();
    const price = parsePrice(priceText);

    // Skip if no valid price found
    if (!price || price <= 0 || isNaN(price)) {
      return null;
    }

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
      const src = $(img).attr('src') || 
                  $(img).attr('data-src') ||
                  $(img).attr('data-lazy-src') ||
                  $(img).attr('data-original') ||
                  $(img).attr('data-lazy') ||
                  $(img).attr('srcset')?.split(',')[0]?.split(' ')[0];
      const alt = $(img).attr('alt') || '';
      const className = $(img).attr('class') || '';
      
      // Skip logos, icons, and small images
      if (src && isValidImageUrl(src) && !isLogoOrIcon(src, alt, className)) {
        images.push(src);
      }
    });

    // If no images found in card, this might be a detail page - skip validation
    if (images.length === 0) {
      return null;
    }

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
 * Extract car data from a single car detail page
 * This function handles detail pages with comprehensive information about one vehicle
 * Supports CarDekho, CarWale, Cars24, OLX, and generic detail pages
 */
export async function extractSingleCarData(url: string): Promise<ScrapeResult> {
  try {
    // Validate URL
    if (!url || !isValidUrl(url)) {
      return {
        success: false,
        error: 'Invalid URL provided',
      };
    }

    // Fetch HTML with timeout and proper headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
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
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP errors
    if (!response.ok) {
      // Check for anti-bot protection
      if (response.status === 403) {
        return {
          success: false,
          error: 'The website is blocking automated requests. Try using the demo URL or manual import.',
        };
      }
      return {
        success: false,
        error: `Failed to fetch URL: ${response.status} ${response.statusText}. The website may be blocking automated requests.`,
      };
    }

    const html = await response.text();
    
    // Check HTML size to prevent memory issues
    const htmlSizeInMB = Buffer.byteLength(html, 'utf8') / (1024 * 1024);
    if (htmlSizeInMB > 10) {
      return {
        success: false,
        error: 'HTML content too large (>10MB). The page may be too complex to scrape.',
      };
    }
    
    // Parse with Cheerio
    let $: cheerio.CheerioAPI;
    try {
      $ = cheerio.load(html, { xml: false });
    } catch (loadError) {
      return {
        success: false,
        error: 'Failed to parse HTML. The page structure may be too complex or malformed.',
      };
    }
    
    // Detect website type and apply appropriate extractor
    const data = extractDetailByWebsite($, url);
    
    // Validate extracted data
    if (!data) {
      return {
        success: false,
        error: 'Failed to extract car data from the page. The website structure may not be supported.',
      };
    }
    
    const missingFields: string[] = [];
    if (!data.carName) missingFields.push('carName');
    if (!data.model) missingFields.push('model');
    if (!data.price || data.price <= 0) missingFields.push('price');
    if (!data.images || data.images.length === 0) missingFields.push('images');
    
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Failed to extract required car data from the page. Missing fields: ${missingFields.join(', ')}`,
      };
    }
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Scraping error:', error);
    
    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out after 15 seconds. The website may be slow or blocking requests.',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error',
    };
  }
}

/**
 * Extract images from detail page gallery
 * Prioritizes high-resolution images and filters out UI elements
 */
function extractDetailImages($: cheerio.CheerioAPI, baseUrl?: string): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();
  
  // Try gallery-specific selectors first
  const gallerySelectors = [
    '.gallery img',
    '.image-carousel img',
    '.car-gallery img',
    '.photo-gallery img',
    '.slider img',
    '[data-gallery] img',
    '.swiper-slide img',
  ];
  
  for (const selector of gallerySelectors) {
    $(selector).each((_, img) => {
      let src = extractImageUrl($(img));
      if (src && !seenUrls.has(src) && !isLogoOrIcon(src, $(img).attr('alt') || '', $(img).attr('class') || '')) {
        // Convert relative URLs to absolute if baseUrl is provided
        if (baseUrl && src.startsWith('/')) {
          try {
            const urlObj = new URL(baseUrl);
            src = `${urlObj.protocol}//${urlObj.host}${src}`;
          } catch (e) {
            // If URL parsing fails, keep the original src
          }
        }
        seenUrls.add(src);
        images.push(src);
      }
    });
    
    // If we found images in a gallery, stop looking
    if (images.length > 0) break;
  }
  
  // Fallback to all images if gallery not found
  if (images.length === 0) {
    $('img').each((_, img) => {
      let src = extractImageUrl($(img));
      if (src && !seenUrls.has(src) && !isLogoOrIcon(src, $(img).attr('alt') || '', $(img).attr('class') || '')) {
        // Convert relative URLs to absolute if baseUrl is provided
        if (baseUrl && src.startsWith('/')) {
          try {
            const urlObj = new URL(baseUrl);
            src = `${urlObj.protocol}//${urlObj.host}${src}`;
          } catch (e) {
            // If URL parsing fails, keep the original src
          }
        }
        seenUrls.add(src);
        images.push(src);
      }
    });
  }
  
  return images.slice(0, 15); // Limit to 15 images
}

/**
 * Extract image URL from img element, handling lazy-loaded images
 * Prioritizes lazy-loading attributes over src to get high-resolution images
 */
function extractImageUrl($img: cheerio.Cheerio<any>): string | null {
  // Try lazy-loading attributes first (they usually contain the actual high-res image)
  // Note: Skip 'data-lazy' as it's often a boolean flag, not a URL
  const src = $img.attr('data-src') || 
              $img.attr('data-lazy-src') ||
              $img.attr('data-original') ||
              $img.attr('data-lazy-original') ||
              $img.attr('srcset')?.split(',')[0]?.split(' ')[0] ||
              $img.attr('src'); // Fallback to src if no lazy-loading attributes
  
  // Ensure we return a string or null, not boolean or other types
  // Also filter out placeholder images
  if (typeof src === 'string' && src.length > 0 && !src.includes('spacer') && !src.includes('placeholder')) {
    return src;
  }
  return null;
}

/**
 * Extract specifications from structured table or list
 */
function extractSpecTable($: cheerio.CheerioAPI, tableSelector: string): Partial<ScrapedCarData> {
  const specs: any = {};
  
  // Try table format
  $(`${tableSelector} tr, ${tableSelector} .spec-row, ${tableSelector} .specification-item`).each((_, row) => {
    const $row = $(row);
    const label = $row.find('td:first-child, th, .label, .spec-label').text().trim().toLowerCase();
    const value = $row.find('td:last-child, .value, .spec-value').text().trim();
    
    if (label.includes('year') || label.includes('registration')) {
      const yearMatch = value.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) specs.yearOfPurchase = parseInt(yearMatch[1]);
    } else if (label.includes('km') || label.includes('mileage') || label.includes('driven')) {
      const kmMatch = value.match(/(\d[\d,]*)/);
      if (kmMatch) specs.kmDriven = parseInt(kmMatch[1].replace(/,/g, ''));
    } else if (label.includes('owner')) {
      const ownerMatch = value.match(/(\d+)/);
      if (ownerMatch) specs.numberOfOwners = parseInt(ownerMatch[1]);
    } else if (label.includes('city') || label.includes('location')) {
      specs.city = value;
    }
  });
  
  return specs;
}

/**
 * Extract seller information from detail page
 */
function extractSellerInfo($: cheerio.CheerioAPI, sellerSelector: string): { name: string; city: string } {
  const name = $(`${sellerSelector} .seller-name, ${sellerSelector} .owner-name, ${sellerSelector} .dealer-name`).first().text().trim();
  const city = $(`${sellerSelector} .seller-location, ${sellerSelector} .location, ${sellerSelector} .city`).first().text().trim();
  
  return { name, city };
}

/**
 * Validate that extracted car data contains required fields
 */
function validateCarData(data: ScrapedCarData | null): boolean {
  if (!data) return false;
  
  return !!(
    data.carName &&
    data.model &&
    data.price > 0 &&
    data.images.length > 0
  );
}

/**
 * Extract and clean description from detail page
 * Removes HTML tags, preserves paragraph breaks, combines multiple sections
 */
function extractDescription($: cheerio.CheerioAPI): string {
  const descriptionSelectors = [
    '.description',
    '.car-description',
    '.vehicle-description',
    '.ad-description',
    '[data-description]',
    '.details-description',
    '.about',
    '.overview-text',
  ];
  
  let description = '';
  
  // Try each selector
  for (const selector of descriptionSelectors) {
    const $desc = $(selector).first();
    if ($desc.length > 0) {
      // Get text content, which automatically removes HTML tags
      let text = $desc.text().trim();
      
      // If we found content, use it
      if (text && text.length > 10) {
        description = text;
        break;
      }
    }
  }
  
  // If no description found, try to find multiple description sections
  if (!description) {
    const sections: string[] = [];
    $('.description-section, .detail-section, p.description').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) {
        sections.push(text);
      }
    });
    
    if (sections.length > 0) {
      description = sections.join('\n\n');
    }
  }
  
  // Clean up the description
  if (description) {
    // Remove excessive whitespace
    description = description.replace(/\s+/g, ' ').trim();
    
    // Preserve paragraph breaks by looking for sentence endings
    description = description.replace(/\.\s+/g, '.\n');
    
    // Remove any remaining HTML entities
    description = description
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  
  return description || '';
}

/**
 * Detect website type and route to appropriate detail page extractor
 */
function extractDetailByWebsite($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  // Detect website type from URL
  const isCarDekho = url.includes('cardekho.com');
  const isCarWale = url.includes('carwale.com');
  const isCars24 = url.includes('cars24.com');
  const isOLX = url.includes('olx.in') || url.includes('olx.com');
  
  // Route to website-specific extractor
  if (isCarDekho) {
    return extractCarDekhoDetail($, url);
  } else if (isCarWale) {
    return extractCarWaleDetail($, url);
  } else if (isCars24) {
    return extractCars24Detail($, url);
  } else if (isOLX) {
    return extractOLXDetail($, url);
  } else {
    // Fallback to generic extractor
    return extractGenericDetail($, url);
  }
}

/**
 * Extract car data from CarDekho detail page
 */
function extractCarDekhoDetail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  try {
    // Extract car name from h1 or title
    const carName = $('h1.car-title, h1[itemprop="name"], h1, .heading').first().text().trim();
    
    if (!carName) return null;
    
    // Fallback to page text for all extractions (CarDekho uses client-side rendering)
    const pageText = $('body').text();
    
    // Extract price from price section or page text
    let priceText = $('.price-section, [itemprop="price"], .price, .priceInfo, strong:contains("₹")').first().text().trim();
    let price = parsePrice(priceText);
    
    // If price not found in selectors, search page text for price pattern
    if (!price || price <= 0) {
      const priceMatch = pageText.match(/₹\s*[\d,]+(?:\.\d+)?\s*(?:Lakh|Crore)/i);
      if (priceMatch) {
        price = parsePrice(priceMatch[0]);
      }
    }
    
    // Extract images from gallery using helper function
    const images = extractDetailImages($, url);
    
    // Extract specifications from table if available
    const specs = extractSpecTable($, '.specs-table, .specifications, .car-specs, .overview-list');
    
    // Extract seller information
    const sellerInfo = extractSellerInfo($, '.seller-info, .owner-details, .dealer-info');
    
    // Extract year (from specs or page text)
    let year = specs.yearOfPurchase;
    if (!year) {
      // Try to find year in car name first (more reliable for CarDekho)
      const carNameYearMatch = carName.match(/\b(20\d{2})\b/);
      if (carNameYearMatch) {
        year = parseInt(carNameYearMatch[1]);
      } else {
        // Fallback to page text
        const yearMatch = pageText.match(/\b(20\d{2})\b/);
        year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
      }
    }
    
    // Extract km driven (from specs or page text)
    let kmDriven = specs.kmDriven || 0;
    if (!kmDriven) {
      const kmMatch = pageText.match(/(\d[\d,]*)\s*(?:km|Km|KM)/i);
      kmDriven = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
    }
    
    // Extract number of owners (from specs or page text)
    let numberOfOwners = specs.numberOfOwners || 1;
    if (!numberOfOwners || numberOfOwners === 1) {
      const ownerMatch = pageText.toLowerCase().match(/(\d+)(?:st|nd|rd|th)?\s*owner/);
      numberOfOwners = ownerMatch ? parseInt(ownerMatch[1]) : 1;
    }
    
    // Extract city (from specs, selectors, or URL)
    let city = specs.city || sellerInfo.city || $('.location, .city, [data-location]').first().text().trim();
    
    // Try to extract city from URL if not found
    if (!city || city === 'Unknown') {
      const urlCityMatch = url.match(/cars-([A-Za-z]+)_/);
      if (urlCityMatch) {
        city = urlCityMatch[1];
      } else {
        // Try to find city name in page text (look for "in [City]" pattern)
        const cityMatch = pageText.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),/);
        if (cityMatch) {
          city = cityMatch[1];
        } else {
          city = 'Unknown';
        }
      }
    }
    
    // Extract model from car name
    const nameParts = carName.split(' ');
    const model = nameParts.length > 1 ? nameParts.slice(1).join(' ') : carName;
    
    // Use seller name or default
    const ownerName = sellerInfo.name || 'CarDekho Seller';
    
    return {
      images: images.slice(0, 15),
      carName,
      model,
      price,
      ownerName,
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting CarDekho detail:', error);
    return null;
  }
}

/**
 * Extract car data from CarWale detail page
 */
function extractCarWaleDetail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  try {
    // Extract car name - CarWale uses specific classes
    const carName = $('h1.car-name, h1.vehicle-name, h1.used-car-name, h1').first().text().trim();
    
    if (!carName) return null;
    
    // Extract price - CarWale shows prices in specific format
    const priceText = $('.price, .car-price, .used-car-price, [data-price]').first().text().trim();
    const price = parsePrice(priceText);
    
    // Extract images using helper function
    const images = extractDetailImages($, url);
    
    // Extract specifications from table if available
    const specs = extractSpecTable($, '.specifications, .spec-table, .car-details, .overview-section');
    
    // Extract seller information
    const sellerInfo = extractSellerInfo($, '.seller-details, .dealer-info, .owner-info');
    
    // Fallback to page text for missing specs
    const pageText = $('body').text();
    
    // Extract year (from specs or page text)
    let year = specs.yearOfPurchase;
    if (!year) {
      const yearMatch = pageText.match(/\b(19\d{2}|20\d{2})\b/);
      year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
    }
    
    // Extract km driven (from specs or page text)
    let kmDriven = specs.kmDriven || 0;
    if (!kmDriven) {
      const kmMatch = pageText.match(/(\d[\d,]*)\s*(?:km|Km|KM)/i);
      kmDriven = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
    }
    
    // Extract number of owners (from specs or page text)
    let numberOfOwners = specs.numberOfOwners || 1;
    if (!numberOfOwners || numberOfOwners === 1) {
      const ownerMatch = pageText.toLowerCase().match(/(\d+)(?:st|nd|rd|th)?\s*owner/);
      numberOfOwners = ownerMatch ? parseInt(ownerMatch[1]) : 1;
    }
    
    // Extract city (from specs or selectors)
    const city = specs.city || sellerInfo.city || $('.location, .city, [data-location]').first().text().trim() || 'Unknown';
    
    // Extract model from car name
    const nameParts = carName.split(' ');
    const model = nameParts.length > 1 ? nameParts.slice(1).join(' ') : carName;
    
    // Use seller name or default
    const ownerName = sellerInfo.name || 'CarWale Seller';
    
    return {
      images: images.slice(0, 15),
      carName,
      model,
      price,
      ownerName,
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting CarWale detail:', error);
    return null;
  }
}

/**
 * Extract car data from Cars24 detail page
 */
function extractCars24Detail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  try {
    // Extract car name - Cars24 uses specific structure
    const carName = $('h1, h2.car-name, h1.car-title, [data-car-name]').first().text().trim();
    
    if (!carName) return null;
    
    // Extract price
    const priceText = $('.price, [data-price], .amount, .car-price').first().text().trim();
    const price = parsePrice(priceText);
    
    // Extract images using helper function
    const images = extractDetailImages($, url);
    
    // Extract specifications from table if available
    const specs = extractSpecTable($, '.specifications, .car-specs, .details-table, .overview');
    
    // Extract seller information
    const sellerInfo = extractSellerInfo($, '.seller-info, .dealer-details');
    
    // Fallback to page text for missing specs
    const pageText = $('body').text();
    
    // Extract year (from specs or page text)
    let year = specs.yearOfPurchase;
    if (!year) {
      const yearMatch = pageText.match(/\b(19\d{2}|20\d{2})\b/);
      year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
    }
    
    // Extract km driven (from specs or page text)
    let kmDriven = specs.kmDriven || 0;
    if (!kmDriven) {
      const kmMatch = pageText.match(/(\d[\d,]*)\s*(?:km|Km|KM)/i);
      kmDriven = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
    }
    
    // Extract number of owners (from specs or page text)
    let numberOfOwners = specs.numberOfOwners || 1;
    if (!numberOfOwners || numberOfOwners === 1) {
      const ownerMatch = pageText.toLowerCase().match(/(\d+)(?:st|nd|rd|th)?\s*owner/);
      numberOfOwners = ownerMatch ? parseInt(ownerMatch[1]) : 1;
    }
    
    // Extract city (from specs or selectors)
    const city = specs.city || sellerInfo.city || $('.location, .city, [data-location]').first().text().trim() || 'Unknown';
    
    // Extract model from car name
    const nameParts = carName.split(' ');
    const model = nameParts.length > 1 ? nameParts.slice(1).join(' ') : carName;
    
    // Use seller name or default
    const ownerName = sellerInfo.name || 'Cars24 Seller';
    
    return {
      images: images.slice(0, 15),
      carName,
      model,
      price,
      ownerName,
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting Cars24 detail:', error);
    return null;
  }
}

/**
 * Extract car data from OLX detail page
 */
function extractOLXDetail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  try {
    // Extract car name - OLX uses specific data attributes
    const carName = $('h1, [data-aut-id="itemTitle"], .ad-title').first().text().trim();
    
    if (!carName) return null;
    
    // Extract price - OLX shows prices with specific attributes
    const priceText = $('.price, [data-aut-id="itemPrice"], .ad-price').first().text().trim();
    const price = parsePrice(priceText);
    
    // Extract images using helper function
    const images = extractDetailImages($, url);
    
    // Extract specifications from table if available
    const specs = extractSpecTable($, '.details-list, .ad-details, .specifications');
    
    // Extract seller information
    const sellerInfo = extractSellerInfo($, '.seller-info, .user-info, [data-aut-id="seller"]');
    
    // Fallback to page text for missing specs
    const pageText = $('body').text();
    
    // Extract year (from specs or page text)
    let year = specs.yearOfPurchase;
    if (!year) {
      const yearMatch = pageText.match(/\b(19\d{2}|20\d{2})\b/);
      year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
    }
    
    // Extract km driven (from specs or page text)
    let kmDriven = specs.kmDriven || 0;
    if (!kmDriven) {
      const kmMatch = pageText.match(/(\d[\d,]*)\s*(?:km|Km|KM)/i);
      kmDriven = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
    }
    
    // Extract number of owners (from specs or page text)
    let numberOfOwners = specs.numberOfOwners || 1;
    if (!numberOfOwners || numberOfOwners === 1) {
      const ownerMatch = pageText.toLowerCase().match(/(\d+)(?:st|nd|rd|th)?\s*owner/);
      numberOfOwners = ownerMatch ? parseInt(ownerMatch[1]) : 1;
    }
    
    // Extract city (from specs or selectors)
    const city = specs.city || sellerInfo.city || $('.location, [data-aut-id="item-location"]').first().text().trim() || 'Unknown';
    
    // Extract model from car name
    const nameParts = carName.split(' ');
    const model = nameParts.length > 1 ? nameParts.slice(1).join(' ') : carName;
    
    // Use seller name or default
    const ownerName = sellerInfo.name || 'OLX Seller';
    
    return {
      images: images.slice(0, 15),
      carName,
      model,
      price,
      ownerName,
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting OLX detail:', error);
    return null;
  }
}

/**
 * Generic detail page extractor for unsupported websites
 * Uses common patterns to extract car data as fallback
 */
function extractGenericDetail($: cheerio.CheerioAPI, url: string): ScrapedCarData | null {
  try {
    // Extract car name using generic selectors
    const carName = extractCarName($);
    
    if (!carName) return null;
    
    // Extract price
    const price = extractPrice($);
    
    // Extract images using helper function (best effort)
    const images = extractDetailImages($, url);
    
    // Try to extract specs from any table-like structure
    const specs = extractSpecTable($, 'table, .details, .info, .specs');
    
    // Try to extract seller info
    const sellerInfo = extractSellerInfo($, '.seller, .owner, .dealer');
    
    // Extract year (from specs or generic extraction)
    const year = specs.yearOfPurchase || extractYear($);
    
    // Extract km driven (from specs or generic extraction)
    const kmDriven = specs.kmDriven || extractKmDriven($);
    
    // Extract number of owners (from specs or generic extraction)
    const numberOfOwners = specs.numberOfOwners || extractNumberOfOwners($);
    
    // Extract city (from specs or generic extraction)
    const city = specs.city || sellerInfo.city || extractCity($);
    
    // Extract model
    const model = extractModel($);
    
    // Return null if critical fields are missing
    if (!carName || !price || images.length === 0) {
      return null;
    }
    
    return {
      images: images.slice(0, 15),
      carName,
      model,
      price,
      ownerName: sellerInfo.name || 'Seller',
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
    };
  } catch (error) {
    console.error('Error extracting generic detail:', error);
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
    'img[data-src]',
    'img[data-lazy-src]',
    'img[data-original]',
    // Fallback to all images if nothing specific found
    'img',
  ];

  const seenUrls = new Set<string>();
  
  for (const selector of selectors) {
    $(selector).each((_, el) => {
      // Try multiple attributes for lazy-loaded images
      const src = $(el).attr('src') || 
                  $(el).attr('data-src') || 
                  $(el).attr('data-lazy') ||
                  $(el).attr('data-lazy-src') ||
                  $(el).attr('data-original') ||
                  $(el).attr('data-lazy-original') ||
                  $(el).attr('srcset')?.split(',')[0]?.split(' ')[0];
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
