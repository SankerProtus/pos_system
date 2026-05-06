import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const money = (value) => Number(value.toFixed(2));

const seededRandom = (() => {
  let seed = 987654321;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
})();

const randomInt = (min, max) =>
  Math.floor(seededRandom() * (max - min + 1)) + min;

const pick = (items) => items[randomInt(0, items.length - 1)];

const pickManyUnique = (items, count) => {
  const pool = [...items];
  const selected = [];
  for (let index = 0; index < count && pool.length > 0; index += 1) {
    selected.push(pool.splice(randomInt(0, pool.length - 1), 1)[0]);
  }
  return selected;
};

const daysAgoAtHour = (daysAgo, hour, minute = 0) => {
  const now = new Date();
  const date = new Date(now);
  date.setDate(now.getDate() - daysAgo);
  date.setHours(hour, minute, randomInt(0, 59), 0);
  return date;
};

async function main() {
  const categories = [
    {
      name: "Beverages",
      description: "Soft drinks, water, juices, and energy drinks",
    },
    {
      name: "Snacks",
      description: "Chips, biscuits, nuts, and confectionery",
    },
    {
      name: "Dairy",
      description: "Milk, yogurt, butter, and cheese",
    },
    {
      name: "Bakery",
      description: "Bread, pastries, and baked snacks",
    },
    {
      name: "Produce",
      description: "Fresh fruits and vegetables",
    },
    {
      name: "Household",
      description: "Cleaning products and home essentials",
    },
    {
      name: "Personal Care",
      description: "Body care and personal hygiene",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
        isActive: true,
      },
      create: category,
    });
  }

  const categoryRows = await prisma.category.findMany();
  const categoryIdByName = new Map(
    categoryRows.map((row) => [row.name, row.id]),
  );

  const userSeeds = [
    {
      name: "Amina Boateng",
      email: "amina.admin@swiftpos.local",
      role: "ADMIN",
      password: "Admin@123",
    },
    {
      name: "Kwesi Mensah",
      email: "kwesi.manager@swiftpos.local",
      role: "MANAGER",
      password: "Manager@123",
    },
    {
      name: "Linda Asare",
      email: "linda.cashier@swiftpos.local",
      role: "CASHIER",
      password: "Cashier@123",
    },
    {
      name: "Patrick Nkrumah",
      email: "patrick.cashier@swiftpos.local",
      role: "CASHIER",
      password: "Cashier@123",
    },
    {
      name: "Nana Osei",
      email: "nana.supervisor@swiftpos.local",
      role: "MANAGER",
      password: "Manager@123",
    },
  ];

  for (const user of userSeeds) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        isActive: true,
        isVerified: true,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        isActive: true,
        isVerified: true,
      },
    });
  }

  const productSeeds = [
    ["Beverages", "Coca-Cola 500ml", "BEV001", "1111111111111", 4.5, 3.2, 15],
    ["Beverages", "Bottled Water 1.5L", "BEV002", "1111111111112", 3.0, 1.8, 0],
    ["Beverages", "Orange Juice 1L", "BEV003", "1111111111113", 12.0, 8.0, 15],
    [
      "Beverages",
      "Energy Drink 330ml",
      "BEV004",
      "1111111111114",
      10.0,
      6.5,
      15,
    ],
    ["Snacks", "Salted Peanuts 100g", "SNK001", "1111111111121", 8.5, 5.2, 15],
    ["Snacks", "Potato Chips 50g", "SNK002", "1111111111122", 7.0, 4.0, 15],
    ["Snacks", "Chocolate Cookies", "SNK003", "1111111111123", 9.5, 5.8, 15],
    ["Snacks", "Granola Bar", "SNK004", "1111111111124", 6.0, 3.6, 15],
    ["Dairy", "Fresh Milk 1L", "DAI001", "1111111111131", 11.0, 7.4, 12.5],
    [
      "Dairy",
      "Yogurt Vanilla 450g",
      "DAI002",
      "1111111111132",
      14.0,
      9.8,
      12.5,
    ],
    [
      "Dairy",
      "Cheddar Cheese 200g",
      "DAI003",
      "1111111111133",
      19.0,
      13.0,
      12.5,
    ],
    ["Bakery", "Whole Wheat Bread", "BAK001", "1111111111141", 10.5, 6.0, 10],
    ["Bakery", "Butter Croissant", "BAK002", "1111111111142", 7.0, 3.9, 10],
    ["Bakery", "Cupcake Vanilla", "BAK003", "1111111111143", 6.5, 3.3, 10],
    ["Produce", "Banana 1kg", "PRD001", "1111111111151", 13.0, 8.5, 0],
    ["Produce", "Tomatoes 1kg", "PRD002", "1111111111152", 15.0, 9.6, 0],
    ["Produce", "Onions 1kg", "PRD003", "1111111111153", 14.0, 8.8, 0],
    [
      "Household",
      "Dishwashing Liquid 500ml",
      "HOU001",
      "1111111111161",
      16.0,
      10.2,
      15,
    ],
    [
      "Household",
      "Toilet Tissue 4 Pack",
      "HOU002",
      "1111111111162",
      18.0,
      12.5,
      15,
    ],
    [
      "Personal Care",
      "Toothpaste 140g",
      "PER001",
      "1111111111171",
      9.0,
      5.0,
      15,
    ],
    [
      "Personal Care",
      "Bath Soap 175g",
      "PER002",
      "1111111111172",
      5.5,
      3.1,
      15,
    ],
  ];

  for (const [
    categoryName,
    productName,
    sku,
    barcode,
    price,
    costPrice,
    taxRate,
  ] of productSeeds) {
    await prisma.product.upsert({
      where: { sku },
      update: {
        productName,
        barcode,
        price,
        costPrice,
        taxRate,
        isActive: true,
        categoryId: categoryIdByName.get(categoryName),
      },
      create: {
        productName,
        sku,
        barcode,
        price,
        costPrice,
        taxRate,
        isActive: true,
        categoryId: categoryIdByName.get(categoryName),
      },
    });
  }

  const products = await prisma.product.findMany({ orderBy: { sku: "asc" } });
  const productBySku = new Map(
    products.map((product) => [product.sku, product]),
  );

  const inventoryBySku = [
    ["BEV001", 140, 25, 50],
    ["BEV002", 220, 30, 60],
    ["BEV003", 95, 18, 40],
    ["BEV004", 80, 16, 35],
    ["SNK001", 110, 20, 45],
    ["SNK002", 160, 25, 55],
    ["SNK003", 120, 20, 45],
    ["SNK004", 130, 24, 50],
    ["DAI001", 90, 20, 42],
    ["DAI002", 70, 15, 35],
    ["DAI003", 60, 12, 30],
    ["BAK001", 85, 18, 36],
    ["BAK002", 65, 14, 30],
    ["BAK003", 75, 15, 32],
    ["PRD001", 100, 20, 45],
    ["PRD002", 95, 18, 40],
    ["PRD003", 90, 18, 38],
    ["HOU001", 70, 12, 28],
    ["HOU002", 55, 10, 22],
    ["PER001", 85, 14, 35],
    ["PER002", 120, 20, 50],
  ];

  for (const [sku, quantity, lowStockLevel, reorderPoint] of inventoryBySku) {
    const product = productBySku.get(sku);
    if (!product) {
      continue;
    }

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {
        quantity,
        lowStockLevel,
        reorderPoint,
      },
      create: {
        productId: product.id,
        quantity,
        lowStockLevel,
        reorderPoint,
      },
    });
  }

  const supplierSeeds = [
    {
      name: "Accra Beverage Distributors",
      contactName: "Kojo Larbi",
      phone: "+233-20-555-0101",
      email: "sales@accrabev.com",
      address: "Airport Residential, Accra",
    },
    {
      name: "FreshFoods Wholesale",
      contactName: "Abena Ofori",
      phone: "+233-20-555-0102",
      email: "trade@freshfoodsgh.com",
      address: "Kumasi Central Market Road",
    },
    {
      name: "HomePlus Supplies",
      contactName: "Yaw Baffoe",
      phone: "+233-20-555-0103",
      email: "orders@homeplussupplies.com",
      address: "Spintex Road, Accra",
    },
  ];

  await prisma.supplier.deleteMany();
  await prisma.supplier.createMany({ data: supplierSeeds });

  const suppliers = await prisma.supplier.findMany();
  const supplierByName = new Map(
    suppliers.map((supplier) => [supplier.name, supplier]),
  );

  const supplierRules = {
    Beverages: "Accra Beverage Distributors",
    Snacks: "FreshFoods Wholesale",
    Dairy: "FreshFoods Wholesale",
    Bakery: "FreshFoods Wholesale",
    Produce: "FreshFoods Wholesale",
    Household: "HomePlus Supplies",
    "Personal Care": "HomePlus Supplies",
  };

  const productsWithCategory = await prisma.product.findMany({
    include: { category: true },
  });

  for (const product of productsWithCategory) {
    const supplierName =
      supplierRules[product.category.name] || "FreshFoods Wholesale";
    const supplier = supplierByName.get(supplierName);
    await prisma.supplierProduct.upsert({
      where: {
        supplierId_productId: {
          supplierId: supplier.id,
          productId: product.id,
        },
      },
      update: {
        unitCost: product.costPrice,
        isPreferred: true,
      },
      create: {
        supplierId: supplier.id,
        productId: product.id,
        unitCost: product.costPrice,
        isPreferred: true,
      },
    });
  }

  const customerSeeds = [
    [
      "Michael Addo",
      "+233-24-100-0101",
      "michael.addo@example.com",
      "Adenta, Accra",
      65,
    ],
    [
      "Esther Nyame",
      "+233-24-100-0102",
      "esther.nyame@example.com",
      "Teshie, Accra",
      30,
    ],
    [
      "Daniel Owusu",
      "+233-24-100-0103",
      "daniel.owusu@example.com",
      "Kasoa, Central",
      110,
    ],
    [
      "Sarah Gyan",
      "+233-24-100-0104",
      "sarah.gyan@example.com",
      "Madina, Accra",
      25,
    ],
    [
      "Richard Koomson",
      "+233-24-100-0105",
      "richard.koomson@example.com",
      "Tamale, Northern",
      70,
    ],
    [
      "Martha Osei",
      "+233-24-100-0106",
      "martha.osei@example.com",
      "Tema Community 8",
      15,
    ],
    [
      "Irene Badu",
      "+233-24-100-0107",
      "irene.badu@example.com",
      "Cape Coast",
      52,
    ],
    [
      "Yvette Sarpong",
      "+233-24-100-0108",
      "yvette.sarpong@example.com",
      "East Legon",
      38,
    ],
    [
      "Joseph Kyeremeh",
      "+233-24-100-0109",
      "joseph.kyeremeh@example.com",
      "Suhum",
      84,
    ],
    [
      "Priscilla Arthur",
      "+233-24-100-0110",
      "priscilla.arthur@example.com",
      "Takoradi",
      12,
    ],
  ];

  for (const [name, phone, email, address, loyaltyPoints] of customerSeeds) {
    await prisma.customer.upsert({
      where: { email },
      update: { name, phone, address, loyaltyPoints, isActive: true },
      create: { name, phone, email, address, loyaltyPoints, isActive: true },
    });
  }

  const now = new Date();
  const discountSeeds = [
    {
      code: "WELCOME10",
      description: "10% off first qualifying purchase",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 60,
      maxUses: 500,
      usedCount: 0,
      validFrom: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 45,
      ),
      validUntil: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 120,
      ),
      isActive: true,
    },
    {
      code: "BASKET20",
      description: "GHS 20 off orders above GHS 200",
      type: "FIXED_AMOUNT",
      value: 20,
      minOrderAmount: 200,
      maxUses: 300,
      usedCount: 0,
      validFrom: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 15,
      ),
      validUntil: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 90,
      ),
      isActive: true,
    },
    {
      code: "WEEKEND5",
      description: "5% weekend promo",
      type: "PERCENTAGE",
      value: 5,
      minOrderAmount: 40,
      maxUses: 1000,
      usedCount: 0,
      validFrom: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 10,
      ),
      validUntil: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 60,
      ),
      isActive: true,
    },
  ];

  for (const discount of discountSeeds) {
    await prisma.discount.upsert({
      where: { code: discount.code },
      update: discount,
      create: discount,
    });
  }

  await prisma.hardwareDevice.deleteMany();
  await prisma.hardwareDevice.createMany({
    data: [
      {
        name: "Counter 1 Receipt Printer",
        type: "RECEIPT_PRINTER",
        serialNumber: "PRN-C1-1001",
        ipAddress: "192.168.10.21",
        port: 9100,
        isOnline: true,
      },
      {
        name: "Counter 2 Barcode Scanner",
        type: "BARCODE_SCANNER",
        serialNumber: "BSC-C2-2002",
        ipAddress: "192.168.10.22",
        port: 9200,
        isOnline: true,
      },
      {
        name: "Main Card Reader",
        type: "CARD_READER",
        serialNumber: "CRD-MAIN-3003",
        ipAddress: "192.168.10.23",
        port: 9300,
        isOnline: true,
      },
    ],
  });

  const existingSetting = await prisma.setting.findFirst();
  if (existingSetting) {
    await prisma.setting.update({
      where: { id: existingSetting.id },
      data: {
        storeName: "SwiftPOS Mini Mart",
        storeAddress: "15 Ring Road Central, Accra",
        storeTaxId: "GRA-TIN-4451021",
        currency: "GHS",
        language: "en",
        theme: "light",
        receiptHeaderText: "SwiftPOS Mini Mart - Sales Receipt",
        receiptFooter: "Thank you for shopping with us.",
        receiptPaperWidth: "80mm",
        autoPrint: false,
        showLoyaltyPoints: true,
        showStoreLogo: false,
        businessHours: "Mon-Sat 07:30-21:00, Sun 09:00-18:00",
        taxRate: 0.15,
        pointsPerGHC: 1,
        ghcPerPoint: 0.1,
        minimumPointsToRedeem: 100,
      },
    });
  } else {
    await prisma.setting.create({
      data: {
        storeName: "SwiftPOS Mini Mart",
        storeAddress: "15 Ring Road Central, Accra",
        storeTaxId: "GRA-TIN-4451021",
        currency: "GHS",
        language: "en",
        theme: "light",
        receiptHeaderText: "SwiftPOS Mini Mart - Sales Receipt",
        receiptFooter: "Thank you for shopping with us.",
        receiptPaperWidth: "80mm",
        autoPrint: false,
        showLoyaltyPoints: true,
        showStoreLogo: false,
        businessHours: "Mon-Sat 07:30-21:00, Sun 09:00-18:00",
        taxRate: 0.15,
        pointsPerGHC: 1,
        ghcPerPoint: 0.1,
        minimumPointsToRedeem: 100,
      },
    });
  }

  // Keep transactional seed deterministic and repeatable.
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.loyaltyRedemption.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockAdjustment.deleteMany();

  const users = await prisma.user.findMany();
  const adminUser = users.find((user) => user.role === "ADMIN") || users[0];
  const cashiers = users.filter(
    (user) => user.role === "CASHIER" || user.role === "MANAGER",
  );
  const customers = await prisma.customer.findMany();
  const discounts = await prisma.discount.findMany({
    where: { isActive: true },
  });
  const inventories = await prisma.inventory.findMany();

  const inventoryByProductId = new Map(
    inventories.map((inventory) => [inventory.productId, inventory]),
  );
  const quantityByProductId = new Map(
    inventories.map((inventory) => [inventory.productId, inventory.quantity]),
  );

  for (const inventory of inventories) {
    await prisma.stockAdjustment.create({
      data: {
        inventoryId: inventory.id,
        productId: inventory.productId,
        userId: adminUser.id,
        reason: "OPENING_STOCK",
        quantityBefore: 0,
        quantityChange: inventory.quantity,
        quantityAfter: inventory.quantity,
        notes: "Opening stock seeded for demo environment",
        createdAt: daysAgoAtHour(35, 7, 30),
      },
    });
  }

  let paymentCounter = 1;
  let receiptCounter = 1;

  for (let day = 35; day >= 0; day -= 1) {
    const salesCount = randomInt(2, 5);
    for (let saleIndex = 0; saleIndex < salesCount; saleIndex += 1) {
      const cashier = pick(cashiers);
      const customer = seededRandom() < 0.72 ? pick(customers) : null;

      const statusRoll = seededRandom();
      const status =
        statusRoll < 0.8
          ? "COMPLETED"
          : statusRoll < 0.9
            ? "VOIDED"
            : "CANCELLED";

      const itemsToBuy = pickManyUnique(productsWithCategory, randomInt(1, 4));
      let subtotal = 0;
      let taxAmount = 0;

      const saleItems = itemsToBuy.map((product) => {
        const quantity = randomInt(1, 4);
        const unitPrice = Number(product.price);
        const lineDiscountRate =
          seededRandom() < 0.2 ? randomInt(3, 10) / 100 : 0;
        const gross = unitPrice * quantity;
        const lineDiscount = money(gross * lineDiscountRate);
        const lineSubtotal = money(gross - lineDiscount);
        const lineTax = money(lineSubtotal * (Number(product.taxRate) / 100));

        subtotal += lineSubtotal;
        taxAmount += lineTax;

        return {
          productId: product.id,
          productName: product.productName,
          barcode: product.barcode,
          quantity,
          unitPrice: money(unitPrice),
          discount: lineDiscount,
          taxRate: Number(product.taxRate),
          subtotal: lineSubtotal,
        };
      });

      subtotal = money(subtotal);
      taxAmount = money(taxAmount);

      let discount = null;
      if (seededRandom() < 0.35) {
        discount = pick(discounts);
      }

      let discountAmount = 0;
      if (
        discount &&
        (!discount.minOrderAmount ||
          subtotal >= Number(discount.minOrderAmount))
      ) {
        if (discount.type === "PERCENTAGE") {
          discountAmount = money(subtotal * (Number(discount.value) / 100));
        } else {
          discountAmount = Math.min(money(Number(discount.value)), subtotal);
        }
      }

      const totalAmount = money(
        Math.max(0, subtotal - discountAmount + taxAmount),
      );
      const createdAt = daysAgoAtHour(day, randomInt(8, 20), randomInt(0, 59));

      const sale = await prisma.sale.create({
        data: {
          userId: cashier.id,
          customerId: customer?.id,
          discountId: discountAmount > 0 ? discount.id : null,
          status,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          notes:
            status === "VOIDED"
              ? "Voided during checkout due to quantity correction"
              : status === "CANCELLED"
                ? "Cancelled after mobile money timeout"
                : "Completed sale",
          createdAt,
          updatedAt: createdAt,
          saleItems: {
            create: saleItems,
          },
        },
      });

      if (status === "COMPLETED") {
        const methodRoll = seededRandom();
        const method =
          methodRoll < 0.5
            ? "CASH"
            : methodRoll < 0.8
              ? "MOBILE_MONEY"
              : "CARD";

        let paymentStatus = "SUCCESS";
        if (method === "MOBILE_MONEY" && seededRandom() < 0.08) {
          paymentStatus = "PENDING";
        }

        const amountPaid =
          method === "CASH"
            ? money(totalAmount + randomInt(0, 20))
            : money(totalAmount);
        const changeDue =
          method === "CASH" ? money(amountPaid - totalAmount) : 0;
        const paymentReference = `SEED-PAY-${String(paymentCounter).padStart(6, "0")}`;

        const payment = await prisma.payment.create({
          data: {
            saleId: sale.id,
            method,
            status: paymentStatus,
            amount: totalAmount,
            amountPaid,
            changeDue,
            reference: paymentReference,
            provider:
              method === "MOBILE_MONEY"
                ? "MTN MoMo"
                : method === "CARD"
                  ? "Visa"
                  : null,
            phoneNumber:
              method === "MOBILE_MONEY" ? customer?.phone || null : null,
            providerStatus: paymentStatus,
            expiresAt:
              paymentStatus === "PENDING"
                ? new Date(createdAt.getTime() + 10 * 60 * 1000)
                : null,
            processedAt:
              paymentStatus === "SUCCESS"
                ? new Date(createdAt.getTime() + randomInt(30, 240) * 1000)
                : null,
            last4: method === "CARD" ? String(randomInt(1000, 9999)) : null,
            failureReason:
              paymentStatus === "PENDING"
                ? "Awaiting customer confirmation"
                : null,
            createdAt,
            updatedAt: createdAt,
          },
        });

        if (payment.status === "SUCCESS") {
          const receiptNumber = `RCP-${String(receiptCounter).padStart(7, "0")}`;
          await prisma.receipt.create({
            data: {
              saleId: sale.id,
              receiptNumber,
              storeName: "SwiftPOS Mini Mart",
              storeAddress: "15 Ring Road Central, Accra",
              storeTaxId: "GRA-TIN-4451021",
              cashierName: cashier.name,
              customerName: customer?.name || "Walk-in Customer",
              items: saleItems.map((item) => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
              })),
              printedAt: new Date(
                createdAt.getTime() + randomInt(60, 300) * 1000,
              ),
              createdAt,
            },
          });

          for (const item of saleItems) {
            const inventory = inventoryByProductId.get(item.productId);
            const currentQuantity =
              quantityByProductId.get(item.productId) || 0;
            const quantityAfter = Math.max(0, currentQuantity - item.quantity);

            await prisma.stockAdjustment.create({
              data: {
                inventoryId: inventory.id,
                productId: item.productId,
                userId: cashier.id,
                reason: "SALE",
                quantityBefore: currentQuantity,
                quantityChange: -item.quantity,
                quantityAfter,
                referenceId: sale.id,
                notes: `Sold via ${method}`,
                createdAt,
              },
            });

            await prisma.inventory.update({
              where: { id: inventory.id },
              data: { quantity: quantityAfter },
            });

            quantityByProductId.set(item.productId, quantityAfter);
          }

          if (customer) {
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                loyaltyPoints: {
                  increment: Math.max(1, Math.floor(totalAmount)),
                },
              },
            });
          }

          receiptCounter += 1;
        }

        paymentCounter += 1;
      }
    }
  }

  console.log("Seeded realistic POS sample data successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
