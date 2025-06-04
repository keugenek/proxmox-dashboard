
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vmsTable } from '../db/schema';
import { type VMActionInput } from '../schema';
import { performVMAction } from '../handlers/vm_action';
import { eq } from 'drizzle-orm';

describe('performVMAction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test VM
  const createTestVM = async (status: 'running' | 'stopped' | 'paused' = 'stopped') => {
    const vmData = {
      vmid: 100,
      name: 'test-vm',
      type: 'qemu' as const,
      status,
      cpu_usage: status === 'running' ? 10.5 : null,
      memory_usage: status === 'running' ? 30.0 : null,
      memory_allocated: 2048,
      memory_used: status === 'running' ? 614 : null,
      cpu_cores: 2,
      disk_size: 20,
      uptime: status === 'running' ? 3600 : null
    };

    const result = await db.insert(vmsTable)
      .values(vmData)
      .returning()
      .execute();

    return result[0];
  };

  describe('start action', () => {
    it('should start a stopped VM', async () => {
      await createTestVM('stopped');

      const input: VMActionInput = {
        vmid: 100,
        action: 'start'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('running');
      expect(result.cpu_usage).toEqual(5.0);
      expect(result.memory_usage).toEqual(25.0);
      expect(result.memory_used).toEqual(512); // 25% of 2048MB
      expect(result.uptime).toEqual(0);
    });

    it('should not change status of already running VM', async () => {
      const vm = await createTestVM('running');

      const input: VMActionInput = {
        vmid: 100,
        action: 'start'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('running');
      expect(result.cpu_usage).toEqual(vm.cpu_usage);
      expect(result.memory_usage).toEqual(vm.memory_usage);
    });
  });

  describe('stop action', () => {
    it('should stop a running VM', async () => {
      await createTestVM('running');

      const input: VMActionInput = {
        vmid: 100,
        action: 'stop'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('stopped');
      expect(result.cpu_usage).toBeNull();
      expect(result.memory_usage).toBeNull();
      expect(result.memory_used).toBeNull();
      expect(result.uptime).toBeNull();
    });

    it('should stop a paused VM', async () => {
      await createTestVM('paused');

      const input: VMActionInput = {
        vmid: 100,
        action: 'stop'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('stopped');
      expect(result.cpu_usage).toBeNull();
      expect(result.memory_usage).toBeNull();
      expect(result.memory_used).toBeNull();
      expect(result.uptime).toBeNull();
    });
  });

  describe('reboot action', () => {
    it('should reboot a running VM', async () => {
      await createTestVM('running');

      const input: VMActionInput = {
        vmid: 100,
        action: 'reboot'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('running');
      expect(result.cpu_usage).toEqual(5.0);
      expect(result.memory_usage).toEqual(25.0);
      expect(result.memory_used).toEqual(512);
      expect(result.uptime).toEqual(0); // Reset after reboot
    });

    it('should not reboot a stopped VM', async () => {
      const vm = await createTestVM('stopped');

      const input: VMActionInput = {
        vmid: 100,
        action: 'reboot'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('stopped');
      expect(result.cpu_usage).toEqual(vm.cpu_usage);
      expect(result.memory_usage).toEqual(vm.memory_usage);
    });
  });

  describe('pause action', () => {
    it('should pause a running VM', async () => {
      const vm = await createTestVM('running');

      const input: VMActionInput = {
        vmid: 100,
        action: 'pause'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('paused');
      expect(result.cpu_usage).toEqual(0.0);
      expect(result.memory_usage).toEqual(vm.memory_usage); // Memory usage preserved
      expect(result.memory_used).toEqual(vm.memory_used);
    });

    it('should not pause a stopped VM', async () => {
      const vm = await createTestVM('stopped');

      const input: VMActionInput = {
        vmid: 100,
        action: 'pause'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('stopped');
      expect(result.cpu_usage).toEqual(vm.cpu_usage);
    });
  });

  describe('resume action', () => {
    it('should resume a paused VM', async () => {
      await createTestVM('paused');

      const input: VMActionInput = {
        vmid: 100,
        action: 'resume'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('running');
      expect(result.cpu_usage).toEqual(5.0);
      expect(result.memory_usage).toBeNull(); // Was null when paused
    });

    it('should not resume a stopped VM', async () => {
      const vm = await createTestVM('stopped');

      const input: VMActionInput = {
        vmid: 100,
        action: 'resume'
      };

      const result = await performVMAction(input);

      expect(result.status).toEqual('stopped');
      expect(result.cpu_usage).toEqual(vm.cpu_usage);
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent VM', async () => {
      const input: VMActionInput = {
        vmid: 999,
        action: 'start'
      };

      expect(performVMAction(input)).rejects.toThrow(/VM with ID 999 not found/i);
    });
  });

  describe('database persistence', () => {
    it('should persist VM status changes to database', async () => {
      await createTestVM('stopped');

      const input: VMActionInput = {
        vmid: 100,
        action: 'start'
      };

      await performVMAction(input);

      // Verify changes persisted to database
      const vms = await db.select()
        .from(vmsTable)
        .where(eq(vmsTable.vmid, 100))
        .execute();

      expect(vms).toHaveLength(1);
      expect(vms[0].status).toEqual('running');
      expect(vms[0].cpu_usage).toEqual(5.0);
      expect(vms[0].memory_usage).toEqual(25.0);
      expect(vms[0].uptime).toEqual(0);
    });
  });
});
