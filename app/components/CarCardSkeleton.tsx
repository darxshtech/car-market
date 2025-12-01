export default function CarCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 animate-pulse">
      {/* Image Skeleton */}
      <div className="h-48 w-full bg-gray-700"></div>

      {/* Content Skeleton */}
      <div className="p-4">
        {/* Title */}
        <div className="h-6 bg-gray-700 rounded mb-2 w-3/4"></div>

        {/* Variant */}
        <div className="h-4 bg-gray-700 rounded mb-2 w-1/2"></div>

        {/* Price */}
        <div className="h-8 bg-gray-700 rounded mb-3 w-2/3"></div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>

        {/* Location and Owner */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-700">
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        </div>

        {/* Description */}
        <div className="mt-3 space-y-2">
          <div className="h-3 bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}
