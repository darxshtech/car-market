'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { scrapeListing, importScrapedListings } from '@/app/actions/admin';
import { ScrapedCarData } from '@/lib/scraper';

export default function AdminScraperPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrapedData, setScrapedData] = useState<ScrapedCarData[]>([]);
  const [importing, setImporting] = useState(false);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    setScrapedData([]);

    try {
      const result = await scrapeListing(url);
      
      if (result.success && result.data) {
        // result.data is now always an array
        setScrapedData(Array.isArray(result.data) ? result.data : [result.data]);
      } else {
        setError(result.error || 'Failed to scrape listing');
      }
    } catch (err) {
      console.error('Scraping error:', err);
      setError('An error occurred while scraping');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (scrapedData.length === 0) return;

    if (!confirm(`Are you sure you want to import ${scrapedData.length} listing(s)?`)) {
      return;
    }

    setImporting(true);
    setError('');

    try {
      const result = await importScrapedListings(scrapedData);
      
      console.log('Import result:', result);
      
      if (result.success) {
        alert(result.message || 'Listings imported successfully');
        setUrl('');
        setScrapedData([]);
      } else {
        const errorMessage = result.error || 'Failed to import listings';
        console.error('Import failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Import error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while importing';
      setError(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Web Scraper</h1>
            <p className="text-gray-400">Import car listings from external websites</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Scraper Form */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <form onSubmit={handleScrape} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
                External Listing URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/car-listing"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scraping...
                </span>
              ) : (
                'Scrape Listing'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Scraped Data Preview */}
        {scrapedData.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                Scraped Data Preview ({scrapedData.length} car{scrapedData.length > 1 ? 's' : ''})
              </h2>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : `Approve & Import All (${scrapedData.length})`}
              </button>
            </div>

            <div className="space-y-6">
              {scrapedData.map((car, carIdx) => (
                <div key={carIdx} className="border border-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Car #{carIdx + 1}
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Images */}
                    {car.images.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Images ({car.images.length})</p>
                        <div className="grid grid-cols-4 gap-2">
                          {car.images.slice(0, 4).map((img, idx) => (
                            <div key={idx} className="aspect-video bg-gray-700 rounded-lg overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt={`Car ${carIdx + 1} - ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-700">
                          <tr>
                            <td className="py-2 text-gray-400 font-medium w-1/3">Car Name</td>
                            <td className="py-2 text-white">{car.carName}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-400 font-medium">Model</td>
                            <td className="py-2 text-white">{car.model}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-400 font-medium">Price</td>
                            <td className="py-2 text-white">₹{car.price.toLocaleString('en-IN')}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-400 font-medium">Year</td>
                            <td className="py-2 text-white">{car.yearOfPurchase}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-400 font-medium">Kilometers</td>
                            <td className="py-2 text-white">{car.kmDriven.toLocaleString('en-IN')} km</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-400 font-medium">Owners</td>
                            <td className="py-2 text-white">{car.numberOfOwners}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-400 font-medium">City</td>
                            <td className="py-2 text-white">{car.city}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {scrapedData.length === 0 && !loading && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-3">How to use the scraper</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Enter the URL of a car listing page (supports both single cars and listing pages with multiple cars)</li>
              <li>Click &quot;Scrape Listing&quot; to extract the data</li>
              <li>Review the extracted data in the preview</li>
              <li>Click &quot;Approve & Import All&quot; to add the listings to the marketplace</li>
            </ol>
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
              <p className="text-yellow-200 text-sm font-medium mb-2">
                ⚠️ Note: Many car websites block automated scraping
              </p>
              <p className="text-yellow-100/80 text-sm">
                If scraping fails, try the demo mode by entering: <code className="bg-gray-800 px-2 py-1 rounded">https://demo.test</code>
              </p>
            </div>
            
            <p className="mt-4 text-sm text-gray-400">
              <strong>Supported sites:</strong> CarDekho.com, CarWale.com, and other car listing websites
            </p>
            <p className="mt-2 text-sm text-gray-400">
              <strong>Example URLs:</strong>
            </p>
            <ul className="mt-1 text-sm text-gray-400 list-disc list-inside ml-4">
              <li><strong>Demo Mode:</strong> https://demo.test (for testing)</li>
              <li>https://www.cardekho.com/used-cars+in+delhi</li>
              <li>https://www.cardekho.com/used-cars+in+mumbai</li>
              <li>https://www.carwale.com/used-cars/</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
