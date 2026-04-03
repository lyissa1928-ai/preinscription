import { join } from 'path';

const clientPath = join(process.cwd(), 'generated', 'prisma-client');
export const { PrismaClient, Prisma } = require(clientPath);
