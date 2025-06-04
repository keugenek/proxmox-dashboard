
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hostStatusTable } from '../db/schema';
import { updateHostStatus } from '../handlers/update_host_status';
import { desc } from 'drizzle-orm';

describe('updateHostStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new host status record', async () => {
    const result = await updateHostStatus();

    // Basic field validation
    expect(result.hostname).toBe('proxmox-server');
    expect(typeof result.uptime).toBe('number');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof result.cpu_usage).toBe('number');
    expect(result.cpu_usage).toBeGreaterThanOrEqual(0);
    expect(result.cpu_usage).toBeLessThanOrEqual(100);
    expect(typeof result.memory_usage).toBe('number');
    expect(result.memory_usage).toBeGreaterThanOrEqual(0);
    expect(result.memory_usage).toBeLessThanOrEqual(100);
    expect(result.total_memory).toBe(32768);
    expect(typeof result.used_memory).toBe('number');
    expect(result.used_memory).toBeGreaterThanOrEqual(0);
    expect(result.used_memory).toBeLessThanOrEqual(32768);
    expect(result.load_average).toMatch(/^\d+\.\d{2} \d+\.\d{2} \d+\.\d{2}$/);
    expect(result.id).toBeDefined();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save host status to database', async () => {
    const result = await updateHostStatus();

    // Query to verify data was saved
    const hostStatuses = await db.select()
      .from(hostStatusTable)
      .orderBy(desc(hostStatusTable.id))
      .limit(1)
      .execute();

    expect(hostStatuses).toHaveLength(1);
    const savedStatus = hostStatuses[0];
    
    expect(savedStatus.id).toBe(result.id);
    expect(savedStatus.hostname).toBe('proxmox-server');
    expect(savedStatus.uptime).toBe(result.uptime);
    expect(savedStatus.cpu_usage).toBe(result.cpu_usage);
    expect(savedStatus.memory_usage).toBe(result.memory_usage);
    expect(savedStatus.total_memory).toBe(32768);
    expect(savedStatus.used_memory).toBe(result.used_memory);
    expect(savedStatus.load_average).toBe(result.load_average);
    expect(savedStatus.updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple host status records', async () => {
    // Create first record
    const result1 = await updateHostStatus();
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Create second record
    const result2 = await updateHostStatus();

    // Verify both records exist and are different
    expect(result1.id).not.toBe(result2.id);
    expect(result1.updated_at.getTime()).not.toBe(result2.updated_at.getTime());

    // Query all records
    const allStatuses = await db.select()
      .from(hostStatusTable)
      .orderBy(desc(hostStatusTable.id))
      .execute();

    expect(allStatuses).toHaveLength(2);
    expect(allStatuses[0].id).toBe(result2.id); // Most recent first
    expect(allStatuses[1].id).toBe(result1.id);
  });

  it('should handle realistic host metrics ranges', async () => {
    // Run multiple times to test randomization
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await updateHostStatus());
    }

    results.forEach(result => {
      // CPU usage should be realistic percentage
      expect(result.cpu_usage).toBeGreaterThanOrEqual(0);
      expect(result.cpu_usage).toBeLessThanOrEqual(100);
      
      // Memory usage should be realistic percentage
      expect(result.memory_usage).toBeGreaterThanOrEqual(0);
      expect(result.memory_usage).toBeLessThanOrEqual(100);
      
      // Used memory should not exceed total memory
      expect(result.used_memory).toBeLessThanOrEqual(result.total_memory);
      
      // Uptime should be positive
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      
      // Load average should be properly formatted
      expect(result.load_average).toMatch(/^\d+\.\d{2} \d+\.\d{2} \d+\.\d{2}$/);
    });
  });
});
