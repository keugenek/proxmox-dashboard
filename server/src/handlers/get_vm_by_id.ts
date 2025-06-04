
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { type VM } from '../schema';
import { eq } from 'drizzle-orm';

export const getVMById = async (vmid: number): Promise<VM> => {
  try {
    const results = await db.select()
      .from(vmsTable)
      .where(eq(vmsTable.vmid, vmid))
      .execute();

    if (results.length === 0) {
      throw new Error(`VM with vmid ${vmid} not found`);
    }

    const vm = results[0];
    
    // Convert real fields back to numbers - handle both string and number cases
    return {
      ...vm,
      cpu_usage: vm.cpu_usage !== null ? (typeof vm.cpu_usage === 'string' ? parseFloat(vm.cpu_usage) : vm.cpu_usage) : null,
      memory_usage: vm.memory_usage !== null ? (typeof vm.memory_usage === 'string' ? parseFloat(vm.memory_usage) : vm.memory_usage) : null
    };
  } catch (error) {
    console.error('Get VM by ID failed:', error);
    throw error;
  }
};
