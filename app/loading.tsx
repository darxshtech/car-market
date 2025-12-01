export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 text-lg">Loading...</p>
      </div>
    </div>
  );
}
