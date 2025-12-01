/**
 * Enhanced scraper using Puppeteer for client-side rendered pages
 * This scraper waits for JavaScript to load all content before extracting data
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface EnhancedScrapedData {
  // Basic info
  carName: string;
  model: string;
  price: number;
  yearOfPurchase: number;
  kmDriven: number;
  numberOfOwners: number;
  city: string;
  ownerName: string;
  images: string[];
  url: string;
  source: string;

  // Comprehensive data
  fuelType?: string;
  transmission?: string;
  variant?: string;
  color?: string;
  registrationYear?: number;
  insurance?: string;
  rto?: string;
  engineDisplacement?: string;
  mileage?: string;
  seatingCapacity?: number;
  bodyType?: string;
  
  // Features
  features?: string[];
  
  // Specifications
  specifications?: { [key: string]: string };
  
  // Pricing
  emiStartsAt?: string;
  newCarPrice?: string;
  
  // Additional
  description?: string;
}

export interface EnhancedScrapeResult {
  success: boolean;
  data?: EnhancedScrapedData;
  error?: string;
}

/**
 * Extract comprehensive car data using Puppeteer
 */
export async function extractWithPuppeteer(url: string): Promise<EnhancedScrapeResult> {
  let browser;
  
  try {
    console.log('🚀 Launching headless browser...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('📥 Loading page:', url);
    
    // Navigate to the page and wait for network to be idle
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('⏳ Waiting for content to load...');
    
    // Wait for key elements to appear (with timeout)
    try {
      await page.waitForSelector('h1, .car-title, .heading', { timeout: 5000 });
    } catch (e) {
      console.log('⚠️ Main heading not found, continuing anyway...');
    }

    // Scroll to load lazy-loaded images
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait a bit for lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📄 Extracting HTML content...');
    
    // Get the fully rendered HTML
    const html = await page.content();
    
    await browser.close();
    browser = undefined;

    console.log('✅ Page loaded successfully, parsing data...');

    // Now parse with cheerio
    const $ = cheerio.load(html);
    
    // Extract all data
    const data = extractComprehensiveData($, url);
    
    if (!data) {
      return {
        success: false,
        error: 'Failed to extract car data from the page',
      };
    }

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('❌ Error in Puppeteer scraping:', error);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during scraping',
    };
  }
}

/**
 * Extract comprehensive car data from fully rendered HTML
 */
