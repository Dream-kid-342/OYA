import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '../../loan-service/src/services/repayment-schedule.service': path.resolve(__dirname, '../loan-service/src/services/repayment-schedule.service.ts'),
    },
  },
});
