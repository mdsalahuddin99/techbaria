export interface ProductListFilter {
  search?: string;
  categoryId?: string;
  isPublished?: boolean;
  lowStock?: boolean;
}

export interface ProductCreateInput {
  sku: string;
  barcode?: string;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  imageUrl?: string;
  galleryImages?: string[];
  price: number;
  cost?: number;
  stock?: number;
  reorderLevel?: number;
  unit?: string;
  isPublished?: boolean;
  // Extended fields
  brand?: string;
  model?: string;
  series?: string;
  subcategory?: string;
  color?: string;
  storage?: string;
  ram?: string;
  condition?: string;
  emoji?: string;
  wholesalePrice?: number;
  supplierId?: string | null;
  trackSerials?: boolean;
  warrantyStartDate?: string;
  warrantyMonths?: number;
}

export interface ProductUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string | null;
  imageUrl?: string | null;
  galleryImages?: string[];
  price?: number;
  cost?: number;
  stock?: number;
  reorderLevel?: number;
  unit?: string;
  isPublished?: boolean;
  isTrending?: boolean;
  barcode?: string;
  // Extended fields
  brand?: string;
  model?: string;
  series?: string;
  subcategory?: string;
  color?: string;
  storage?: string;
  ram?: string;
  condition?: string;
  emoji?: string;
  wholesalePrice?: number;
  supplierId?: string | null;
  trackSerials?: boolean;
  warrantyStartDate?: string;
  warrantyMonths?: number;
}
