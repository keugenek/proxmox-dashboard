
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

import { 
  createVMInputSchema, 
  updateVMInputSchema, 
  vmActionInputSchema,
  getResourceMetricsInputSchema
} from './schema';

import { getDashboardOverview } from './handlers/get_dashboard_overview';
import { getHostStatus } from './handlers/get_host_status';
import { getVMs } from './handlers/get_vms';
import { getVMById } from './handlers/get_vm_by_id';
import { createVM } from './handlers/create_vm';
import { updateVM } from './handlers/update_vm';
import { performVMAction } from './handlers/vm_action';
import { getResourceMetrics } from './handlers/get_resource_metrics';
import { updateHostStatus } from './handlers/update_host_status';
import { recordVMMetrics } from './handlers/record_vm_metrics';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Dashboard endpoints
  getDashboardOverview: publicProcedure
    .query(() => getDashboardOverview()),

  getHostStatus: publicProcedure
    .query(() => getHostStatus()),

  updateHostStatus: publicProcedure
    .mutation(() => updateHostStatus()),

  // VM/Container management endpoints
  getVMs: publicProcedure
    .query(() => getVMs()),

  getVMById: publicProcedure
    .input(z.number().int().positive())
    .query(({ input }) => getVMById(input)),

  createVM: publicProcedure
    .input(createVMInputSchema)
    .mutation(({ input }) => createVM(input)),

  updateVM: publicProcedure
    .input(updateVMInputSchema)
    .mutation(({ input }) => updateVM(input)),

  performVMAction: publicProcedure
    .input(vmActionInputSchema)
    .mutation(({ input }) => performVMAction(input)),

  // Resource monitoring endpoints
  getResourceMetrics: publicProcedure
    .input(getResourceMetricsInputSchema)
    .query(({ input }) => getResourceMetrics(input)),

  recordVMMetrics: publicProcedure
    .input(z.number().int().positive())
    .mutation(({ input }) => recordVMMetrics(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
