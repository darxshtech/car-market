'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
              DriveSphere
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link
              href="/"
              className="text-gray-300 hover:text-cyan-400 px-3 py-2 text-sm font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              href="/buy-car"
              className="text-gray-300 hover:text-cyan-400 px-3 py-2 text-sm font-medium transition-colors"
            >
              Buy Car
            </Link>
            {status === 'authenticated' && session?.user?.profileComplete && (
              <>
                <Link
                  href="/sell-car"
                  className="text-gray-300 hover:text-cyan-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Sell Car
                </Link>
                <Link
                  href="/my-garage"
                  className="text-gray-300 hover:text-cyan-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  My Garage
                </Link>
              </>
            )}
            <Link
              href="/contact"
              className="text-gray-300 hover:text-cyan-400 px-3 py-2 text-sm font-medium transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Profile Section */}
          <div className="hidden md:flex md:items-center">
            {status === 'loading' ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : status === 'authenticated' ? (
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center space-x-2 text-gray-300 hover:text-cyan-400 focus:outline-none transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-medium">
                    {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium">{session.user?.name || session.user?.email}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-700">
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm text-gray-400">Signed in as</p>
                      <p className="text-sm font-medium text-white truncate">{session.user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-cyan-400 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/signin"
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-300 hover:text-cyan-400 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="block text-gray-300 hover:text-cyan-400 hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              href="/buy-car"
              onClick={closeMobileMenu}
              className="block text-gray-300 hover:text-cyan-400 hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Buy Car
            </Link>
            {status === 'authenticated' && session?.user?.profileComplete && (
              <>
                <Link
                  href="/sell-car"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-cyan-400 hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  Sell Car
                </Link>
                <Link
                  href="/my-garage"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-cyan-400 hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  My Garage
                </Link>
              </>
            )}
            <Link
              href="/contact"
              onClick={closeMobileMenu}
              className="block text-gray-300 hover:text-cyan-400 hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Mobile Profile Section */}
          <div className="pt-4 pb-3 border-t border-gray-700">
            {status === 'authenticated' ? (
              <div className="px-2 space-y-1">
                <div className="px-3 py-2">
                  <p className="text-sm text-gray-400">Signed in as</p>
                  <p className="text-sm font-medium text-white">{session.user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left text-gray-300 hover:text-cyan-400 hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="px-2">
                <Link
                  href="/signin"
                  onClick={closeMobileMenu}
                  className="block w-full text-center bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-base font-medium transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
