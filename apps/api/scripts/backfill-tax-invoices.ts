import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { extractVat } from '../src/modules/billing/domain/vat.calculator';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:54329/kids_fashion?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const TAX_REDUCTION_START = new Date('2025-07-01T00:00:00.000Z');

async function main() {
  console.log('--- Starting Backfill of Tax & VAT on Orders ---');

  const orders = await prisma.order.findMany({
    where: {
      taxRateBps: null,
    },
    select: {
      id: true,
      totalAmount: true,
      createdAt: true,
    },
  });

  console.log(`Found ${orders.length} orders needing tax backfill.`);

  let updatedCount = 0;
  for (const order of orders) {
    // 8% (800 bps) from 2025-07-01 onwards, 10% (1000 bps) prior
    const rateBps = order.createdAt >= TAX_REDUCTION_START ? 800 : 1000;
    const { net, vat } = extractVat(order.totalAmount, rateBps);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        taxRateBps: rateBps,
        taxAmount: vat,
        netAmount: net,
      },
    });
    updatedCount++;
  }

  console.log(`Successfully backfilled ${updatedCount} orders.`);
}

main()
  .catch((err) => {
    console.error('Error during tax backfill:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
