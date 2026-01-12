import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: './lib/prisma/schema.prisma',

  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});
