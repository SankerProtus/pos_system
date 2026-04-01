import { prisma } from "../lib/Prisma.js";

export const customersRepository = {
  getAll: async () => {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        loyaltyPoints: true,
        dateOfBirth: true,
        createdAt: true,
        sales: {
          select: {
            totalAmount: true,
          },
        },
      },
    });


    // Attach totalSpent to each customer
    return customers.map((customer) => ({
      ...customer,
      totalSpent: customer.sales.reduce(
        (sum, sale) => sum + Number(sale.totalAmount),
        0,
      ),
      sales: undefined,
    }));
  },
  searchCustomers: async (search) => {
    const customers = await prisma.customer.findMany({
      where: {
        name: { contains: search, mode: "insensitive" },
      },
      include: {
        sales: { select: { totalAmount: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    return customers.map((customer) => ({
      ...customer,
      totalSpent: customer.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0),
      sales: undefined,
    }));
  },
  getById: async (id) => {
    return await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        loyaltyPoints: true,
        dateOfBirth: true,
      },
    });
  },
  create: async (data) => {
    const {
      id,
      name,
      phone,
      email,
      address,
      loyaltyPoints,
      dateOfBirth,
      notes,
      isActive,
      createdAt,
      updatedAt,
    } = data;
    return await prisma.customer.create({
      data: {
        id,
        name,
        phone,
        email,
        address,
        loyaltyPoints,
        dateOfBirth,
        notes,
        isActive,
        createdAt,
        updatedAt,
      },
    });
  },
  update: async (id, data) => {
    const {
      name,
      phone,
      email,
      address,
      loyaltyPoints,
      dateOfBirth,
      notes,
      isActive,
    } = data;
    return await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        address,
        loyaltyPoints,
        dateOfBirth,
        notes,
        isActive,
      },
    });
  },
  delete: async (id) => {
    return await prisma.customer.delete({
      where: { id },
    });
  },
};
