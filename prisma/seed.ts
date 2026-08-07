// Curated demo data — real retail brands, but addresses/coordinates are
// approximate placeholders (clustered along a real shopping district,
// Chicago's Michigan Avenue, to get realistic-looking distances against
// lib/geo.ts's PLACEHOLDER_USER_LOCATION) rather than verified exact
// addresses. Swap for a real store directory (or a places API) later —
// see the discussion in prisma/schema.prisma's header comment.

import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { hashPassword } from '../lib/auth';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

// Demo-only credentials — matches the previously-hardcoded "Good morning,
// Benjamin" greeting, now backed by a real account you can actually log
// into. Not a real password anyone should reuse.
const DEMO_USER = {
  email: 'benjamin@example.com',
  password: 'shoppr-demo',
  firstName: 'Benjamin',
  initials: 'BF',
  savedSizesCount: 4,
  favoriteStoresCount: 6,
  savedItemsCount: 11,
};

const RETAIL_HOURS = {
  mon: ['10:00', '21:00'],
  tue: ['10:00', '21:00'],
  wed: ['10:00', '21:00'],
  thu: ['10:00', '21:00'],
  fri: ['10:00', '22:00'],
  sat: ['10:00', '22:00'],
  sun: ['11:00', '19:00'],
} as const;

const BOUTIQUE_HOURS = {
  tue: ['11:00', '19:00'],
  wed: ['11:00', '19:00'],
  thu: ['11:00', '19:00'],
  fri: ['11:00', '20:00'],
  sat: ['10:00', '20:00'],
  sun: ['12:00', '17:00'],
  // Closed Monday.
} as const;

const stores = [
  {
    name: 'Nike',
    category: 'Footwear',
    address: '669 N Michigan Ave, Chicago, IL',
    latitude: 41.8961,
    longitude: -87.6244,
    hours: RETAIL_HOURS,
    products: [
      { name: 'Air Zoom Pegasus', category: 'Footwear', priceCents: 13000, sizes: ['8', '9', '10', '11', '12'] },
      { name: 'Dri-FIT Running Shorts', category: 'Fashion', priceCents: 4500, sizes: ['S', 'M', 'L', 'XL'] },
      { name: 'Everyday Crew Socks (3-pack)', category: 'Fashion', priceCents: 1800, sizes: null },
    ],
  },
  {
    name: 'Apple',
    category: 'Electronics',
    address: '401 N Michigan Ave, Chicago, IL',
    latitude: 41.8897,
    longitude: -87.6229,
    hours: RETAIL_HOURS,
    products: [
      { name: 'USB-C Fast Charger', category: 'Electronics', priceCents: 3900, sizes: null },
      { name: 'AirPods Pro', category: 'Electronics', priceCents: 24900, sizes: null },
      { name: 'MagSafe Charger', category: 'Electronics', priceCents: 3900, sizes: null },
    ],
  },
  {
    name: 'Sephora',
    category: 'Beauty',
    address: '627 N Michigan Ave, Chicago, IL',
    latitude: 41.8952,
    longitude: -87.6241,
    hours: RETAIL_HOURS,
    products: [
      { name: 'Vitamin C Serum', category: 'Beauty', priceCents: 4800, sizes: null },
      { name: 'Hydrating Lip Mask', category: 'Beauty', priceCents: 2400, sizes: null },
      { name: 'Everyday Setting Spray', category: 'Beauty', priceCents: 3200, sizes: null },
    ],
  },
  {
    name: 'Zara',
    category: 'Fashion',
    address: '17 N State St, Chicago, IL',
    latitude: 41.8829,
    longitude: -87.6278,
    hours: RETAIL_HOURS,
    products: [
      { name: 'Tapered Wool Trousers', category: 'Fashion', priceCents: 8900, sizes: ['28', '30', '32', '34', '36'] },
      { name: 'Oversized Cotton Shirt', category: 'Fashion', priceCents: 3900, sizes: ['XS', 'S', 'M', 'L', 'XL'] },
      { name: 'Faux Leather Jacket', category: 'Fashion', priceCents: 12900, sizes: ['S', 'M', 'L'] },
    ],
  },
  {
    name: 'Nordstrom',
    category: 'Luxury',
    address: '55 E Grand Ave, Chicago, IL',
    latitude: 41.8917,
    longitude: -87.6242,
    hours: RETAIL_HOURS,
    products: [
      { name: 'Cashmere Crewneck Sweater', category: 'Fashion', priceCents: 22900, sizes: ['S', 'M', 'L', 'XL'] },
      { name: 'Leather Chelsea Boots', category: 'Footwear', priceCents: 24900, sizes: ['8', '9', '10', '11'] },
      { name: 'Silk Pocket Square', category: 'Fashion', priceCents: 4500, sizes: null },
    ],
  },
  {
    name: "Macy's",
    category: 'Fashion',
    address: '111 N State St, Chicago, IL',
    latitude: 41.8826,
    longitude: -87.6277,
    hours: RETAIL_HOURS,
    products: [
      { name: 'Weekender Duffel', category: 'Gifts', priceCents: 7600, sizes: null },
      { name: 'Classic Denim Jacket', category: 'Fashion', priceCents: 6900, sizes: ['S', 'M', 'L', 'XL'] },
      { name: 'Stainless Steel Watch', category: 'Gifts', priceCents: 11900, sizes: null },
    ],
  },
  {
    name: 'The Corner Boutique',
    category: 'Fashion',
    address: '212 W Kinzie St, Chicago, IL',
    latitude: 41.8894,
    longitude: -87.6349,
    hours: BOUTIQUE_HOURS,
    products: [
      { name: 'Linen Blend Blazer', category: 'Fashion', priceCents: 14500, sizes: ['S', 'M', 'L'] },
      { name: 'Handmade Ceramic Mug', category: 'Home', priceCents: 2800, sizes: null },
    ],
  },
];

