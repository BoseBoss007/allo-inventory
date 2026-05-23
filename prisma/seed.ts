import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("seeding...");

  const [mumbai, delhi, bangalore] = await Promise.all([
    prisma.warehouse.upsert({
      where: { id: "wh-mumbai" },
      update: {},
      create: { id: "wh-mumbai", name: "Mumbai Central", location: "Mumbai, MH" },
    }),
    prisma.warehouse.upsert({
      where: { id: "wh-delhi" },
      update: {},
      create: { id: "wh-delhi", name: "Delhi North Hub", location: "Delhi, DL" },
    }),
    prisma.warehouse.upsert({
      where: { id: "wh-bangalore" },
      update: {},
      create: { id: "wh-bangalore", name: "Bangalore Tech Park", location: "Bengaluru, KA" },
    }),
  ]);

  const products = [
    {
      id: "prod-001",
      name: "AirPods Pro (2nd Gen)",
      description: "Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio",
      price: 24999,
      sku: "APP-PRO-2G",
      imageUrl: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&q=80",
    },
    {
      id: "prod-002",
      name: "Sony WH-1000XM5",
      description: "Industry-leading noise cancelling headphones with 30hr battery life",
      price: 29990,
      sku: "SONY-XM5",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
    },
    {
      id: "prod-003",
      name: "Apple Watch Series 9",
      description: "Advanced health features, S9 chip, always-on retina display",
      price: 41900,
      sku: "AW-S9-45",
      imageUrl: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&q=80",
    },
    {
      id: "prod-004",
      name: "Samsung Galaxy S24 Ultra",
      description: "200MP camera, integrated S Pen, AI-powered photography",
      price: 129999,
      sku: "SAM-S24U-256",
      imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80",
    },
    {
      id: "prod-005",
      name: "MacBook Air M3",
      description: "Supercharged by M3, 18-hour battery, fanless design",
      price: 114900,
      sku: "MBA-M3-13",
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80",
    },
    {
      id: "prod-006",
      name: "Logitech MX Master 3S",
      description: "8K DPI sensor, near-silent clicks, MagSpeed scroll wheel",
      price: 9995,
      sku: "LGT-MXM3S",
      imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        inventories: {
          create: [
            { warehouse: { connect: { id: mumbai.id } }, totalUnits: Math.floor(Math.random() * 8) + 2 },
            { warehouse: { connect: { id: delhi.id } }, totalUnits: Math.floor(Math.random() * 6) + 1 },
            { warehouse: { connect: { id: bangalore.id } }, totalUnits: Math.floor(Math.random() * 5) + 1 },
          ],
        },
      },
    });
  }

  console.log("done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
