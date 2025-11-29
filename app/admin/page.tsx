import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Listing from '@/lib/models/Listing';

async function getDashboardMetrics() {
  await connectDB();

  const [totalUsers, totalListings, pendingApprovals] = await Promise.all([
    User.countDocuments(),
    Listing.countDocuments(),
    Listing.countDocuments({ status: 'pending' }),
  ]);

  return {
    totalUsers,
    totalListings,
    pendingApprovals,
  };
}

export default async function AdminDashboardPage() {
  const session = await getServerSession();

  // Check if user is admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session || session.user.email !== adminEmail) {
    redirect('/');
  }

  const metrics = await getDashboardMetrics();

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage DriveSphere marketplace</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Total Users</p>
                <p className="text-3xl font-bold text-white">{metrics.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Listings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Total Listings</p>
                <p className="text-3xl font-bold text-white">{metrics.totalListings}</p>
              </div>
              <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Pending Approvals</p>
                <p className="text-3xl font-bold text-white">{metrics.pendingApprovals}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/listings"
              className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <p className="text-white font-medium">Manage Listings</p>
                <p className="text-gray-400 text-sm">Approve or reject listings</p>
              </div>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <div>
                <p className="text-white font-medium">Manage Users</p>
                <p className="text-gray-400 text-sm">View and manage users</p>
              </div>
            </Link>

            <Link
              href="/admin/scraper"
              className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <div>
                <p className="text-white font-medium">Web Scraper</p>
                <p className="text-gray-400 text-sm">Import listings from external sources</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
