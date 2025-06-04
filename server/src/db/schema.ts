
import { serial, text, pgTable, timestamp, integer, real, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const vmStatusEnum = pgEnum('vm_status', ['running', 'stopped', 'paused', 'suspended']);
export const vmTypeEnum = pgEnum('vm_type', ['qemu', 'lxc']);

// Host status table
export const hostStatusTable = pgTable('host_status', {
  id: serial('id').primaryKey(),
  hostname: text('hostname').notNull(),
  uptime: integer('uptime').notNull(), // Seconds
  cpu_usage: real('cpu_usage').notNull(), // Percentage
  memory_usage: real('memory_usage').notNull(), // Percentage
  total_memory: integer('total_memory').notNull(), // MB
  used_memory: integer('used_memory').notNull(), // MB
  load_average: text('load_average').notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// VMs and Containers table
export const vmsTable = pgTable('vms', {
  id: serial('id').primaryKey(),
  vmid: integer('vmid').notNull().unique(), // Proxmox VM ID
  name: text('name').notNull(),
  type: vmTypeEnum('type').notNull(),
  status: vmStatusEnum('status').notNull().default('stopped'),
  cpu_usage: real('cpu_usage'), // Percentage, nullable when stopped
  memory_usage: real('memory_usage'), // Percentage, nullable when stopped
  memory_allocated: integer('memory_allocated').notNull(), // MB
  memory_used: integer('memory_used'), // MB, nullable when stopped
  cpu_cores: integer('cpu_cores').notNull().default(1),
  disk_size: integer('disk_size').notNull(), // GB
  uptime: integer('uptime'), // Seconds, nullable when stopped
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Resource metrics table for monitoring
export const resourceMetricsTable = pgTable('resource_metrics', {
  id: serial('id').primaryKey(),
  vmid: integer('vmid').notNull(),
  cpu_usage: real('cpu_usage').notNull(), // Percentage
  memory_usage: real('memory_usage').notNull(), // Percentage
  memory_used: integer('memory_used').notNull(), // MB
  disk_read: real('disk_read').notNull().default(0), // MB/s
  disk_write: real('disk_write').notNull().default(0), // MB/s
  network_in: real('network_in').notNull().default(0), // MB/s
  network_out: real('network_out').notNull().default(0), // MB/s
  recorded_at: timestamp('recorded_at').defaultNow().notNull(),
});

// TypeScript types for the table schemas
export type HostStatus = typeof hostStatusTable.$inferSelect;
export type NewHostStatus = typeof hostStatusTable.$inferInsert;

export type VM = typeof vmsTable.$inferSelect;
export type NewVM = typeof vmsTable.$inferInsert;

export type ResourceMetrics = typeof resourceMetricsTable.$inferSelect;
export type NewResourceMetrics = typeof resourceMetricsTable.$inferInsert;

// Export all tables for relation queries
export const tables = { 
  hostStatus: hostStatusTable, 
  vms: vmsTable, 
  resourceMetrics: resourceMetricsTable 
};
