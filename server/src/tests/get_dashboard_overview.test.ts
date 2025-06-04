
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hostStatusTable, vmsTable } from '../db/schema';
import { getDashboardOverview } from '../handlers/get_dashboard_overview';

describe('getDashboardOverview', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get dashboard overview with host status, VM summary, and recent VMs', async () => {
    // Create host status
    await db.insert(hostStatusTable).values({
      hostname: 'pve-node1',
      uptime: 86400,
      cpu_usage: 25.5,
      memory_usage: 60.2,
      total_memory: 32768,
      used_memory: 19661,
      load_average: '1.25 1.15 1.05'
    }).execute();

    // Create test VMs one by one to ensure proper ordering
    await db.insert(vmsTable).values({
      vmid: 100,
      name: 'web-server',
      type: 'qemu',
      status: 'running',
      cpu_usage: 15.5,
      memory_usage: 45.2,
      memory_allocated: 4096,
      memory_used: 1852,
      cpu_cores: 2,
      disk_size: 50,
      uptime: 3600
    }).execute();

    await db.insert(vmsTable).values({
      vmid: 101,
      name: 'database',
      type: 'qemu',
      status: 'stopped',
      cpu_usage: null,
      memory_usage: null,
      memory_allocated: 8192,
      memory_used: null,
      cpu_cores: 4,
      disk_size: 100,
      uptime: null
    }).execute();

    await db.insert(vmsTable).values({
      vmid: 200,
      name: 'proxy-container',
      type: 'lxc',
      status: 'running',
      cpu_usage: 5.1,
      memory_usage: 20.8,
      memory_allocated: 1024,
      memory_used: 213,
      cpu_cores: 1,
      disk_size: 20,
      uptime: 7200
    }).execute();

    const result = await getDashboardOverview();

    // Validate host status
    expect(result.host.hostname).toEqual('pve-node1');
    expect(result.host.uptime).toEqual(86400);
    expect(result.host.cpu_usage).toEqual(25.5);
    expect(result.host.memory_usage).toEqual(60.2);
    expect(result.host.total_memory).toEqual(32768);
    expect(result.host.used_memory).toEqual(19661);
    expect(result.host.load_average).toEqual('1.25 1.15 1.05');
    expect(result.host.updated_at).toBeInstanceOf(Date);

    // Validate VM summary
    expect(result.vm_summary.total_vms).toEqual(2);
    expect(result.vm_summary.running_vms).toEqual(1);
    expect(result.vm_summary.stopped_vms).toEqual(1);
    expect(result.vm_summary.total_containers).toEqual(1);
    expect(result.vm_summary.running_containers).toEqual(1);
    expect(result.vm_summary.stopped_containers).toEqual(0);

    // Validate recent VMs (ordered by creation date, most recent first)
    expect(result.recent_vms).toHaveLength(3);
    expect(result.recent_vms[0].name).toEqual('proxy-container'); // Last inserted
    expect(result.recent_vms[0].type).toEqual('lxc');
    expect(result.recent_vms[0].cpu_usage).toEqual(5.1);
    expect(result.recent_vms[0].memory_usage).toEqual(20.8);
    expect(result.recent_vms[1].name).toEqual('database'); // Second to last
    expect(result.recent_vms[1].cpu_usage).toBeNull();
    expect(result.recent_vms[1].memory_usage).toBeNull();
    expect(result.recent_vms[2].name).toEqual('web-server'); // First inserted
  });

  it('should handle case with no VMs', async () => {
    // Create only host status
    await db.insert(hostStatusTable).values({
      hostname: 'pve-empty',
      uptime: 3600,
      cpu_usage: 5.0,
      memory_usage: 10.0,
      total_memory: 16384,
      used_memory: 1638,
      load_average: '0.25 0.20 0.15'
    }).execute();

    const result = await getDashboardOverview();

    expect(result.host.hostname).toEqual('pve-empty');
    expect(result.vm_summary.total_vms).toEqual(0);
    expect(result.vm_summary.running_vms).toEqual(0);
    expect(result.vm_summary.stopped_vms).toEqual(0);
    expect(result.vm_summary.total_containers).toEqual(0);
    expect(result.vm_summary.running_containers).toEqual(0);
    expect(result.vm_summary.stopped_containers).toEqual(0);
    expect(result.recent_vms).toHaveLength(0);
  });

  it('should throw error when no host status available', async () => {
    await expect(getDashboardOverview()).rejects.toThrow(/No host status data available/);
  });

  it('should limit recent VMs to 5 entries', async () => {
    // Create host status
    await db.insert(hostStatusTable).values({
      hostname: 'pve-test',
      uptime: 3600,
      cpu_usage: 10.0,
      memory_usage: 20.0,
      total_memory: 8192,
      used_memory: 1638,
      load_average: '0.5 0.4 0.3'
    }).execute();

    // Create 7 VMs one by one to ensure proper ordering
    for (let i = 0; i < 7; i++) {
      await db.insert(vmsTable).values({
        vmid: 100 + i,
        name: `vm-${i}`,
        type: 'qemu',
        status: 'stopped',
        cpu_usage: null,
        memory_usage: null,
        memory_allocated: 2048,
        memory_used: null,
        cpu_cores: 2,
        disk_size: 30,
        uptime: null
      }).execute();
    }

    const result = await getDashboardOverview();

    expect(result.recent_vms).toHaveLength(5);
    expect(result.vm_summary.total_vms).toEqual(7);
    
    // Verify VMs are ordered by creation date (most recent first)
    // The last 5 VMs created should be vm-6, vm-5, vm-4, vm-3, vm-2
    expect(result.recent_vms[0].name).toEqual('vm-6');
    expect(result.recent_vms[4].name).toEqual('vm-2');
    
    for (let i = 0; i < result.recent_vms.length - 1; i++) {
      expect(result.recent_vms[i].created_at >= result.recent_vms[i + 1].created_at).toBe(true);
    }
  });
});