const scouts = [
  { name: 'Maya', rating: 4.9 },
  { name: 'Devon L.', rating: 4.7 },
  { name: 'Priya K.', rating: 4.95 },
];

// storeName here is intentionally free text, not a lookup into the `stores`
// array above — see the Mission model's comment in schema.prisma for why
// (a Scout can be sent to any real-world store, not just our curated
// browsable directory; Target/IKEA below aren't in the Store table at all).
const missions = [
  {
    title: 'Nike Running Shoes',
    storeName: 'Nike',
    status: 'on_the_way',
    scoutName: 'Maya',
    etaMinutes: 12,
    note: '2 stops away',
  },
  {
    title: 'Birthday gift from Target',
    storeName: 'Target',
    status: 'shopping',
    scoutName: 'Devon L.',
    etaMinutes: 38,
    note: 'Scout has entered the store',
  },
  {
    title: 'Home essentials from IKEA',
    storeName: 'IKEA',
    status: 'created',
    scoutName: null,
    etaMinutes: null,
    note: 'Waiting for a Scout',
  },
  {
    title: 'Charger, forgot mine',
    storeName: 'Apple',
    status: 'complete',
    scoutName: 'Priya K.',
    etaMinutes: null,
    note: 'Delivered today',
  },
];

async function main() {
  // Safe to re-run: this is seed/demo data in a local dev database, not
  // anything a real user has created — clear it first so re-seeding
  // doesn't pile up duplicates. Children before parents (FK order).
  await prisma.mission.deleteMany();
  await prisma.product.deleteMany();
  await prisma.scout.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  for (const { products, ...store } of stores) {
    await prisma.store.create({
      data: {
        ...store,
        // Prisma's Json field rejects a plain `null` for create (it's
        // ambiguous between "JSON null" and "SQL NULL") — omitting the key
        // entirely (undefined) is what actually leaves the column NULL.
        products: { create: products.map((p) => ({ ...p, sizes: p.sizes ?? undefined })) },
      },
    });
  }
  console.log(`Seeded ${stores.length} stores.`);

  const scoutByName = new Map<string, string>();
  for (const scout of scouts) {
    const created = await prisma.scout.create({ data: scout });
    scoutByName.set(scout.name, created.id);
  }
  console.log(`Seeded ${scouts.length} scouts.`);

  for (const { scoutName, ...mission } of missions) {
    await prisma.mission.create({
      data: {
        ...mission,
        scoutId: scoutName ? scoutByName.get(scoutName) : undefined,
      },
    });
  }
  console.log(`Seeded ${missions.length} missions.`);

  const { password, ...demoUser } = DEMO_USER;
  await prisma.user.create({ data: { ...demoUser, passwordHash: hashPassword(password) } });
  console.log(`Seeded demo user (${DEMO_USER.email} / ${DEMO_USER.password}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
