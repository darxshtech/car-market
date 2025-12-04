import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
            <h2 className="text-4xl font-bold text-white mb-4">404 - Page Not Found</h2>
            <p className="text-gray-400 mb-8 text-center max-w-md">
                The page you are looking for does not exist or has been moved.
            </p>
            <Link
                href="/"
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
            >
                Return Home
            </Link>
        </div>
    );
}
