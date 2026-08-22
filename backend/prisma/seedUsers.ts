import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type SeedUser = { email: string; name: string; role: Role; passwordVariable: string };

const users: SeedUser[] = [
  { email: 'admin@example.com', name: 'Aditya Sharma', role: Role.ADMIN, passwordVariable: 'SEED_ADMIN_PASSWORD' },
  { email: 'operations@example.com', name: 'Baldev Singh', role: Role.OPERATIONS, passwordVariable: 'SEED_OPERATIONS_PASSWORD' },
  { email: 'sales@example.com', name: 'Rohan Verma', role: Role.SALES, passwordVariable: 'SEED_SALES_PASSWORD' },
  { email: 'warehouse@example.com', name: 'Warehouse Legacy User', role: Role.WAREHOUSE, passwordVariable: 'SEED_WAREHOUSE_PASSWORD' },
  { email: 'accounts@example.com', name: 'Accounts Legacy User', role: Role.ACCOUNTS, passwordVariable: 'SEED_ACCOUNTS_PASSWORD' },
];

async function main() {
  const configuredUsers = users.filter((user) => process.env[user.passwordVariable]);
  if (configuredUsers.length === 0) {
    throw new Error('Configure at least one SEED_*_PASSWORD variable before provisioning users');
  }

  for (const user of configuredUsers) {
    const passwordHash = await bcrypt.hash(process.env[user.passwordVariable]!, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { email: user.email, name: user.name, role: user.role, passwordHash },
    });
    console.log(`Provisioned ${user.role} user: ${user.email}`);
  }

  console.log(`User provisioning complete (${configuredUsers.length} configured users).`);
}

main()
  .catch((error) => {
    console.error('User provisioning failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