function extractComprehensiveData($: cheerio.CheerioAPI, url: string): EnhancedScrapedData | null {
  try {
    // Get all text for pattern matching
    const pageText = $('body').text();

    // Extract car name
    const carName = $('h1').first().text().trim() ||
                    $('.car-title, .heading, [data-car-name]').first().text().trim();
    
    if (!carName) {
      console.error('❌ Car name not found');
      return null;
    }

    console.log('✓ Car name:', carName);

    // Extract price
    let price = 0;
    const priceSelectors = [
      '.price-section',
      '[itemprop="price"]',
      '.price',
      '.priceInfo',
      'strong:contains("₹")',
      '.amount',
      '[data-price]',
    ];

    for (const selector of priceSelectors) {
      const priceText = $(selector).first().text().trim();
      if (priceText) {
        price = parsePrice(priceText);
        if (price > 0) break;
      }
    }

    // Fallback to page text
    if (!price || price <= 0) {
      const priceMatch = pageText.match(/₹\s*([\d,]+(?:\.\d+)?)\s*(?:Lakh|Crore)/i);
      if (priceMatch) {
        price = parsePrice(priceMatch[0]);
      }
    }

    if (!price || price <= 0) {
      console.error('❌ Price not found');
      return null;
    }

    console.log('✓ Price:', price);

    // Extract year from car name first
    let year = 0;
    const yearInName = carName.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearInName) {
      year = parseInt(yearInName[1]);
    } else {
      // Fallback to page text
      const yearMatch = pageText.match(/(?:Year|Model|Registration).*?(20\d{2}|19\d{2})/i);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }
    }

    if (!year) {
      year = new Date().getFullYear();
    }

    console.log('✓ Year:', year);

    // Extract KM driven
    let kmDriven = 0;
    const kmMatch = pageText.match(/([\d,]+)\s*(?:km|Km|KM|kilometers)/i);
    if (kmMatch) {
      kmDriven = parseInt(kmMatch[1].replace(/,/g, ''));
    }

    console.log('✓ KM Driven:', kmDriven);

    // Extract number of owners
    let numberOfOwners = 1;
    const ownerMatch = pageText.match(/(\d+)(?:st|nd|rd|th)?\s*(?:owner|Owner)/i);
    if (ownerMatch) {
      numberOfOwners = parseInt(ownerMatch[1]);
    }

    console.log('✓ Owners:', numberOfOwners);

    // Extract city from URL or page
    let city = 'Unknown';
    const cityInUrl = url.match(/cars?-([A-Za-z]+)(?:_|\.)/);
    if (cityInUrl) {
      city = cityInUrl[1];
    } else {
      const cityMatch = pageText.match(/(?:City|Location|RTO).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (cityMatch) {
        city = cityMatch[1];
      }
    }

    console.log('✓ City:', city);

    // Extract images - comprehensive search
    const images: string[] = [];
    const imageSelectors = [
      '.gallery img',
      '.image-gallery img',
      '.car-images img',
      '.slider img',
      '.carousel img',
      '[data-gallery] img',
      '.photos img',
      'img[src*="usedcar"]',
      'img[src*="car"]',
    ];

    const seenUrls = new Set<string>();

    imageSelectors.forEach(selector => {
      $(selector).each((_, img) => {
        const src = extractImageUrl($(img));
        if (src && !seenUrls.has(src) && isValidCarImage(src, $(img))) {
          seenUrls.add(src);
          images.push(src);
        }
      });
    });

    // If still no images, try all img tags
    if (images.length === 0) {
      $('img').each((_, img) => {
        const src = extractImageUrl($(img));
        if (src && !seenUrls.has(src) && isValidCarImage(src, $(img))) {
          seenUrls.add(src);
          images.push(src);
        }
      });
    }

    console.log('✓ Images found:', images.length);

    if (images.length === 0) {
      console.error('❌ No images found');
      return null;
    }

    // Extract comprehensive details
    const fuelType = extractField(pageText, /(?:Fuel|Petrol|Diesel).*?(Petrol|Diesel|CNG|Electric|Hybrid)/i);
    const transmission = extractField(pageText, /(?:Transmission|Gearbox).*?(Manual|Automatic|AMT|CVT|DCT)/i);
    const variant = extractField(pageText, /(?:Variant|Version).*?([A-Z][A-Za-z0-9\s]+?)(?:\n|$)/i);
    const color = extractField(pageText, /(?:Color|Colour).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    
    const registrationYear = extractNumber(pageText, /(?:Registration|Reg).*?(20\d{2}|19\d{2})/i);
    const insurance = extractField(pageText, /(?:Insurance).*?([A-Za-z\s]+?)(?:\n|$)/i);
    const rto = extractField(pageText, /(?:RTO).*?([A-Z]{2}\d{1,2})/i);
    const engineDisplacement = extractField(pageText, /(?:Engine|Displacement).*?(\d+\.?\d*\s*(?:L|cc|CC))/i);
    const mileage = extractField(pageText, /(?:Mileage|ARAI).*?(\d+\.?\d*\s*(?:kmpl|km\/l))/i);
    const seatingCapacity = extractNumber(pageText, /(\d+)\s*(?:seater|Seater)/i);
    const bodyType = extractField(pageText, /(Hatchback|Sedan|SUV|MUV|Coupe|Convertible|Wagon)/i);

    // Extract features
    const features: string[] = [];
    const featureSelectors = [
      '.features li',
      '.feature-list li',
      '.amenities li',
      '.car-features li',
      '.highlights li',
      '[data-features] li',
    ];

    featureSelectors.forEach(selector => {
      $(selector).each((_, el) => {
        const feature = $(el).text().trim();
        if (feature && feature.length > 3 && feature.length < 100 && !features.includes(feature)) {
          features.push(feature);
        }
      });
    });

    // Extract specifications
    const specifications: { [key: string]: string } = {};
    
    // Try to find specification tables
    $('table, .specs-table, .specifications').each((_, table) => {
      $(table).find('tr').each((_, row) => {
        const cells = $(row).find('td, th');
        if (cells.length >= 2) {
          const key = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();
          if (key && value && key.length < 50 && value.length < 100) {
            specifications[key] = value;
          }
        }
      });
    });

    // Extract EMI and pricing info
    const emiStartsAt = extractField(pageText, /EMI starts @ ₹([\d,]+)/i);
    const newCarPrice = extractField(pageText, /New Car Price ₹([\d,\.]+)/i);

    // Extract description
    const description = $('.description, .car-description, [data-description]').first().text().trim() ||
                       `${carName} - ${year} model with ${kmDriven.toLocaleString()} km driven`;

    const data: EnhancedScrapedData = {
      carName,
      model: carName,
      price,
      yearOfPurchase: year,
      kmDriven,
      numberOfOwners,
      city,
      ownerName: 'CarDekho Seller',
      images: images.slice(0, 20), // Get up to 20 images
      url,
      source: 'cardekho.com',
      
      // Comprehensive data
      fuelType: fuelType || undefined,
      transmission: transmission || undefined,
      variant: variant || undefined,
      color: color || undefined,
      registrationYear: registrationYear || undefined,
      insurance: insurance || undefined,
      rto: rto || undefined,
      engineDisplacement: engineDisplacement || undefined,
      mileage: mileage || undefined,
      seatingCapacity: seatingCapacity || undefined,
      bodyType: bodyType || undefined,
      
      features: features.length > 0 ? features : undefined,
      specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
      
      emiStartsAt: emiStartsAt || undefined,
      newCarPrice: newCarPrice || undefined,
      
      description,
    };

    console.log('✅ Data extraction complete');
    console.log('   - Fuel:', data.fuelType || 'N/A');
    console.log('   - Transmission:', data.transmission || 'N/A');
    console.log('   - Features:', features.length);
    console.log('   - Specifications:', Object.keys(specifications).length);

    return data;

  } catch (error) {
    console.error('❌ Error extracting data:', error);
    return null;
  }
}

