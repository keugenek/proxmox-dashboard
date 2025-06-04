
import { db } from '../db';
import { resourceMetricsTable, vmsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type ResourceMetrics } from '../schema';

export const recordVMMetrics = async (vmid: number): Promise<ResourceMetrics> => {
  try {
    // First verify the VM exists
    const vm = await db.select()
      .from(vmsTable)
      .where(eq(vmsTable.vmid, vmid))
      .execute();

    if (vm.length === 0) {
      throw new Error(`VM with VMID ${vmid} not found`);
    }

    const vmData = vm[0];

    // Only record metrics for running VMs
    if (vmData.status !== 'running') {
      throw new Error(`Cannot record metrics for VM ${vmid} - VM is not running (status: ${vmData.status})`);
    }

    // Use current VM metrics data
    const result = await db.insert(resourceMetricsTable)
      .values({
        vmid: vmid,
        cpu_usage: vmData.cpu_usage || 0,
        memory_usage: vmData.memory_usage || 0,
        memory_used: vmData.memory_used || 0,
        disk_read: 0, // Default values for disk I/O
        disk_write: 0,
        network_in: 0, // Default values for network I/O
        network_out: 0
      })
      .returning()
      .execute();

    const metrics = result[0];
    
    // Convert real/numeric fields back to numbers
    return {
      ...metrics,
      cpu_usage: Number(metrics.cpu_usage),
      memory_usage: Number(metrics.memory_usage),
      disk_read: Number(metrics.disk_read),
      disk_write: Number(metrics.disk_write),
      network_in: Number(metrics.network_in),
      network_out: Number(metrics.network_out)
    };
  } catch (error) {
    console.error('VM metrics recording failed:', error);
    throw error;
  }
};
