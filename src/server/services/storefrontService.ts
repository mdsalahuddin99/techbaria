import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import type { HeroSlideCreateInput, HeroSlideUpdateInput } from "@/shared/validators/storefront";
import { requireRole } from "@/server/auth/rbac";

export const storefrontService = {
  /** List all hero slides, ordered by position */
  async listHeroSlides(ctx: Ctx) {
    return prisma.heroSlide.findMany({
      orderBy: { position: "asc" },
    });
  },

  /** Create a new hero slide. Requires MANAGER+ */
  async createHeroSlide(ctx: Ctx, input: HeroSlideCreateInput) {
    requireRole(ctx, "ADMIN");

    const slide = await prisma.heroSlide.create({
      data: {
        headline: input.headline,
        highlight: input.highlight ?? null,
        sub: input.sub ?? null,
        cta1: input.cta1,
        cta1Link: input.cta1Link,
        cta2: input.cta2 ?? null,
        cta2Link: input.cta2Link ?? null,
        imgUrl: input.imgUrl,
        gradient: input.gradient ?? null,
        position: input.position ?? 0,
        isActive: input.isActive ?? true,
      },
    });

    return slide;
  },

  /** Update a hero slide. Requires MANAGER+ */
  async updateHeroSlide(ctx: Ctx, id: string, input: HeroSlideUpdateInput) {
    requireRole(ctx, "ADMIN");

    const existing = await prisma.heroSlide.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new ServiceError("NOT_FOUND", "Hero slide not found", 404);
    }

    const slide = await prisma.heroSlide.update({
      where: { id },
      data: {
        headline: input.headline,
        highlight: input.highlight,
        sub: input.sub,
        cta1: input.cta1,
        cta1Link: input.cta1Link,
        cta2: input.cta2,
        cta2Link: input.cta2Link,
        imgUrl: input.imgUrl,
        gradient: input.gradient,
        position: input.position,
        isActive: input.isActive,
      },
    });

    return slide;
  },

  /** Delete a hero slide. Requires MANAGER+ */
  async deleteHeroSlide(ctx: Ctx, id: string) {
    requireRole(ctx, "ADMIN");

    const existing = await prisma.heroSlide.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new ServiceError("NOT_FOUND", "Hero slide not found", 404);
    }

    await prisma.heroSlide.delete({
      where: { id },
    });

    return { success: true };
  },
};
