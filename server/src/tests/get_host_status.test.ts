
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hostStatusTable } from '../db/schema';
import { getHostStatus } from '../handlers/get_host_status';

describe('getHostStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return the most recent host status', async () => {
    // Insert test host status data
    await db.insert(hostStatusTable)
      .values({
        hostname: 'proxmox-node1',
        uptime: 86400, // 1 day in seconds
        cpu_usage: 45.5,
        memory_usage: 67.8,
        total_memory: 32768, // 32 GB in MB
        used_memory: 22204, // ~67.8% of 32GB
        load_average: '1.23 0.98 0.76'
      })
      .execute();

    const result = await getHostStatus();

    // Verify all fields are present and correct
    expect(result.hostname).toEqual('proxmox-node1');
    expect(result.uptime).toEqual(86400);
    expect(result.cpu_usage).toEqual(45.5);
    expect(result.memory_usage).toEqual(67.8);
    expect(result.total_memory).toEqual(32768);
    expect(result.used_memory).toEqual(22204);
    expect(result.load_average).toEqual('1.23 0.98 0.76');
    expect(result.id).toBeDefined();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should return the most recent status when multiple records exist', async () => {
    // Insert older record first
    await db.insert(hostStatusTable)
      .values({
        hostname: 'proxmox-node1',
        uptime: 86400,
        cpu_usage: 30.0,
        memory_usage: 50.0,
        total_memory: 16384,
        used_memory: 8192,
        load_average: '0.50 0.40 0.30'
      })
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Insert newer record
    await db.insert(hostStatusTable)
      .values({
        hostname: 'proxmox-node2',
        uptime: 172800, // 2 days
        cpu_usage: 75.2,
        memory_usage: 82.1,
        total_memory: 65536, // 64 GB
        used_memory: 53805,
        load_average: '2.45 2.12 1.89'
      })
      .execute();

    const result = await getHostStatus();

    // Should return the newer record (proxmox-node2)
    expect(result.hostname).toEqual('proxmox-node2');
    expect(result.uptime).toEqual(172800);
    expect(result.cpu_usage).toEqual(75.2);
    expect(result.memory_usage).toEqual(82.1);
    expect(result.total_memory).toEqual(65536);
    expect(result.used_memory).toEqual(53805);
    expect(result.load_average).toEqual('2.45 2.12 1.89');
  });

  it('should throw error when no host status data exists', async () => {
    // No data inserted - table is empty
    await expect(getHostStatus()).rejects.toThrow(/no host status data available/i);
  });

  it('should handle numeric field types correctly', async () => {
    // Insert data with specific numeric values to test type conversion
    await db.insert(hostStatusTable)
      .values({
        hostname: 'test-host',
        uptime: 12345,
        cpu_usage: 99.99,
        memory_usage: 0.01,
        total_memory: 1024,
        used_memory: 1,
        load_average: '0.00 0.00 0.00'
      })
      .execute();

    const result = await getHostStatus();

    // Verify numeric types are correct
    expect(typeof result.cpu_usage).toBe('number');
    expect(typeof result.memory_usage).toBe('number');
    expect(typeof result.uptime).toBe('number');
    expect(typeof result.total_memory).toBe('number');
    expect(typeof result.used_memory).toBe('number');
    
    // Verify exact values
    expect(result.cpu_usage).toEqual(99.99);
    expect(result.memory_usage).toEqual(0.01);
  });
});
