import * as cheerio from 'cheerio';

const testUrl = 'https://www.cardekho.com/used-car-details/used-Jeep-compass-14-anniversary-edition-dct-bsvi-cars-Pune_eef3cf20-3cef-494d-9e45-633ba2fed774.htm?adId=16284&adType=41';

fetch(testUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
})
  .then(response => response.text())
  .then(html => {
    const $ = cheerio.load(html);
    
    console.log('=== ANALYZING FULL PAGE DATA ===\n');
    
    // Get all text content
    const bodyText = $('body').text();
    
    // Look for Overview section
    console.log('=== OVERVIEW DATA ===');
    console.log('Registration Year:', bodyText.match(/Registration Year[:\s]*(\d{4})/)?.[1]);
    console.log('Insurance Validity:', bodyText.match(/Insurance Validity[:\s]*([^•\n]+)/)?.[1]?.trim());
    console.log('Fuel Type:', bodyText.match(/Fuel Type[:\s]*([^•\n]+)/)?.[1]?.trim());
    console.log('Seats:', bodyText.match(/Seats[:\s]*(\d+)/)?.[1]);
    console.log('Kms Driven:', bodyText.match(/Kms Driven[:\s]*([\d,]+)/)?.[1]);
    console.log('RTO:', bodyText.match(/RTO[:\s]*([^•\n]+)/)?.[1]?.trim());
    console.log('Ownership:', bodyText.match(/Ownership[:\s]*([^•\n]+)/)?.[1]?.trim());
    console.log('Engine Displacement:', bodyText.match(/Engine Displacement[:\s]*([\d,]+)/)?.[1]);
    console.log('Transmission:', bodyText.match(/Transmission[:\s]*([^•\n]+)/)?.[1]?.trim());
    console.log('Year of Manufacture:', bodyText.match(/Year of Manufacture[:\s]*(\d{4})/)?.[1]);
    
    // Look for Features
    console.log('\n=== FEATURES ===');
    const featuresMatch = bodyText.match(/Features[:\s]*([^]+?)(?=Specifications|$)/);
    if (featuresMatch) {
      console.log('Features section found');
      // Try to extract feature list
      const features = bodyText.match(/Powered Front Seats|Sunroof|Leather Seats|Alloy Wheels|ABS|Airbags|Climate Control|Cruise Control|Parking Sensors|Rear Camera/g);
      if (features) {
        console.log('Features:', features.join(', '));
      }
    }
    
    // Look for Specifications
    console.log('\n=== SPECIFICATIONS ===');
    console.log('Engine:', bodyText.match(/Engine[:\s]*([\d.]+\s*[Ll])/)?.[1]);
    console.log('Power:', bodyText.match(/Power[:\s]*([\d.]+\s*bhp)/)?.[1]);
    console.log('Torque:', bodyText.match(/Torque[:\s]*([\d.]+\s*Nm)/)?.[1]);
    console.log('Mileage:', bodyText.match(/Mileage[:\s]*([\d.]+\s*kmpl)/)?.[1]);
    console.log('Fuel Tank:', bodyText.match(/Fuel Tank[:\s]*([\d.]+\s*[Ll])/)?.[1]);
    
    // Look for Description
    console.log('\n=== DESCRIPTION ===');
    const descMatch = bodyText.match(/Description[:\s]*([^]+?)(?=Features|Specifications|$)/);
    if (descMatch) {
      console.log('Description:', descMatch[1].substring(0, 200) + '...');
    }
    
    // Look for Seller Details
    console.log('\n=== SELLER DETAILS ===');
    console.log('Location:', bodyText.match(/Paschimanagri, Kothrud, Pune/)?.[0]);
    console.log('Seller Type:', bodyText.match(/Individual|Dealer/)?.[0]);
    
    // Look for all structured data
    console.log('\n=== ALL KEY-VALUE PAIRS ===');
    const lines = bodyText.split('\n').filter(line => line.includes(':') && line.length < 100);
    lines.slice(0, 30).forEach(line => {
      if (line.trim()) console.log(line.trim());
    });
    
    // Count total images
    console.log('\n=== IMAGE COUNT ===');
    const allImages = $('img').length;
    const carImages = $('img').filter((i, img) => {
      const src = $(img).attr('src') || '';
      return src.includes('gaadi') || src.includes('usedcar');
    }).length;
    console.log(`Total images: ${allImages}`);
    console.log(`Car images: ${carImages}`);
  })
  .catch(error => {
    console.error('Error:', error);
  });
