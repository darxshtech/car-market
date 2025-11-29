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
  const [scrapedData, setScrapedData] = useState<ScrapedCarData | null>(null);
  const [importing, setImporting] = useState(false);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    setScrapedData(null);

    try {
      const result = await scrapeListing(url);
      
      if (result.success && result.data) {
        setScrapedData(result.data);
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
    if (!scrapedData) return;

    if (!confirm('Are you sure you want to import this listing?')) {
      return;
    }

    setImporting(true);
    setError('');

    try {
      const result = await importScrapedListings([scrapedData]);
      
      if (result.success) {
        alert(result.message || 'Listing imported successfully');
        setUrl('');
        setScrapedData(null);
      } else {
        setError(result.error || 'Failed to import listing');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('An error occurred while importing');
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
        {scrapedData && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Scraped Data Preview</h2>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Approve & Import'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Images */}
              {scrapedData.images.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Images ({scrapedData.images.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {scrapedData.images.slice(0, 4).map((img, idx) => (
                      <div key={idx} className="aspect-video bg-gray-700 rounded-lg overflow-hidden">
                        <img src={img} alt={`Car ${idx + 1}`} className="w-full h-full object-cover" />
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
                      <td className="py-3 text-gray-400 font-medium">Car Name</td>
                      <td className="py-3 text-white">{scrapedData.carName}</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-400 font-medium">Model</td>
                      <td className="py-3 text-white">{scrapedData.model}</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-400 font-medium">Price</td>
                      <td className="py-3 text-white">₹{scrapedData.price.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-400 font-medium">Owner Name</td>
                      <td className="py-3 text-white">{scrapedData.ownerName}</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-400 font-medium">Year of Purchase</td>
                      <td className="py-3 text-white">{scrapedData.yearOfPurchase}</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-400 font-medium">Kilometers Driven</td>
                      <td className="py-3 text-white">{scrapedData.kmDriven.toLocaleString('en-IN')} km</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-400 font-medium">Number of Owners</td>
                      <td className="py-3 text-white">{scrapedData.numberOfOwners}</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-400 font-medium">City</td>
                      <td className="py-3 text-white">{scrapedData.city}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!scrapedData && !loading && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-3">How to use the scraper</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Enter the URL of an external car listing</li>
              <li>Click "Scrape Listing" to extract the data</li>
              <li>Review the extracted data in the preview table</li>
              <li>Click "Approve & Import" to add the listing to the marketplace</li>
            </ol>
            <p className="mt-4 text-sm text-gray-400">
              Note: The scraper will attempt to extract car details, images, and pricing information from the provided URL.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
