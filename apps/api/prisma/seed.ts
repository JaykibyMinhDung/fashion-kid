import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/common/security/password-hasher';
import {
  EntityStatus,
  InventoryTxType,
  PrismaClient,
  ProductGender,
  ProductStatus,
  UserStatus,
  VariantStatus,
} from '../src/generated/prisma/client';

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Demo seed is disabled in production; provision production identities through an approved administrative process',
  );
}

function getRequiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const connectionString = getRequiredEnvironment('DATABASE_URL');
const demoPassword = getRequiredEnvironment('DEMO_PASSWORD');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const roleSeeds = [
  ['CUSTOMER', 'Khách hàng', 'Mua hàng và quản lý tài khoản cá nhân'],
  [
    'SALES_STAFF',
    'Nhân viên bán hàng',
    'Xử lý đơn hàng và chăm sóc khách hàng',
  ],
  ['WAREHOUSE_STAFF', 'Nhân viên kho', 'Quản lý nhập, điều chỉnh và xuất kho'],
  ['ADMIN', 'Quản trị viên', 'Quản trị toàn bộ hệ thống'],
] as const;

const userSeeds = [
  {
    email: 'customer@mam-nho.local',
    fullName: 'Khách hàng Demo',
    roleCode: 'CUSTOMER',
    status: UserStatus.ACTIVE,
  },
  {
    email: 'disabled-customer@mam-nho.local',
    fullName: 'Khách hàng Bị khóa Demo',
    roleCode: 'CUSTOMER',
    status: UserStatus.DISABLED,
  },
  {
    email: 'sales@mam-nho.local',
    fullName: 'Nhân viên Bán hàng Demo',
    roleCode: 'SALES_STAFF',
    status: UserStatus.ACTIVE,
  },
  {
    email: 'warehouse@mam-nho.local',
    fullName: 'Nhân viên Kho Demo',
    roleCode: 'WAREHOUSE_STAFF',
    status: UserStatus.ACTIVE,
  },
  {
    email: 'admin@mam-nho.local',
    fullName: 'Quản trị viên Demo',
    roleCode: 'ADMIN',
    status: UserStatus.ACTIVE,
  },
] as const;

const sizeSeeds = ['60', '70', '80', '90', '100', '110', '120'] as const;

const colorSeeds = [
  ['CREAM', 'Kem', '#F6F1E9'],
  ['CORAL', 'Coral', '#DF6C50'],
  ['SAGE', 'Sage', '#788A67'],
  ['APRICOT', 'Apricot', '#EDB273'],
  ['BEIGE', 'Be', '#D8C6AA'],
] as const;

const productSeeds = [
  {
    name: 'Set áo khoác Coral',
    slug: 'set-ao-khoac-coral',
    categorySlug: 'bo-mac-ngoai',
    gender: ProductGender.UNISEX,
    ageGroup: '2-5 tuổi',
    status: ProductStatus.ACTIVE,
    imageUrl: '/images/product-coral-cardigan.png',
    imageAlt: 'Áo khoác len màu coral phối cùng romper màu kem',
    sku: 'MAM-CORAL-90',
    sizeCode: '90',
    colorCode: 'CORAL',
    price: 349_000n,
    stock: 18,
    dimensions: { weightGrams: 420, lengthCm: 30, widthCm: 24, heightCm: 8 },
  },
  {
    name: 'Set sơ mi Sage',
    slug: 'set-so-mi-sage',
    categorySlug: 'be-trai',
    gender: ProductGender.BOY,
    ageGroup: '2-6 tuổi',
    status: ProductStatus.ACTIVE,
    imageUrl: '/images/product-sage-set.png',
    imageAlt: 'Áo sơ mi linen xanh sage phối quần short màu be',
    sku: 'MAM-SAGE-100',
    sizeCode: '100',
    colorCode: 'SAGE',
    price: 289_000n,
    stock: 24,
    dimensions: { weightGrams: 350, lengthCm: 28, widthCm: 22, heightCm: 7 },
  },
  {
    name: 'Romper Muslin Apricot',
    slug: 'romper-muslin-apricot',
    categorySlug: 'so-sinh',
    gender: ProductGender.UNISEX,
    ageGroup: '0-2 tuổi',
    status: ProductStatus.DISABLED,
    imageUrl: '/images/product-apricot-romper.png',
    imageAlt: 'Romper muslin màu kem với mũ bonnet màu apricot',
    sku: 'MAM-APRICOT-70',
    sizeCode: '70',
    colorCode: 'APRICOT',
    price: 239_000n,
    stock: 12,
    dimensions: { weightGrams: 220, lengthCm: 24, widthCm: 18, heightCm: 6 },
  },
] as const;

