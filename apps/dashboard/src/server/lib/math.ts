import { Prisma } from "@prisma/client";

/**
 * Safe addition for financial values.
 * Uses Prisma.Decimal to avoid JS floating point errors.
 */
export function add(a: number | string | Prisma.Decimal, b: number | string | Prisma.Decimal): number {
  return new Prisma.Decimal(a || 0).plus(new Prisma.Decimal(b || 0)).toNumber();
}

/**
 * Safe subtraction for financial values.
 */
export function sub(a: number | string | Prisma.Decimal, b: number | string | Prisma.Decimal): number {
  return new Prisma.Decimal(a || 0).minus(new Prisma.Decimal(b || 0)).toNumber();
}

/**
 * Safe multiplication for financial values.
 */
export function mul(a: number | string | Prisma.Decimal, b: number | string | Prisma.Decimal): number {
  return new Prisma.Decimal(a || 0).times(new Prisma.Decimal(b || 0)).toNumber();
}

/**
 * Calculate total sum of an array of items safely.
 */
export function sumBy<T>(items: T[], fn: (item: T) => number | string | Prisma.Decimal): number {
  return items.reduce((acc, item) => add(acc, fn(item)), 0);
}

/**
 * Standard rounding to 2 decimal places.
 */
export function round(value: number | string | Prisma.Decimal, decimalPlaces = 2): number {
  return new Prisma.Decimal(value || 0).toDecimalPlaces(decimalPlaces).toNumber();
}
