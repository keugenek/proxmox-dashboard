
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { type VM } from '../schema';
import { desc } from 'drizzle-orm';

export const getVMs = async (): Promise<VM[]> => {
  try {
    const results = await db.select()
      .from(vmsTable)
      .orderBy(desc(vmsTable.created_at))
      .execute();

    // Convert real/numeric fields to numbers
    return results.map(vm => ({
      ...vm,
      cpu_usage: vm.cpu_usage !== null ? Number(vm.cpu_usage) : null,
      memory_usage: vm.memory_usage !== null ? Number(vm.memory_usage) : null
    }));
  } catch (error) {
    console.error('Failed to fetch VMs:', error);
    throw error;
  }
};
