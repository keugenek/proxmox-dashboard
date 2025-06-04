
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { type UpdateVMInput, type VM } from '../schema';
import { eq } from 'drizzle-orm';

export const updateVM = async (input: UpdateVMInput): Promise<VM> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof vmsTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.cpu_cores !== undefined) {
      updateData.cpu_cores = input.cpu_cores;
    }
    
    if (input.memory_allocated !== undefined) {
      updateData.memory_allocated = input.memory_allocated;
    }
    
    if (input.disk_size !== undefined) {
      updateData.disk_size = input.disk_size;
    }

    // Always update the timestamp
    updateData.updated_at = new Date();

    // Update the VM record
    const result = await db.update(vmsTable)
      .set(updateData)
      .where(eq(vmsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`VM with id ${input.id} not found`);
    }

    // Convert real fields back to numbers for return
    const vm = result[0];
    return {
      ...vm,
      cpu_usage: vm.cpu_usage !== null ? parseFloat(vm.cpu_usage.toString()) : null,
      memory_usage: vm.memory_usage !== null ? parseFloat(vm.memory_usage.toString()) : null
    };
  } catch (error) {
    console.error('VM update failed:', error);
    throw error;
  }
};
