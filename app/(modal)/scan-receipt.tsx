import React from 'react';
import { router } from 'expo-router';
import { ReceiptScanner } from '@/features/scan-receipt';

export default function ScanReceiptModal() {
  return (
    <ReceiptScanner
      onDone={() => router.back()}
      onCancel={() => router.back()}
    />
  );
}
