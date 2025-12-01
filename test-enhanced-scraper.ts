import { extractWithPuppeteer } from './lib/scraper-enhanced';

const testUrl = 'https://www.cardekho.com/used-car-details/used-Jeep-compass-14-anniversary-edition-dct-bsvi-cars-Pune_eef3cf20-3cef-494d-9e45-633ba2fed774.htm?adId=16284&adType=41';

console.log('🚗 TESTING ENHANCED PUPPETEER SCRAPER');
console.log('='.repeat(80));
console.log('URL:', testUrl);
console.log('='.repeat(80));
console.log('');

extractWithPuppeteer(testUrl)
  .then(result => {
    if (result.success && result.data) {
      const data = result.data;
      
      console.log('\n✅ SCRAPING SUCCESSFUL!\n');
      console.log('='.repeat(80));
      console.log('📋 BASIC INFORMATION');
      console.log('='.repeat(80));
      console.log('Car Name:', data.carName);
      console.log('Model:', data.model);
      console.log('Price: ₹', data.price.toLocaleString('en-IN'));
      console.log('Year:', data.yearOfPurchase);
      console.log('KM Driven:', data.kmDriven.toLocaleString('en-IN'), 'km');
      console.log('Owners:', data.numberOfOwners);
      console.log('City:', data.city);
      
      console.log('\n' + '='.repeat(80));
      console.log('🔍 COMPREHENSIVE DETAILS');
      console.log('='.repeat(80));
      console.log('Fuel Type:', data.fuelType || 'N/A');
      console.log('Transmission:', data.transmission || 'N/A');
      console.log('Variant:', data.variant || 'N/A');
      console.log('Color:', data.color || 'N/A');
      console.log('Registration Year:', data.registrationYear || 'N/A');
      console.log('Insurance:', data.insurance || 'N/A');
      console.log('RTO:', data.rto || 'N/A');
      console.log('Engine:', data.engineDisplacement || 'N/A');
      console.log('Mileage:', data.mileage || 'N/A');
      console.log('Seating:', data.seatingCapacity || 'N/A');
      console.log('Body Type:', data.bodyType || 'N/A');
      
      if (data.features && data.features.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log(`✨ FEATURES (${data.features.length} found)`);
        console.log('='.repeat(80));
        data.features.slice(0, 10).forEach((feature, i) => {
          console.log(`${i + 1}. ${feature}`);
        });
        if (data.features.length > 10) {
          console.log(`... and ${data.features.length - 10} more`);
        }
      }
      
      if (data.specifications && Object.keys(data.specifications).length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log(`⚙️ SPECIFICATIONS (${Object.keys(data.specifications).length} found)`);
        console.log('='.repeat(80));
        Object.entries(data.specifications).slice(0, 10).forEach(([key, value]) => {
          console.log(`${key}: ${value}`);
        });
        if (Object.keys(data.specifications).length > 10) {
          console.log(`... and ${Object.keys(data.specifications).length - 10} more`);
        }
      }
      
      console.log('\n' + '='.repeat(80));
      console.log(`📸 IMAGES (${data.images.length} found)`);
      console.log('='.repeat(80));
      data.images.slice(0, 5).forEach((img, i) => {
        console.log(`${i + 1}. ${img.substring(0, 80)}...`);
      });
      if (data.images.length > 5) {
        console.log(`... and ${data.images.length - 5} more`);
      }
      
      if (data.emiStartsAt || data.newCarPrice) {
        console.log('\n' + '='.repeat(80));
        console.log('💰 PRICING INFO');
        console.log('='.repeat(80));
        if (data.emiStartsAt) console.log('EMI Starts At:', data.emiStartsAt);
        if (data.newCarPrice) console.log('New Car Price:', data.newCarPrice);
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('📊 DATA COMPLETENESS SUMMARY');
      console.log('='.repeat(80));
      
      const completeness = {
        'Basic Info': 7,
        'Fuel Type': data.fuelType ? 1 : 0,
        'Transmission': data.transmission ? 1 : 0,
        'Variant': data.variant ? 1 : 0,
        'Color': data.color ? 1 : 0,
        'Registration': data.registrationYear ? 1 : 0,
        'Insurance': data.insurance ? 1 : 0,
        'RTO': data.rto ? 1 : 0,
        'Engine': data.engineDisplacement ? 1 : 0,
        'Mileage': data.mileage ? 1 : 0,
        'Seating': data.seatingCapacity ? 1 : 0,
        'Body Type': data.bodyType ? 1 : 0,
        'Features': data.features && data.features.length > 0 ? 1 : 0,
        'Specifications': data.specifications && Object.keys(data.specifications).length > 0 ? 1 : 0,
        'Images': data.images.length > 0 ? 1 : 0,
      };
      
      const total = Object.values(completeness).reduce((a, b) => a + b, 0);
      const max = Object.keys(completeness).length + 6; // 7 basic + 14 additional
      const percentage = Math.round((total / max) * 100);
      
      Object.entries(completeness).forEach(([key, value]) => {
        console.log(`${value ? '✅' : '❌'} ${key}`);
      });
      
      console.log('\n' + '='.repeat(80));
      console.log(`🎯 OVERALL COMPLETENESS: ${percentage}%`);
      console.log('='.repeat(80));
      
      if (percentage >= 80) {
        console.log('✅ EXCELLENT - Comprehensive data extracted!');
      } else if (percentage >= 60) {
        console.log('✓ GOOD - Most data extracted');
      } else {
        console.log('⚠️ FAIR - Basic data extracted');
      }
      
    } else {
      console.log('\n❌ SCRAPING FAILED');
      console.log('Error:', result.error);
    }
  })
  .catch(error => {
    console.error('\n💥 EXCEPTION:', error.message);
    console.error(error.stack);
  });