// Helper functions

function parsePrice(priceText: string): number {
  if (!priceText) return 0;
  
  const cleanText = priceText.replace(/[^\d.,]/g, '');
  const number = parseFloat(cleanText.replace(/,/g, ''));
  
  if (priceText.toLowerCase().includes('crore')) {
    return Math.round(number * 10000000);
  } else if (priceText.toLowerCase().includes('lakh')) {
    return Math.round(number * 100000);
  }
  
  return Math.round(number);
}

function extractImageUrl($img: cheerio.Cheerio<any>): string | null {
  const src = $img.attr('src') ||
              $img.attr('data-src') ||
              $img.attr('data-lazy-src') ||
              $img.attr('data-original') ||
              $img.attr('data-lazy');
  
  // Handle data-lazy boolean attribute
  if (src === '' || src === 'true' || src === 'false') {
    return null;
  }
  
  if (!src) return null;
  
  // Convert relative URLs to absolute
  if (src.startsWith('//')) {
    return 'https:' + src;
  } else if (src.startsWith('/')) {
    return 'https://www.cardekho.com' + src;
  }
  
  return src;
}

function isValidCarImage(src: string, $img: cheerio.Cheerio<any>): boolean {
  if (!src || src.length < 10) return false;
  
  const alt = $img.attr('alt') || '';
  const className = $img.attr('class') || '';
  
  // Skip logos, icons, placeholders
  const skipPatterns = [
    'logo', 'icon', 'sprite', 'placeholder', 'avatar',
    'banner', 'ad', 'advertisement', 'button', 'arrow',
    'play', 'video', 'youtube', 'social', 'footer',
    'header', 'menu', 'nav', 'badge', 'tag',
    '1x1', 'pixel', 'tracking', 'blank',
  ];
  
  const lowerSrc = src.toLowerCase();
  const lowerAlt = alt.toLowerCase();
  const lowerClass = className.toLowerCase();
  
  for (const pattern of skipPatterns) {
    if (lowerSrc.includes(pattern) || lowerAlt.includes(pattern) || lowerClass.includes(pattern)) {
      return false;
    }
  }
  
  // Must be a reasonable image URL
  return src.startsWith('http') && (
    src.includes('usedcar') ||
    src.includes('car') ||
    src.includes('vehicle') ||
    src.includes('gaadi') ||
    src.includes('image')
  );
}

function extractField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function extractNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match ? parseInt(match[1]) : null;
}
