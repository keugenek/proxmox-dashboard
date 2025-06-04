
import { z } from 'zod';

// Enums for Proxmox entities
export const vmStatusEnum = z.enum(['running', 'stopped', 'paused', 'suspended']);
export const vmTypeEnum = z.enum(['qemu', 'lxc']);
export const actionTypeEnum = z.enum(['start', 'stop', 'reboot', 'pause', 'resume']);

// Host status schema
export const hostStatusSchema = z.object({
  id: z.number(),
  hostname: z.string(),
  uptime: z.number(),
  cpu_usage: z.number().min(0).max(100), // Percentage
  memory_usage: z.number().min(0).max(100), // Percentage
  total_memory: z.number().int().nonnegative(), // MB
  used_memory: z.number().int().nonnegative(), // MB
  load_average: z.string(),
  updated_at: z.coerce.date()
});

export type HostStatus = z.infer<typeof hostStatusSchema>;

// VM/Container schema
export const vmSchema = z.object({
  id: z.number(),
  vmid: z.number().int().positive(), // Proxmox VM ID
  name: z.string(),
  type: vmTypeEnum,
  status: vmStatusEnum,
  cpu_usage: z.number().min(0).max(100).nullable(), // Percentage, null if stopped
  memory_usage: z.number().min(0).max(100).nullable(), // Percentage, null if stopped
  memory_allocated: z.number().int().nonnegative(), // MB
  memory_used: z.number().int().nonnegative().nullable(), // MB, null if stopped
  cpu_cores: z.number().int().positive(),
  disk_size: z.number().int().nonnegative(), // GB
  uptime: z.number().int().nonnegative().nullable(), // Seconds, null if stopped
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type VM = z.infer<typeof vmSchema>;

// Input schemas
export const createVMInputSchema = z.object({
  vmid: z.number().int().positive(),
  name: z.string().min(1),
  type: vmTypeEnum,
  cpu_cores: z.number().int().positive().default(1),
  memory_allocated: z.number().int().positive(), // MB
  disk_size: z.number().int().positive() // GB
});

export type CreateVMInput = z.infer<typeof createVMInputSchema>;

export const updateVMInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  cpu_cores: z.number().int().positive().optional(),
  memory_allocated: z.number().int().positive().optional(),
  disk_size: z.number().int().positive().optional()
});

export type UpdateVMInput = z.infer<typeof updateVMInputSchema>;

export const vmActionInputSchema = z.object({
  vmid: z.number().int().positive(),
  action: actionTypeEnum
});

export type VMActionInput = z.infer<typeof vmActionInputSchema>;

// Dashboard overview schema
export const dashboardOverviewSchema = z.object({
  host: hostStatusSchema,
  vm_summary: z.object({
    total_vms: z.number().int().nonnegative(),
    running_vms: z.number().int().nonnegative(),
    stopped_vms: z.number().int().nonnegative(),
    total_containers: z.number().int().nonnegative(),
    running_containers: z.number().int().nonnegative(),
    stopped_containers: z.number().int().nonnegative()
  }),
  recent_vms: z.array(vmSchema).max(5)
});

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;

// Resource monitoring schema
export const resourceMetricsSchema = z.object({
  id: z.number(),
  vmid: z.number().int().positive(),
  cpu_usage: z.number().min(0).max(100),
  memory_usage: z.number().min(0).max(100),
  memory_used: z.number().int().nonnegative(), // MB
  disk_read: z.number().nonnegative(), // MB/s
  disk_write: z.number().nonnegative(), // MB/s
  network_in: z.number().nonnegative(), // MB/s
  network_out: z.number().nonnegative(), // MB/s
  recorded_at: z.coerce.date()
});

export type ResourceMetrics = z.infer<typeof resourceMetricsSchema>;

export const getResourceMetricsInputSchema = z.object({
  vmid: z.number().int().positive(),
  hours: z.number().int().positive().max(24).default(1) // Last N hours
});

export type GetResourceMetricsInput = z.infer<typeof getResourceMetricsInputSchema>;
