
import { PrismaClient } from "@prisma/client";

export type MockPrismaService = {
  [K in keyof PrismaClient]: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
    groupBy: jest.Mock;
    upsert: jest.Mock;
  };
} & {
  $transaction: jest.Mock;
};

export const createPrismaMock = (): MockPrismaService => {
  const cache: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: function (target: Record<string, unknown>, prop: string | symbol) {
      if (prop === "$transaction") {
        if (!cache["$transaction"]) {
          cache["$transaction"] = jest.fn(
            async (cb: (tx: unknown) => Promise<unknown>) => cb(proxy),
          );
        }
        return cache["$transaction"];
      }
      const key = String(prop);
      if (!cache[key]) {
        cache[key] = {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          createMany: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
          count: jest.fn(),
          groupBy: jest.fn().mockResolvedValue([]),
          upsert: jest.fn(),
        };
      }
      return cache[key];
    },
  };

  const proxy = new Proxy({}, handler) as unknown as MockPrismaService;
  return proxy;
};
