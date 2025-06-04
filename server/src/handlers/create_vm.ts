
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { type CreateVMInput, type VM } from '../schema';

export const createVM = async (input: CreateVMInput): Promise<VM> => {
  try {
    // Insert VM record
    const result = await db.insert(vmsTable)
      .values({
        vmid: input.vmid,
        name: input.name,
        type: input.type,
        status: 'stopped', // New VMs start as stopped
        cpu_cores: input.cpu_cores,
        memory_allocated: input.memory_allocated,
        disk_size: input.disk_size,
        cpu_usage: null, // Null when stopped
        memory_usage: null, // Null when stopped
        memory_used: null, // Null when stopped
        uptime: null // Null when stopped
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('VM creation failed:', error);
    throw error;
  }
};
