import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {

  // Seed categories
  await prisma.category.createMany({
    data: [
      { name: "Beverages", description: "Drinks, juices, and soft drinks" },
      { name: "Snacks", description: "Chips, nuts, and light snacks" },
      { name: "Dairy", description: "Milk, cheese, and dairy products" },
      { name: "Bakery", description: "Bread, cakes, and pastries" },
      { name: "Produce", description: "Fresh fruits and vegetables" },
    ],
    skipDuplicates: true,
  });

  // Seed users
  await prisma.user.createMany({
    data: [
      {
        name: "Alice Admin",
        email: "alice.admin@pos.com",
        passwordHash: "hashedpassword1",
        role: "ADMIN",
        isActive: true,
        isVerified: true,
      },
      {
        name: "Bob Manager",
        email: "bob.manager@pos.com",
        passwordHash: "hashedpassword2",
        role: "MANAGER",
        isActive: true,
        isVerified: true,
      },
      {
        name: "Charlie Cashier",
        email: "charlie.cashier@pos.com",
        passwordHash: "hashedpassword3",
        role: "CASHIER",
        isActive: true,
        isVerified: true,
      },
      {
        name: "Diana Supervisor",
        email: "diana.supervisor@pos.com",
        passwordHash: "hashedpassword4",
        role: "MANAGER",
        isActive: true,
        isVerified: true,
      },
      {
        name: "Eddie Cashier",
        email: "eddie.cashier@pos.com",
        passwordHash: "hashedpassword5",
        role: "CASHIER",
        isActive: true,
        isVerified: true,
      },
    ],
    skipDuplicates: true,
  });

  // Seed products
  const categories = await prisma.category.findMany();
  const beveragesId = categories.find((c) => c.name === "Beverages").id;
  const snacksId = categories.find((c) => c.name === "Snacks").id;
  const dairyId = categories.find((c) => c.name === "Dairy").id;
  const bakeryId = categories.find((c) => c.name === "Bakery").id;
  const produceId = categories.find((c) => c.name === "Produce").id;

  await prisma.product.createMany({
    data: [
      {
        productName: "Coca-Cola 500ml",
        sku: "BEV001",
        barcode: "1234567890123",
        categoryId: beveragesId,
        price: 1.5,
        costPrice: 1.0,
        taxRate: 0.15,
        isActive: true,
      },
      {
        productName: "Lays Classic Chips",
        sku: "SNK001",
        barcode: "2345678901234",
        categoryId: snacksId,
        price: 2.0,
        costPrice: 1.2,
        taxRate: 0.15,
        isActive: true,
      },
      {
        productName: "Milk 1L",
        sku: "DAI001",
        barcode: "3456789012345",
        categoryId: dairyId,
        price: 1.8,
        costPrice: 1.3,
        taxRate: 0.1,
        isActive: true,
      },
      {
        productName: "Baguette",
        sku: "BAK001",
        barcode: "4567890123456",
        categoryId: bakeryId,
        price: 1.2,
        costPrice: 0.8,
        taxRate: 0.1,
        isActive: true,
      },
      {
        productName: "Banana (1kg)",
        sku: "PRD001",
        barcode: "5678901234567",
        categoryId: produceId,
        price: 2.5,
        costPrice: 1.5,
        taxRate: 0.05,
        isActive: true,
      },
      {
        productName: "Orange Juice 1L",
        sku: "BEV002",
        barcode: "6789012345678",
        categoryId: beveragesId,
        price: 3.0,
        costPrice: 2.0,
        taxRate: 0.15,
        isActive: true,
      },
      {
        productName: "Chocolate Chip Cookies",
        sku: "SNK002",
        barcode: "7890123456789",
        categoryId: snacksId,
        price: 2.5,
        costPrice: 1.5,
        taxRate: 0.15,
        isActive: true,
      },
      {
        productName: "Cheddar Cheese 200g",
        sku: "DAI002",
        barcode: "8901234567890",
        categoryId: dairyId,
        price: 4.0,
        costPrice: 2.5,
        taxRate: 0.1,
        isActive: true,
      }
    ],
    skipDuplicates: true,
  });

  // Seed inventory
  const products = await prisma.product.findMany();
  for (const product of products) {
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity: Math.floor(Math.random() * 50) + 10,
        lowStockLevel: 10,
        reorderPoint: 20,
      },
    });
  }

  // Seed suppliers
  await prisma.supplier.createMany({
    data: [
      {
        name: "Global Beverages Ltd.",
        contactName: "John Doe",
        phone: "555-1234",
        email: "contact@globalbev.com",
        address: "123 Beverage St.",
      },
      {
        name: "Snack World",
        contactName: "Jane Smith",
        phone: "555-5678",
        email: "info@snackworld.com",
        address: "456 Snack Ave.",
      },
    ],
    skipDuplicates: true,
  });

  // Seed SupplierProduct links for all products and suppliers
  const suppliers = await prisma.supplier.findMany();
  for (const product of products) {
    await prisma.supplierProduct.upsert({
      where: {
        supplierId_productId: {
          supplierId: suppliers[0].id,
          productId: product.id,
        },
      },
      update: {},
      create: {
        supplierId: suppliers[0].id,
        productId: product.id,
        unitCost: product.costPrice,
        isPreferred: true,
      },
    });
  }

  // Seed PURCHASE stock adjustments for each product
  const inventories = await prisma.inventory.findMany();
  const usersList = await prisma.user.findMany();
  for (const product of products) {
    const inventory = inventories.find((inv) => inv.productId === product.id);
    const adjustment = Math.floor(Math.random() * 50) + 10;
    const quantityBefore = 0;
    const quantityAfter = quantityBefore + adjustment;
    await prisma.stockAdjustment.create({
      data: {
        productId: product.id,
        inventoryId: inventory ? inventory.id : null,
        quantityBefore,
        quantityChange: adjustment,
        quantityAfter,
        reason: "PURCHASE",
        notes: "Initial stock purchase",
        createdAt: new Date(
          Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000,
        ),
        userId: usersList[0].id,
      },
    });
  }

  // Seed customers
  await prisma.customer.createMany({
    data: [
      {
        name: "David Customer",
        phone: "555-0001",
        email: "david.customer@email.com",
        address: "789 Main Rd.",
        loyaltyPoints: 120,
      },
      {
        name: "Eva Shopper",
        phone: "555-0002",
        email: "eva.shopper@email.com",
        address: "321 Market St.",
        loyaltyPoints: 80,
      },
      {
        name: "Frank Shopper",
        phone: "555-0003",
        email: "frank.shopper@email.com",
        address: "654 River Rd.",
        loyaltyPoints: 45,
      },
      {
        name: "Grace Buyer",
        phone: "555-0004",
        email: "grace.buyer@email.com",
        address: "987 Hill St.",
        loyaltyPoints: 200,
      },
    ],
    skipDuplicates: true,
  });

  // Seed discounts
  await prisma.discount.createMany({
    data: [
      {
        code: "WELCOME10",
        description: "10% off for new customers",
        type: "PERCENTAGE",
        value: 10,
        minOrderAmount: 10,
        maxUses: 100,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        code: "SNACK5",
        description: "$5 off snacks",
        type: "FIXED_AMOUNT",
        value: 5,
        minOrderAmount: 20,
        maxUses: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  // Seed sales, sale items, payments, receipts
  const users = await prisma.user.findMany();
  const customers = await prisma.customer.findMany();
  const discounts = await prisma.discount.findMany();

  const salesSeedData = [
    {
      userId: users[2].id,
      customerId: customers[0].id,
      discountId: discounts[0].id,
      status: "COMPLETED",
      subtotal: 10.0,
      discountAmount: 1.0,
      taxAmount: 0.5,
      totalAmount: 9.5,
      notes: "First sale",
      saleItems: [
        {
          productId: products[0].id,
          productName: products[0].productName,
          barcode: products[0].barcode,
          quantity: 2,
          unitPrice: 1.5,
          discount: 0.3,
          taxRate: 0.15,
          subtotal: 2.7,
        },
        {
          productId: products[1].id,
          productName: products[1].productName,
          barcode: products[1].barcode,
          quantity: 3,
          unitPrice: 2.0,
          discount: 0.6,
          taxRate: 0.15,
          subtotal: 5.4,
        },
      ],
      payment: {
        method: "CASH",
        amountPaid: 10.0,
        changeDue: 0.5,
      },
      receipt: {
        receiptNumber: "RCP-20260319-0001",
        storeName: "POS Demo Store",
        storeAddress: "789 Main Rd.",
        storeTaxId: "VAT123456",
        cashierName: users[2].name,
        customerName: customers[0].name,
        printedAt: new Date(),
      },
    },
    {
      userId: users[2].id,
      customerId: customers[1].id,
      discountId: discounts[1].id,
      status: "COMPLETED",
      subtotal: 20.0,
      discountAmount: 5.0,
      taxAmount: 1.0,
      totalAmount: 16.0,
      notes: "Second sale",
      saleItems: [
        {
          productId: products[2].id,
          productName: products[2].productName,
          barcode: products[2].barcode,
          quantity: 1,
          unitPrice: 1.8,
          discount: 0.2,
          taxRate: 0.1,
          subtotal: 1.6,
        },
        {
          productId: products[3].id,
          productName: products[3].productName,
          barcode: products[3].barcode,
          quantity: 2,
          unitPrice: 1.2,
          discount: 0.1,
          taxRate: 0.1,
          subtotal: 2.2,
        },
      ],
      payment: {
        method: "MOBILE_MONEY",
        amountPaid: 20.0,
        changeDue: 4.0,
      },
      receipt: {
        receiptNumber: "RCP-20260319-0002",
        storeName: "POS Demo Store",
        storeAddress: "789 Main Rd.",
        storeTaxId: "VAT123456",
        cashierName: users[2].name,
        customerName: customers[1].name,
        printedAt: new Date(),
      },
    },
    {
      userId: users[1].id,
      customerId: customers[2].id,
      discountId: null,
      status: "COMPLETED",
      subtotal: 8.0,
      discountAmount: 0.0,
      taxAmount: 0.4,
      totalAmount: 8.4,
      notes: "Third sale",
      saleItems: [
        {
          productId: products[4].id,
          productName: products[4].productName,
          barcode: products[4].barcode,
          quantity: 2,
          unitPrice: 2.5,
          discount: 0.0,
          taxRate: 0.05,
          subtotal: 5.0,
        },
        {
          productId: products[5].id,
          productName: products[5].productName,
          barcode: products[5].barcode,
          quantity: 1,
          unitPrice: 3.5,
          discount: 0.0,
          taxRate: 0.1,
          subtotal: 3.5,
        },
      ],
      payment: {
        method: "CARD",
        amountPaid: 10.0,
        changeDue: 1.6,
      },
      receipt: {
        receiptNumber: "RCP-20260319-0003",
        storeName: "POS Demo Store",
        storeAddress: "789 Main Rd.",
        storeTaxId: "VAT123456",
        cashierName: users[1].name,
        customerName: customers[2].name,
        printedAt: new Date(),
      },
    },
  ];

  for (const saleSeed of salesSeedData) {
    const saleIndex = salesSeedData.indexOf(saleSeed) + 1;
    const sale = await prisma.sale.create({
      data: {
        userId: saleSeed.userId,
        customerId: saleSeed.customerId,
        discountId: saleSeed.discountId,
        status: saleSeed.status,
        subtotal: saleSeed.subtotal,
        discountAmount: saleSeed.discountAmount,
        taxAmount: saleSeed.taxAmount,
        totalAmount: saleSeed.totalAmount,
        notes: saleSeed.notes,
        saleItems: {
          create: saleSeed.saleItems,
        },
      },
    });
    await prisma.payment.create({
      data: {
        saleId: sale.id,
        method: saleSeed.payment.method,
        amountPaid: saleSeed.payment.amountPaid,
        changeDue: saleSeed.payment.changeDue,
      },
    });
    const uniqueReceiptNumber = `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(saleIndex).padStart(4, "0")}`;
    await prisma.receipt.create({
      data: {
        saleId: sale.id,
        receiptNumber: uniqueReceiptNumber,
        storeName: saleSeed.receipt.storeName,
        storeAddress: saleSeed.receipt.storeAddress,
        storeTaxId: saleSeed.receipt.storeTaxId,
        cashierName: saleSeed.receipt.cashierName,
        customerName: saleSeed.receipt.customerName,
        printedAt: saleSeed.receipt.printedAt,
      },
    });
  }

  // Seed hardware devices
  await prisma.hardwareDevice.createMany({
    data: [
      {
        name: "Cashier 1 Printer",
        type: "RECEIPT_PRINTER",
        serialNumber: "PRN-001",
        ipAddress: "192.168.1.10",
        port: 9100,
        isOnline: true,
      },
      {
        name: "Main Barcode Scanner",
        type: "BARCODE_SCANNER",
        serialNumber: "BSC-001",
        ipAddress: "192.168.1.11",
        port: 9200,
        isOnline: true,
      },
    ],
    skipDuplicates: true,
  });

  // Seed Settings
  await prisma.setting.create({
    data: {
      storeName: "POS Demo Store",
      storeAddress: "789 Main Rd.",
      storeTaxId: "VAT123456",
      currency: "USD",
      language: "en",
      theme: "light",
      receiptFooter: "Thank you for shopping!",
      businessHours: "Mon-Sat 8:00-20:00",
      taxRate: 0.15,
    },
  });
}

main()
  .then(() => {
    console.log("Seeded all tables with realistic sample data!");
    prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
