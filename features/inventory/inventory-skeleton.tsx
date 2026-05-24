import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

function ItemSkeleton() {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-3/5 rounded-lg" />
        <Skeleton className="h-3 w-2/5 rounded-lg" />
      </View>
      <Skeleton className="h-6 w-16 rounded-full" />
    </View>
  );
}

export function InventorySkeleton() {
  return (
    <View className="flex-1 bg-background">
      {/* hero skeleton */}
      <View className="bg-[#EDEFFD] px-5 pb-6 pt-4">
        <Skeleton className="mb-3 h-7 w-2/5 rounded-xl bg-[#C7C9F9]" />
        <Skeleton className="mb-4 h-8 w-3/5 rounded-xl bg-[#C7C9F9]" />
        <View className="flex-row gap-2">
          <Skeleton className="h-7 w-28 rounded-full bg-[#C7C9F9]" />
          <Skeleton className="h-7 w-28 rounded-full bg-[#C7C9F9]" />
        </View>
      </View>

      {/* list skeleton */}
      <View className="mt-4">
        <Skeleton className="mx-4 mb-2 h-4 w-24 rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <ItemSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}
