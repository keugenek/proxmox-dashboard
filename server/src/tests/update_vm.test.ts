
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { type UpdateVMInput, type CreateVMInput } from '../schema';
import { updateVM } from '../handlers/update_vm';
import { eq } from 'drizzle-orm';

describe('updateVM', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a test VM directly in database
  const createTestVM = async (): Promise<number> => {
    const result = await db.insert(vmsTable)
      .values({
        vmid: 100,
        name: 'Original VM',
        type: 'qemu',
        cpu_cores: 2,
        memory_allocated: 2048,
        disk_size: 20,
        status: 'stopped'
      })
      .returning()
      .execute();
    
    return result[0].id;
  };

  it('should update VM name', async () => {
    const vmId = await createTestVM();
    
    const updateInput: UpdateVMInput = {
      id: vmId,
      name: 'Updated VM Name'
    };

    const result = await updateVM(updateInput);

    expect(result.id).toBe(vmId);
    expect(result.name).toBe('Updated VM Name');
    expect(result.cpu_cores).toBe(2); // Should remain unchanged
    expect(result.memory_allocated).toBe(2048); // Should remain unchanged
    expect(result.disk_size).toBe(20); // Should remain unchanged
  });

  it('should update VM cpu_cores', async () => {
    const vmId = await createTestVM();
    
    const updateInput: UpdateVMInput = {
      id: vmId,
      cpu_cores: 4
    };

    const result = await updateVM(updateInput);

    expect(result.id).toBe(vmId);
    expect(result.cpu_cores).toBe(4);
    expect(result.name).toBe('Original VM'); // Should remain unchanged
    expect(result.memory_allocated).toBe(2048); // Should remain unchanged
    expect(result.disk_size).toBe(20); // Should remain unchanged
  });

  it('should update VM memory_allocated', async () => {
    const vmId = await createTestVM();
    
    const updateInput: UpdateVMInput = {
      id: vmId,
      memory_allocated: 4096
    };

    const result = await updateVM(updateInput);

    expect(result.id).toBe(vmId);
    expect(result.memory_allocated).toBe(4096);
    expect(result.name).toBe('Original VM'); // Should remain unchanged
    expect(result.cpu_cores).toBe(2); // Should remain unchanged
    expect(result.disk_size).toBe(20); // Should remain unchanged
  });

  it('should update VM disk_size', async () => {
    const vmId = await createTestVM();
    
    const updateInput: UpdateVMInput = {
      id: vmId,
      disk_size: 50
    };

    const result = await updateVM(updateInput);

    expect(result.id).toBe(vmId);
    expect(result.disk_size).toBe(50);
    expect(result.name).toBe('Original VM'); // Should remain unchanged
    expect(result.cpu_cores).toBe(2); // Should remain unchanged
    expect(result.memory_allocated).toBe(2048); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const vmId = await createTestVM();
    
    const updateInput: UpdateVMInput = {
      id: vmId,
      name: 'Multi-Update VM',
      cpu_cores: 8,
      memory_allocated: 8192,
      disk_size: 100
    };

    const result = await updateVM(updateInput);

    expect(result.id).toBe(vmId);
    expect(result.name).toBe('Multi-Update VM');
    expect(result.cpu_cores).toBe(8);
    expect(result.memory_allocated).toBe(8192);
    expect(result.disk_size).toBe(100);
  });

  it('should update the updated_at timestamp', async () => {
    const vmId = await createTestVM();
    
    // Get original timestamp
    const originalVM = await db.select()
      .from(vmsTable)
      .where(eq(vmsTable.id, vmId))
      .execute();
    
    const originalTimestamp = originalVM[0].updated_at;
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updateInput: UpdateVMInput = {
      id: vmId,
      name: 'Updated VM'
    };

    const result = await updateVM(updateInput);
    
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should save updates to database', async () => {
    const vmId = await createTestVM();
    
    const updateInput: UpdateVMInput = {
      id: vmId,
      name: 'Database Update Test',
      cpu_cores: 6
    };

    await updateVM(updateInput);

    // Verify changes were persisted
    const vms = await db.select()
      .from(vmsTable)
      .where(eq(vmsTable.id, vmId))
      .execute();

    expect(vms).toHaveLength(1);
    expect(vms[0].name).toBe('Database Update Test');
    expect(vms[0].cpu_cores).toBe(6);
    expect(vms[0].memory_allocated).toBe(2048); // Should remain unchanged
  });

  it('should throw error for non-existent VM', async () => {
    const updateInput: UpdateVMInput = {
      id: 999999, // Non-existent ID
      name: 'Should Fail'
    };

    await expect(updateVM(updateInput)).rejects.toThrow(/VM with id 999999 not found/i);
  });

  it('should handle real number fields correctly', async () => {
    const vmId = await createTestVM();
    
    // Create VM with real number fields set
    await db.update(vmsTable)
      .set({
        cpu_usage: 45.5,
        memory_usage: 67.8
      })
      .where(eq(vmsTable.id, vmId))
      .execute();
    
    const updateInput: UpdateVMInput = {
      id: vmId,
      name: 'Real Number Test'
    };

    const result = await updateVM(updateInput);

    expect(typeof result.cpu_usage).toBe('number');
    expect(typeof result.memory_usage).toBe('number');
    expect(result.cpu_usage).toBe(45.5);
    expect(result.memory_usage).toBe(67.8);
  });
});
