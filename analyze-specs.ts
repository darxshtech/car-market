import * as cheerio from 'cheerio';

const testUrl = 'https://www.cardekho.com/used-car-details/used-Jeep-compass-14-anniversary-edition-dct-bsvi-cars-Pune_eef3cf20-3cef-494d-9e45-633ba2fed774.htm?adId=16284&adType=41';

fetch(testUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
})
  .then(response => response.text())
  .then(html => {
    const $ = cheerio.load(html);
    const bodyText = $('body').text();
    
    console.log('=== CAR SPECIFICATIONS ===\n');
    
    // Extract all specifications
    const specs = {
      registrationYear: bodyText.match(/Registration Year[:\s]*(\d{4})/)?.[1],
      insuranceValidity: bodyText.match(/Insurance Validity[:\s]*([^•\n]+)/)?.[1]?.trim(),
      fuelType: bodyText.match(/Fuel Type[:\s]*([^•\n]+)/)?.[1]?.trim() || bodyText.match(/Petrol|Diesel|CNG|Electric/)?.[0],
      seats: bodyText.match(/Seats[:\s]*(\d+)/)?.[1] || bodyText.match(/(\d+)\s*[Ss]eats/)?.[1],
      kmsDriven: bodyText.match(/Kms Driven[:\s]*([\d,]+)/)?.[1] || bodyText.match(/([\d,]+)\s*km/)?.[1],
      rto: bodyText.match(/RTO[:\s]*([^•\n]+)/)?.[1]?.trim(),
      ownership: bodyText.match(/Ownership[:\s]*([^•\n]+)/)?.[1]?.trim() || bodyText.match(/(\d+)(?:st|nd|rd|th)\s*Owner/)?.[0],
      engineDisplacement: bodyText.match(/Engine Displacement[:\s]*([\d,]+)/)?.[1],
      transmission: bodyText.match(/Transmission[:\s]*([^•\n]+)/)?.[1]?.trim() || bodyText.match(/Automatic|Manual/)?.[0],
      yearOfManufacture: bodyText.match(/Year of Manufacture[:\s]*(\d{4})/)?.[1],
      color: bodyText.match(/Color[:\s]*([^•\n]+)/)?.[1]?.trim() || bodyText.match(/White|Black|Silver|Red|Blue|Grey/)?.[0],
      variant: bodyText.match(/Anniversary Edition DCT BSVI/)?.[0],
    };
    
    console.log('Basic Specs:');
    Object.entries(specs).forEach(([key, value]) => {
      if (value) console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n=== SELLER INFORMATION ===\n');
    const seller = {
      location: bodyText.match(/Paschimanagri, Kothrud, Pune/)?.[0] || 
                bodyText.match(/([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*,\s*Pune)/)?.[0],
      type: bodyText.match(/Individual|Dealer/)?.[0],
    };
    
    Object.entries(seller).forEach(([key, value]) => {
      if (value) console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n=== PRICING ===\n');
    const pricing = {
      price: bodyText.match(/₹\s*([\d.]+)\s*Lakh/)?.[0],
      emi: bodyText.match(/EMI starts @ ₹([\d,]+)/)?.[0],
      newCarPrice: bodyText.match(/New Car Price ₹([\d.]+)\s*Lakh/)?.[0],
    };
    
    Object.entries(pricing).forEach(([key, value]) => {
      if (value) console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n=== ADDITIONAL INFO ===\n');
    console.log('  Views:', bodyText.match(/Viewed by ([\d,]+\+?) users/)?.[0]);
    console.log('  Ad Type:', bodyText.match(/adType=(\d+)/)?.[1]);
    
  })
  .catch(error => {
    console.error('Error:', error);
  });
