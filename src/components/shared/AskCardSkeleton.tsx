import { Card, CardContent, CardFooter, CardHeader } from './ui/card';

export function AskCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar skeleton */}
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="space-y-2">
              {/* Name skeleton */}
              <div className="h-5 w-32 bg-gray-200 rounded" />
              {/* Instrument skeleton */}
              <div className="h-4 w-24 bg-gray-200 rounded" />
              {/* Posted time skeleton */}
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="text-right space-y-2">
            {/* Badge skeleton */}
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
            {/* Price skeleton */}
            <div className="h-8 w-24 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Timer skeleton */}
        <div className="pt-3 border-t">
          <div className="h-5 w-32 bg-gray-200 rounded" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 rounded" />
        </div>

        {/* Details skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
      </CardContent>

      <CardFooter>
        <div className="h-10 w-full bg-gray-200 rounded" />
      </CardFooter>
    </Card>
  );
}
