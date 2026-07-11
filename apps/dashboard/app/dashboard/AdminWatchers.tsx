'use client';

import { useProductsCacheBridge } from '@/features/products/useProductsCacheBridge';
import { useCustomersCacheBridge } from '@/features/customers/useCustomersCacheBridge';
import { useSuppliersCacheBridge } from '@/features/suppliers/useSuppliersCacheBridge';
import { useSalesCacheBridge } from '@/features/sales/useSalesCacheBridge';
import { useAccountsCacheBridge } from '@/features/accounts/useAccountsCacheBridge';
import { useTransfersCacheBridge } from '@/features/transfers/useTransfersCacheBridge';
import { useExpensesCacheBridge } from '@/features/expenses/useExpensesCacheBridge';
import { useProcurementCacheBridge } from '@/features/purchases/useProcurementCacheBridge';
import { useAdjustmentsCacheBridge } from '@/features/inventory/useAdjustmentsCacheBridge';
import { useWarrantyExpiryWatcher } from '@/features/notifications/useWarrantyExpiryWatcher';
import { useReorderAlertsWatcher } from '@/features/notifications/useReorderAlertsWatcher';

/**
 * Mounts all cache bridges and background watchers required by admin pages.
 * Intentionally kept in a single component so the admin layout only needs
 * one additional element. These bridges are NOT mounted on storefront,
 * marketing, or auth routes — saving ~10 API calls per page load.
 */
export function AdminWatchers() {
  useProductsCacheBridge();
  useCustomersCacheBridge();
  useSuppliersCacheBridge();
  useSalesCacheBridge();
  useAccountsCacheBridge();
  useTransfersCacheBridge();
  useExpensesCacheBridge();
  useProcurementCacheBridge();
  useAdjustmentsCacheBridge();
  useWarrantyExpiryWatcher();
  useReorderAlertsWatcher();
  return null;
}
