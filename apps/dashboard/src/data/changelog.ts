export type ChangelogEntry = {
  version: string;
  date: string;
  features: string[];
  fixes?: string[];
  improvements?: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    version: "v1.2.2",
    date: "2026-08-09",
    features: [
      "Added delete confirmation popup (window.confirm) to prevent accidental deletions in Purchases and Sales."
    ],
    improvements: [
      "Implemented advanced search logic for specific models (e.g., Suppliers) using optimized PostgreSQL indexes (pg_trgm & GIN).",
      "Fixed database backup failing issue by utilizing Docker for correct PostgreSQL version matching."
    ],
    fixes: [
      "Resolved Prisma 'Decimal' object serialization error crashing the Products page."
    ]
  },
  {
    version: "v1.2.1",
    date: "2026-08-06",
    features: [
      "Added 'Load More' button functionality to all data tables for better pagination."
    ],
    improvements: [
      "Increased default data load limit from 5 to 15 items across all modules.",
      "Optimized search query speed (debounce reduced to 200ms) for instantly fetching results."
    ]
  },
  {
    version: "v1.2.0",
    date: "2026-08-01",
    features: [
      "Added 'Updates & Changelog' page to system menu.",
      "New 'System Updates' feature so clients can stay informed."
    ],
    improvements: [
      "Optimized sidebar layout for better visibility.",
      "Minor UI enhancements in settings."
    ],
    fixes: [
      "Fixed an issue with trailing spaces in environment variables.",
      "Fixed port assignment bug in storefront."
    ]
  },
  {
    version: "v1.1.0",
    date: "2026-07-25",
    features: [
      "Introduced comprehensive stock auditing system.",
      "Added multi-currency support in quotations."
    ],
    improvements: [
      "Improved barcode scanning speed by 30%.",
      "Better mobile responsiveness in POS."
    ],
    fixes: [
      "Resolved an issue where print receipts failed on older Safari versions.",
      "Fixed a bug related to stock transfer miscalculations."
    ]
  },
  {
    version: "v1.0.0",
    date: "2026-07-01",
    features: [
      "Initial Release of Tech Baria POS System.",
      "Inventory Management, Sales, Purchases, and Reports.",
      "Warranty Lookup and Claims Management."
    ]
  }
];
