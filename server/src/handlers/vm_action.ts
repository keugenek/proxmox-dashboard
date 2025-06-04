
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { type VMActionInput, type VM } from '../schema';
import { eq } from 'drizzle-orm';

export const performVMAction = async (input: VMActionInput): Promise<VM> => {
  try {
    // First, find the VM by vmid
    const existingVMs = await db.select()
      .from(vmsTable)
      .where(eq(vmsTable.vmid, input.vmid))
      .execute();

    if (existingVMs.length === 0) {
      throw new Error(`VM with ID ${input.vmid} not found`);
    }

    const vm = existingVMs[0];

    // Determine new status based on action and current status
    let newStatus = vm.status;
    let newCpuUsage = vm.cpu_usage;
    let newMemoryUsage = vm.memory_usage;
    let newMemoryUsed = vm.memory_used;
    let newUptime = vm.uptime;

    switch (input.action) {
      case 'start':
        if (vm.status === 'stopped') {
          newStatus = 'running';
          newCpuUsage = 5.0; // Default CPU usage when starting
          newMemoryUsage = 25.0; // Default memory usage when starting
          newMemoryUsed = Math.floor(vm.memory_allocated * 0.25); // 25% of allocated memory
          newUptime = 0; // Just started
        }
        break;
      case 'stop':
        if (vm.status === 'running' || vm.status === 'paused') {
          newStatus = 'stopped';
          newCpuUsage = null;
          newMemoryUsage = null;
          newMemoryUsed = null;
          newUptime = null;
        }
        break;
      case 'reboot':
        if (vm.status === 'running') {
          // For reboot, keep running status but reset uptime
          newStatus = 'running';
          newCpuUsage = 5.0;
          newMemoryUsage = 25.0;
          newMemoryUsed = Math.floor(vm.memory_allocated * 0.25);
          newUptime = 0; // Reset uptime after reboot
        }
        break;
      case 'pause':
        if (vm.status === 'running') {
          newStatus = 'paused';
          newCpuUsage = 0.0; // Paused VMs don't use CPU
          // Keep memory usage as is (paused VMs still use memory)
        }
        break;
      case 'resume':
        if (vm.status === 'paused') {
          newStatus = 'running';
          newCpuUsage = 5.0; // Resume with default CPU usage
          // Memory usage should already be set from before pause
        }
        break;
    }

    // Update the VM with new status and metrics
    const result = await db.update(vmsTable)
      .set({
        status: newStatus,
        cpu_usage: newCpuUsage,
        memory_usage: newMemoryUsage,
        memory_used: newMemoryUsed,
        uptime: newUptime,
        updated_at: new Date()
      })
      .where(eq(vmsTable.id, vm.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('VM action failed:', error);
    throw error;
  }
};
