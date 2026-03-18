import { prisma } from "../lib/Prisma.js";

export const posRepository = {
  async createSale(saleData) {
    // Validate userId
    if (!saleData.userId)
      throw new Error("User ID is required to create a sale");
    if (!saleData.items || saleData.items.length === 0)
      throw new Error("Sale must contain at least one item");

    const productIds = saleData.items.map((item) => item.productId);

    // Fetch products
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Validate all products exist
    const foundIds = products.map((p) => p.id);
    const missingIds = productIds.filter((id) => !foundIds.includes(id));
    if (missingIds.length > 0)
      throw new Error(`Products not found: ${missingIds.join(", ")}`);

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;

    const saleItemsData = saleData.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const unitPrice = Number(product.price);
      const lineSubtotal = unitPrice * item.quantity;
      const lineTax = lineSubtotal * (Number(product.taxRate) / 100);

      subtotal += lineSubtotal;
      totalTax += lineTax;

      return {
        productId: product.id,
        productName: product.productName,
        barcode: product.barcode || null,
        quantity: item.quantity,
        unitPrice,
        subtotal: lineSubtotal,
        taxRate: Number(product.taxRate) || 0,
        discount: 0,
      };
    });

    const totalAmount = subtotal + totalTax;

    // Create sale
    return await prisma.sale.create({
      data: {
        userId: saleData.userId,
        customerId: saleData.customerId || null,
        discountId: saleData.discountId || null,
        subtotal,
        taxAmount: totalTax,
        totalAmount,
        saleItems: { create: saleItemsData },
      },
      include: {
        saleItems: { include: { product: true } },
        customer: true,
        discount: true,
      },
    });
  },
};
