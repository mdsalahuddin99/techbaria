/**
 * Categories service — Prisma-backed, framework-agnostic.
 *
 * Categories form a self-referencing tree (parent → children).
 * Scoped directly for a single tenant.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { cache, cacheKeys, TTL } from "@/lib/cache";
import type { Ctx } from "@/server/lib/ctx";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CategoryOutput {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  productCount: number;
  children: CategoryOutput[];
  createdAt: string;
}

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  imageUrl?: string | null;
  parentId?: string | null;
}

export interface CategoryUpdateInput {
  name?: string;
  slug?: string;
  imageUrl?: string | null;
  parentId?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Recursively collect all child IDs for a given parent category. */
async function collectDescendantIds(parentId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const grandkids = await collectDescendantIds(child.id);
    ids.push(...grandkids);
  }
  return ids;
}

async function buildTree(): Promise<CategoryOutput[]> {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  const map = new Map<string, CategoryOutput>();
  const roots: CategoryOutput[] = [];

  for (const c of categories) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      imageUrl: c.imageUrl,
      productCount: (c as any)._count.products,
      children: [],
      createdAt: c.createdAt.toISOString(),
    });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ─── Service ────────────────────────────────────────────────────────────────

import { unstable_cache } from "next/cache";

export const categoriesService = {
  /** List all categories as a tree. */
  async list(ctx: Ctx): Promise<CategoryOutput[]> {
    const cachedTree = unstable_cache(
      async () => buildTree(),
      ['categories-tree'],
      { revalidate: 300, tags: ['categories'] }
    );
    return cachedTree();
  },

  /** Get flat list (no nesting) for dropdowns. */
  async listFlat(ctx: Ctx) {
    const cachedFlat = unstable_cache(
      async () => {
        const categories = await prisma.category.findMany({
          include: { _count: { select: { products: true } } },
          orderBy: { name: "asc" },
        });

        return categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parentId: c.parentId,
          imageUrl: c.imageUrl,
          productCount: c._count.products,
          createdAt: c.createdAt.toISOString(),
        }));
      },
      ['categories-flat'],
      { revalidate: 300, tags: ['categories'] }
    );
    return cachedFlat();
  },

  /** Get a single category by ID. */
  async getById(ctx: Ctx, id: string) {
    const c = await prisma.category.findFirst({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!c) throw new ServiceError("NOT_FOUND", "Category not found", 404);

    const cat = c as any;
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      imageUrl: cat.imageUrl,
      productCount: cat._count.products,
      createdAt: cat.createdAt.toISOString(),
    };
  },

  /** Create a new category. Requires MANAGER+. */
  async create(ctx: Ctx, input: CategoryCreateInput) {
    requireRole(ctx, "ADMIN");

    const slug = input.slug ?? slugify(input.name);

    // Check slug uniqueness
    const existing = await prisma.category.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ServiceError("CONFLICT", `A category with slug "${slug}" already exists`, 409);
    }

    // Verify parent if provided
    if (input.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new ServiceError("NOT_FOUND", "Parent category not found", 404);
      }
    }

    const c = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        imageUrl: input.imageUrl ?? null,
        parentId: input.parentId ?? null,
      },
    });

    await cache.invalidateCategories();

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      imageUrl: c.imageUrl,
      productCount: 0,
      createdAt: c.createdAt.toISOString(),
    };
  },

  /** Update a category. Requires MANAGER+. */
  async update(ctx: Ctx, id: string, input: CategoryUpdateInput) {
    requireRole(ctx, "ADMIN");

    const existing = await prisma.category.findUnique({
      where: { id },
    });
    if (!existing) throw new ServiceError("NOT_FOUND", "Category not found", 404);

    // If slug changed, check uniqueness
    const slug = input.slug ?? (input.name ? slugify(input.name) : undefined);
    if (slug && slug !== existing.slug) {
      const conflict = await prisma.category.findUnique({
        where: { slug },
      });
      if (conflict) {
        throw new ServiceError("CONFLICT", `A category with slug "${slug}" already exists`, 409);
      }
    }

    // Verify parent if provided
    if (input.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new ServiceError("NOT_FOUND", "Parent category not found", 404);
      }
      // Prevent setting self as parent
      if (input.parentId === id) {
        throw new ServiceError("VALIDATION", "A category cannot be its own parent", 400);
      }
    }

    const udpated = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(slug !== undefined && { slug }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
      },
      include: { _count: { select: { products: true } } },
    });

    await cache.invalidateCategories();

    const cat = udpated as any;
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      imageUrl: cat.imageUrl,
      productCount: cat._count.products,
      createdAt: cat.createdAt.toISOString(),
    };
  },

  /** Delete a category and all its children recursively. Requires MANAGER+. */
  async remove(ctx: Ctx, id: string) {
    requireRole(ctx, "ADMIN");

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new ServiceError("NOT_FOUND", "Category not found", 404);

    const cat = existing as any;
    if (cat._count.products > 0) {
      throw new ServiceError(
        "VALIDATION",
        `Cannot delete "${cat.name}" — ${cat._count.products} product(s) are assigned to it`,
        400,
      );
    }

    // Recursively collect all descendant IDs
    const allIds = await collectDescendantIds(id);
    allIds.push(id); // include the target itself

    // Delete all descendants + target in one transaction
    await prisma.$transaction(
      allIds.map((cid) => prisma.category.delete({ where: { id: cid } })),
    );

    await cache.invalidateCategories();
  },
};
