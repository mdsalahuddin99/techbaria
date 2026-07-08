const fs = require('fs');

try {
  const content = fs.readFileSync('app/(dashboard)/dashboard/sales/create/CreateSaleClient.tsx', 'utf-8');

  const startIdx = content.indexOf('export function CreateSaleClient() {');
  const bodyStart = content.indexOf('{', startIdx) + 1;
  
  const renderStart = content.indexOf('// ── Render');
  const returnIdx = content.indexOf('  return (', renderStart);

  const hookBody = content.substring(bodyStart, returnIdx);

  const hookCode = `import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
import { productDisplayName, round2 } from '@/shared/lib/format';
import type { SalePayment, Sale, PaymentMethod } from '@/shared/lib/types';
import type { VoucherRow, ReceiptView, HeldSaleForPrint } from '@/features/sales/components';
import { usePosCoreData, posInitKeys } from '@/features/pos';
import { customersApi } from '@/shared/api-client/customers';
import { salesApi } from '@/shared/api-client/sales';
import { apiFetch } from '@/shared/api-client/fetch';
import { saleCreateSchema } from '@/shared/validators/sale';
import { useAccountsByType } from '@/features/accounts/hooks';

export function useCreateSale() {
${hookBody}

  return {
    searchParams, router, queryClient, editingSaleId, cashAccounts, session,
    selectedWarehouseId, setSelectedWarehouseId, warehouses, categories, users, settings, isLoading,
    voucherRows, setVoucherRows, voucherCustomerId, setVoucherCustomerId,
    voucherCategory, setVoucherCategory, voucherSubcategory, setVoucherSubcategory,
    voucherSearchQuery, setVoucherSearchQuery, showSuggestions, setShowSuggestions,
    payments, setPayments, walletAutoApplied, setWalletAutoApplied,
    receipt, setReceipt, receiptView, setReceiptView,
    cameraOpen, setCameraOpen, cameraScans, setCameraScans,
    isCheckingOut, setIsCheckingOut, saleLoading, setSaleLoading,
    salesPerson, setSalesPerson, destination, setDestination,
    attention, setAttention, invoiceDate, setInvoiceDate,
    narration, setNarration, quickName, setQuickName,
    quickPhone, setQuickPhone, heldOpen, setHeldOpen,
    draftPreview, setDraftPreview, vSearchRef, voucherRowRefs,
    heldSales, refetchHeldSales, currentCustomer, customers,
    loadDraftId, subtotal, invoiceTotal, addProductToVoucher,
    handleBarcodeEnter, changeQty, changeSerials, changeWarranty,
    changeDiscount, removeRow, clearVoucher, holdCurrentSale,
    resumeHeldSale, deleteHeldSale, handleCheckout, handleCameraBarcode
  };
}
`;

  fs.writeFileSync('app/(dashboard)/dashboard/sales/create/useCreateSale.ts', hookCode, 'utf-8');

  let newClientCode = content.substring(0, bodyStart) + `
  const {
    searchParams, router, queryClient, editingSaleId, cashAccounts, session,
    selectedWarehouseId, setSelectedWarehouseId, warehouses, categories, users, settings, isLoading,
    voucherRows, setVoucherRows, voucherCustomerId, setVoucherCustomerId,
    voucherCategory, setVoucherCategory, voucherSubcategory, setVoucherSubcategory,
    voucherSearchQuery, setVoucherSearchQuery, showSuggestions, setShowSuggestions,
    payments, setPayments, walletAutoApplied, setWalletAutoApplied,
    receipt, setReceipt, receiptView, setReceiptView,
    cameraOpen, setCameraOpen, cameraScans, setCameraScans,
    isCheckingOut, setIsCheckingOut, saleLoading, setSaleLoading,
    salesPerson, setSalesPerson, destination, setDestination,
    attention, setAttention, invoiceDate, setInvoiceDate,
    narration, setNarration, quickName, setQuickName,
    quickPhone, setQuickPhone, heldOpen, setHeldOpen,
    draftPreview, setDraftPreview, vSearchRef, voucherRowRefs,
    heldSales, refetchHeldSales, currentCustomer, customers,
    loadDraftId, subtotal, invoiceTotal, addProductToVoucher,
    handleBarcodeEnter, changeQty, changeSerials, changeWarranty,
    changeDiscount, removeRow, clearVoucher, holdCurrentSale,
    resumeHeldSale, deleteHeldSale, handleCheckout, handleCameraBarcode
  } = useCreateSale();

` + content.substring(returnIdx);

  const importStatement = "import { useCreateSale } from './useCreateSale';\n";
  // Remove existing import if present
  newClientCode = newClientCode.replace(importStatement, "");
  
  const lastImport = newClientCode.lastIndexOf('import ');
  const endOfLastImport = newClientCode.indexOf(';', lastImport) + 1;
  newClientCode = newClientCode.substring(0, endOfLastImport) + '\n' + importStatement + newClientCode.substring(endOfLastImport);

  fs.writeFileSync('app/(dashboard)/dashboard/sales/create/CreateSaleClient.tsx', newClientCode, 'utf-8');
  console.log('Successfully refactored files');
} catch (e) {
  console.error(e);
}
