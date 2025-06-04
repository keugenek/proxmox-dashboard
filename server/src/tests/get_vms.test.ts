
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { getVMs } from '../handlers/get_vms';
import { type CreateVMInput } from '../schema';

// Test VM data
const testVM1: CreateVMInput = {
  vmid: 100,
  name: 'Test VM 1',
  type: 'qemu',
  cpu_cores: 2,
  memory_allocated: 2048,
  disk_size: 20
};

const testVM2: CreateVMInput = {
  vmid: 101,
  name: 'Test Container 1',
  type: 'lxc',
  cpu_cores: 1,
  memory_allocated: 1024,
  disk_size: 10
};

describe('getVMs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no VMs exist', async () => {
    const result = await getVMs();
    expect(result).toEqual([]);
  });

  it('should return all VMs ordered by creation date (newest first)', async () => {
    // Insert first VM
    await db.insert(vmsTable).values({
      vmid: testVM1.vmid,
      name: testVM1.name,
      type: testVM1.type,
      cpu_cores: testVM1.cpu_cores,
      memory_allocated: testVM1.memory_allocated,
      disk_size: testVM1.disk_size,
      status: 'stopped'
    }).execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Insert second VM
    await db.insert(vmsTable).values({
      vmid: testVM2.vmid,
      name: testVM2.name,
      type: testVM2.type,
      cpu_cores: testVM2.cpu_cores,
      memory_allocated: testVM2.memory_allocated,
      disk_size: testVM2.disk_size,
      status: 'running',
      cpu_usage: 25.5,
      memory_usage: 60.2,
      memory_used: 614,
      uptime: 3600
    }).execute();

    const result = await getVMs();

    expect(result).toHaveLength(2);
    
    // Find VMs by vmid instead of assuming order
    const vm1 = result.find(vm => vm.vmid === testVM1.vmid);
    const vm2 = result.find(vm => vm.vmid === testVM2.vmid);
    
    expect(vm1).toBeDefined();
    expect(vm2).toBeDefined();
    
    // Verify first VM
    expect(vm1!.name).toEqual(testVM1.name);
    expect(vm1!.type).toEqual(testVM1.type);
    expect(vm1!.status).toEqual('stopped');
    expect(vm1!.cpu_usage).toBeNull();
    expect(vm1!.memory_usage).toBeNull();
    expect(vm1!.memory_used).toBeNull();
    expect(vm1!.uptime).toBeNull();
    
    // Verify second VM (running)
    expect(vm2!.name).toEqual(testVM2.name);
    expect(vm2!.type).toEqual(testVM2.type);
    expect(vm2!.status).toEqual('running');
    expect(typeof vm2!.cpu_usage).toBe('number');
    expect(vm2!.cpu_usage).toEqual(25.5);
    expect(typeof vm2!.memory_usage).toBe('number');
    expect(vm2!.memory_usage).toEqual(60.2);
    expect(vm2!.memory_used).toEqual(614);
    expect(vm2!.uptime).toEqual(3600);
    
    // Verify common fields for both
    [vm1!, vm2!].forEach(vm => {
      expect(vm.id).toBeDefined();
      expect(vm.created_at).toBeInstanceOf(Date);
      expect(vm.updated_at).toBeInstanceOf(Date);
      expect(typeof vm.cpu_cores).toBe('number');
      expect(typeof vm.memory_allocated).toBe('number');
      expect(typeof vm.disk_size).toBe('number');
    });

    // Verify ordering (second VM should be first due to later creation)
    expect(result[0].vmid).toEqual(testVM2.vmid);
    expect(result[1].vmid).toEqual(testVM1.vmid);
  });

  it('should handle VMs with different statuses correctly', async () => {
    // Insert VMs with different statuses
    await db.insert(vmsTable).values([
      {
        vmid: 200,
        name: 'Paused VM',
        type: 'qemu',
        status: 'paused',
        cpu_cores: 2,
        memory_allocated: 2048,
        disk_size: 20,
        cpu_usage: 0,
        memory_usage: 45.8,
        memory_used: 938,
        uptime: 7200
      },
      {
        vmid: 201,
        name: 'Suspended VM',
        type: 'lxc',
        status: 'suspended',
        cpu_cores: 1,
        memory_allocated: 1024,
        disk_size: 15
      }
    ]).execute();

    const result = await getVMs();

    expect(result).toHaveLength(2);
    
    const pausedVM = result.find(vm => vm.status === 'paused');
    const suspendedVM = result.find(vm => vm.status === 'suspended');
    
    expect(pausedVM).toBeDefined();
    expect(pausedVM!.vmid).toEqual(200);
    expect(typeof pausedVM!.cpu_usage).toBe('number');
    expect(pausedVM!.cpu_usage).toEqual(0);
    expect(typeof pausedVM!.memory_usage).toBe('number');
    expect(pausedVM!.memory_usage).toEqual(45.8);
    
    expect(suspendedVM).toBeDefined();
    expect(suspendedVM!.vmid).toEqual(201);
    expect(suspendedVM!.cpu_usage).toBeNull();
    expect(suspendedVM!.memory_usage).toBeNull();
  });
});
