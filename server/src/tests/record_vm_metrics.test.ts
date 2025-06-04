
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vmsTable, resourceMetricsTable } from '../db/schema';
import { recordVMMetrics } from '../handlers/record_vm_metrics';
import { eq } from 'drizzle-orm';

// Test VM data
const testVMData = {
  vmid: 100,
  name: 'test-vm',
  type: 'qemu' as const,
  status: 'running' as const,
  cpu_usage: 45.5,
  memory_usage: 60.2,
  memory_allocated: 2048,
  memory_used: 1230,
  cpu_cores: 2,
  disk_size: 20,
  uptime: 3600
};

const stoppedVMData = {
  vmid: 101,
  name: 'stopped-vm',
  type: 'lxc' as const,
  status: 'stopped' as const,
  cpu_usage: null,
  memory_usage: null,
  memory_allocated: 1024,
  memory_used: null,
  cpu_cores: 1,
  disk_size: 10,
  uptime: null
};

describe('recordVMMetrics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should record metrics for a running VM', async () => {
    // Create test VM
    await db.insert(vmsTable).values(testVMData).execute();

    const result = await recordVMMetrics(100);

    // Verify returned metrics
    expect(result.vmid).toEqual(100);
    expect(result.cpu_usage).toEqual(45.5);
    expect(result.memory_usage).toEqual(60.2);
    expect(result.memory_used).toEqual(1230);
    expect(result.disk_read).toEqual(0);
    expect(result.disk_write).toEqual(0);
    expect(result.network_in).toEqual(0);
    expect(result.network_out).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.recorded_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.cpu_usage).toBe('number');
    expect(typeof result.memory_usage).toBe('number');
    expect(typeof result.disk_read).toBe('number');
    expect(typeof result.network_in).toBe('number');
  });

  it('should save metrics to database', async () => {
    // Create test VM
    await db.insert(vmsTable).values(testVMData).execute();

    const result = await recordVMMetrics(100);

    // Query database to verify metrics were saved
    const metrics = await db.select()
      .from(resourceMetricsTable)
      .where(eq(resourceMetricsTable.id, result.id))
      .execute();

    expect(metrics).toHaveLength(1);
    expect(metrics[0].vmid).toEqual(100);
    expect(Number(metrics[0].cpu_usage)).toEqual(45.5);
    expect(Number(metrics[0].memory_usage)).toEqual(60.2);
    expect(metrics[0].memory_used).toEqual(1230);
    expect(metrics[0].recorded_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent VM', async () => {
    await expect(recordVMMetrics(999)).rejects.toThrow(/VM with VMID 999 not found/i);
  });

  it('should throw error for stopped VM', async () => {
    // Create stopped VM
    await db.insert(vmsTable).values(stoppedVMData).execute();

    await expect(recordVMMetrics(101)).rejects.toThrow(/Cannot record metrics for VM 101.*not running.*status: stopped/i);
  });

  it('should handle VM with null usage values', async () => {
    // Create running VM with null usage values
    const vmWithNullValues = {
      ...testVMData,
      vmid: 102,
      cpu_usage: null,
      memory_usage: null,
      memory_used: null
    };
    
    await db.insert(vmsTable).values(vmWithNullValues).execute();

    const result = await recordVMMetrics(102);

    // Should use 0 as default for null values
    expect(result.cpu_usage).toEqual(0);
    expect(result.memory_usage).toEqual(0);
    expect(result.memory_used).toEqual(0);
    expect(result.vmid).toEqual(102);
  });

  it('should record multiple metrics for same VM', async () => {
    // Create test VM
    await db.insert(vmsTable).values(testVMData).execute();

    // Record metrics twice
    const result1 = await recordVMMetrics(100);
    const result2 = await recordVMMetrics(100);

    // Both should be saved with different IDs and timestamps
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.vmid).toEqual(100);
    expect(result2.vmid).toEqual(100);

    // Verify both records exist in database
    const allMetrics = await db.select()
      .from(resourceMetricsTable)
      .where(eq(resourceMetricsTable.vmid, 100))
      .execute();

    expect(allMetrics).toHaveLength(2);
  });
});