async function seed(): Promise<void> {
  const passwordHash = await hashPassword(demoPassword);
  const roleByCode = new Map<string, string>();

  for (const [code, name, description] of roleSeeds) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name, description },
      create: { code, name, description },
    });
    roleByCode.set(code, role.id);
  }

  const userByEmail = new Map<string, string>();
  for (const { email, fullName, roleCode, status } of userSeeds) {
    const roleId = roleByCode.get(roleCode);
    if (!roleId) {
      throw new Error(`Seed role not found: ${roleCode}`);
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        roleId,
        fullName,
        passwordHash,
        status,
      },
      create: {
        roleId,
        email,
        fullName,
        passwordHash,
        status,
      },
    });
    userByEmail.set(email, user.id);
  }

  const customerId = userByEmail.get('customer@mam-nho.local');
  const adminId = userByEmail.get('admin@mam-nho.local');
  if (!customerId || !adminId) {
    throw new Error('Required demo users were not created');
  }

  await prisma.cart.upsert({
    where: { userId: customerId },
    update: {},
    create: { userId: customerId },
  });

  await prisma.address.upsert({
    where: { id: '10000000-0000-4000-8000-000000000001' },
    update: {
      userId: customerId,
      receiverName: 'Khách hàng Demo',
      phone: '0900000000',
      addressLine: '1 Đường Demo',
      wardCode: '00001',
      wardName: 'Phường Demo',
      provinceCode: '01',
      provinceName: 'Hà Nội',
      isDefault: true,
    },
    create: {
      id: '10000000-0000-4000-8000-000000000001',
      userId: customerId,
      receiverName: 'Khách hàng Demo',
      phone: '0900000000',
      addressLine: '1 Đường Demo',
      wardCode: '00001',
      wardName: 'Phường Demo',
      provinceCode: '01',
      provinceName: 'Hà Nội',
      isDefault: true,
    },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN_WAREHOUSE' },
    update: {
      name: 'Kho chính',
      status: EntityStatus.ACTIVE,
    },
    create: {
      code: 'MAIN_WAREHOUSE',
      name: 'Kho chính',
      status: EntityStatus.ACTIVE,
    },
  });

  const sizeByCode = new Map<string, string>();
  for (const [sortOrder, code] of sizeSeeds.entries()) {
    const size = await prisma.size.upsert({
      where: { code },
      update: { name: `Size ${code}`, sortOrder },
      create: { code, name: `Size ${code}`, sortOrder },
    });
    sizeByCode.set(code, size.id);
  }

  const colorByCode = new Map<string, string>();
  for (const [code, name, hexCode] of colorSeeds) {
    const color = await prisma.color.upsert({
      where: { code },
      update: { name, hexCode },
      create: { code, name, hexCode },
    });
    colorByCode.set(code, color.id);
  }

  const rootCategory = await prisma.category.upsert({
    where: { slug: 'tre-em' },
    update: { name: 'Trẻ em', status: EntityStatus.ACTIVE },
    create: { name: 'Trẻ em', slug: 'tre-em', status: EntityStatus.ACTIVE },
  });

  const categoryBySlug = new Map<string, string>();
  for (const [name, slug] of [
    ['Bộ mặc ngoài', 'bo-mac-ngoai'],
    ['Bé trai', 'be-trai'],
    ['Sơ sinh', 'so-sinh'],
  ] as const) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name, parentId: rootCategory.id, status: EntityStatus.ACTIVE },
      create: {
        name,
        slug,
        parentId: rootCategory.id,
        status: EntityStatus.ACTIVE,
      },
    });
    categoryBySlug.set(slug, category.id);
  }

  const brand = await prisma.brand.upsert({
    where: { slug: 'mam-nho' },
    update: { name: 'Mầm Nhỏ', status: EntityStatus.ACTIVE },
    create: { name: 'Mầm Nhỏ', slug: 'mam-nho', status: EntityStatus.ACTIVE },
  });

  for (const productSeed of productSeeds) {
    const categoryId = categoryBySlug.get(productSeed.categorySlug);
    const sizeId = sizeByCode.get(productSeed.sizeCode);
    const colorId = colorByCode.get(productSeed.colorCode);
    if (!categoryId || !sizeId || !colorId) {
      throw new Error(`Missing catalog master data for ${productSeed.sku}`);
    }

    const product = await prisma.product.upsert({
      where: { slug: productSeed.slug },
      update: {
        categoryId,
        brandId: brand.id,
        name: productSeed.name,
        gender: productSeed.gender,
        ageGroup: productSeed.ageGroup,
        status: productSeed.status,
      },
      create: {
        categoryId,
        brandId: brand.id,
        name: productSeed.name,
        slug: productSeed.slug,
        gender: productSeed.gender,
        ageGroup: productSeed.ageGroup,
        status: productSeed.status,
      },
    });

    const image = await prisma.productImage.findFirst({
      where: { productId: product.id, url: productSeed.imageUrl },
    });
    if (image) {
      await prisma.productImage.update({
        where: { id: image.id },
        data: { altText: productSeed.imageAlt, isPrimary: true, sortOrder: 0 },
      });
    } else {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: productSeed.imageUrl,
          altText: productSeed.imageAlt,
          isPrimary: true,
          sortOrder: 0,
        },
      });
    }

    const variant = await prisma.productVariant.upsert({
      where: { sku: productSeed.sku },
      update: {
        productId: product.id,
        sizeId,
        colorId,
        price: productSeed.price,
        status:
          productSeed.status === ProductStatus.ACTIVE
            ? VariantStatus.ACTIVE
            : VariantStatus.DISABLED,
        ...productSeed.dimensions,
      },
      create: {
        productId: product.id,
        sizeId,
        colorId,
        sku: productSeed.sku,
        price: productSeed.price,
        status:
          productSeed.status === ProductStatus.ACTIVE
            ? VariantStatus.ACTIVE
            : VariantStatus.DISABLED,
        ...productSeed.dimensions,
      },
    });

    const existingInventory = await prisma.inventory.findUnique({
      where: {
        warehouseId_variantId: {
          warehouseId: warehouse.id,
          variantId: variant.id,
        },
      },
    });

    if (!existingInventory) {
      const inventory = await prisma.inventory.create({
        data: {
          warehouseId: warehouse.id,
          variantId: variant.id,
          onHand: productSeed.stock,
        },
      });

      await prisma.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          warehouseId: warehouse.id,
          variantId: variant.id,
          actorId: adminId,
          type: InventoryTxType.IMPORT,
          quantity: productSeed.stock,
          onHandBefore: 0,
          onHandAfter: productSeed.stock,
          reservedBefore: 0,
          reservedAfter: 0,
          referenceType: 'SEED',
          referenceId: variant.id,
          note: 'Tồn kho demo ban đầu',
        },
      });
    }
  }

  console.log('Database seed completed successfully.');
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
