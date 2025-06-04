
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { getVMById } from '../handlers/get_vm_by_id';

describe('getVMById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve VM by vmid', async () => {
    // Create test VM first
    await db.insert(vmsTable)
      .values({
        vmid: 100,
        name: 'Test VM',
        type: 'qemu',
        cpu_cores: 2,
        memory_allocated: 2048,
        disk_size: 20,
        status: 'stopped'
      })
      .execute();

    const result = await getVMById(100);

    // Verify basic fields
    expect(result.vmid).toEqual(100);
    expect(result.name).toEqual('Test VM');
    expect(result.type).toEqual('qemu');
    expect(result.status).toEqual('stopped');
    expect(result.cpu_cores).toEqual(2);
    expect(result.memory_allocated).toEqual(2048);
    expect(result.disk_size).toEqual(20);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify nullable fields are null when stopped
    expect(result.cpu_usage).toBeNull();
    expect(result.memory_usage).toBeNull();
    expect(result.memory_used).toBeNull();
    expect(result.uptime).toBeNull();
  });

  it('should retrieve running VM with usage metrics', async () => {
    // Create running VM with metrics
    await db.insert(vmsTable)
      .values({
        vmid: 101,
        name: 'Running VM',
        type: 'lxc',
        status: 'running',
        cpu_usage: 45.5,
        memory_usage: 78.2,
        memory_used: 1600,
        cpu_cores: 4,
        memory_allocated: 4096,
        disk_size: 40,
        uptime: 3600
      })
      .execute();

    const result = await getVMById(101);

    // Verify running VM fields
    expect(result.vmid).toEqual(101);
    expect(result.name).toEqual('Running VM');
    expect(result.type).toEqual('lxc');
    expect(result.status).toEqual('running');
    
    // Verify usage metrics are numbers
    expect(result.cpu_usage).toEqual(45.5);
    expect(typeof result.cpu_usage).toEqual('number');
    expect(result.memory_usage).toEqual(78.2);
    expect(typeof result.memory_usage).toEqual('number');
    expect(result.memory_used).toEqual(1600);
    expect(result.uptime).toEqual(3600);
  });

  it('should throw error for non-existent VM', async () => {
    await expect(getVMById(999)).rejects.toThrow(/VM with vmid 999 not found/i);
  });

  it('should handle paused VM status', async () => {
    // Create paused VM
    await db.insert(vmsTable)
      .values({
        vmid: 102,
        name: 'Paused VM',
        type: 'qemu',
        status: 'paused',
        cpu_usage: 0,
        memory_usage: 25.0,
        memory_used: 512,
        cpu_cores: 1,
        memory_allocated: 2048,
        disk_size: 10,
        uptime: 1800
      })
      .execute();

    const result = await getVMById(102);

    expect(result.status).toEqual('paused');
    expect(result.cpu_usage).toEqual(0);
    expect(result.memory_usage).toEqual(25.0);
    expect(result.memory_used).toEqual(512);
    expect(result.uptime).toEqual(1800);
  });
});
