import { defineConfig } from '@prisma/internals';

export default defineConfig({
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
