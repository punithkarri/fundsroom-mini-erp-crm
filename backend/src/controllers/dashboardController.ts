import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { ChallanStatus, CustomerStatus } from '@prisma/client';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Fetch KPI counts
    const totalCustomers = await prisma.customer.count();
    const activeCustomers = await prisma.customer.count({
      where: { status: CustomerStatus.ACTIVE },
    });

    const totalProducts = await prisma.product.count();
    
    // Fallback low stock logic: read all and filter in JS if schema direct field comparison has query limit,
    // or run raw SQL query. A raw SQL query is clean and performs well:
    // SELECT COUNT(*)::int FROM "Product" WHERE "currentStock" <= "minimumStock"
    const lowStockCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count FROM "Product" WHERE "currentStock" <= "minimumStock"
    `;
    const lowStockProductsCount = Number(lowStockCountResult[0]?.count || 0);

    const totalChallans = await prisma.salesChallan.count();
    const draftChallans = await prisma.salesChallan.count({
      where: { status: ChallanStatus.DRAFT },
    });
    const confirmedChallans = await prisma.salesChallan.count({
      where: { status: ChallanStatus.CONFIRMED },
    });

    // Pending/Upcoming follow-ups: follow-ups scheduled for today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingFollowUpsCount = await prisma.customer.count({
      where: {
        followUpDate: {
          gte: today,
        },
      },
    });

    // 2. Fetch Recent Challans (limit 5)
    const recentChallans = await prisma.salesChallan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            customerName: true,
            businessName: true,
          },
        },
      },
    });

    // 3. Fetch Recent Stock Movements (limit 5)
    const recentStockMovements = await prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            productName: true,
            sku: true,
          },
        },
        creator: {
          select: {
            name: true,
          },
        },
      },
    });

    // 4. Fetch Low Stock Products details (limit 5 for dashboard preview)
    const lowStockProducts = await prisma.$queryRaw<any[]>`
      SELECT id, "productName", sku, category, "currentStock", "minimumStock", "warehouseLocation"
      FROM "Product"
      WHERE "currentStock" <= "minimumStock"
      ORDER BY "currentStock" ASC
      LIMIT 5
    `;

    // 5. Fetch Upcoming CRM Follow-ups details (limit 5)
    const upcomingFollowUps = await prisma.customer.findMany({
      where: {
        followUpDate: {
          gte: today,
        },
      },
      take: 5,
      orderBy: { followUpDate: 'asc' },
      select: {
        id: true,
        customerName: true,
        businessName: true,
        followUpDate: true,
        notes: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          activeCustomers,
          totalProducts,
          lowStockProductsCount,
          totalChallans,
          draftChallans,
          confirmedChallans,
          upcomingFollowUpsCount,
        },
        recentChallans,
        recentStockMovements,
        lowStockProducts,
        upcomingFollowUps,
      },
    });
  } catch (err) {
    next(err);
  }
};
