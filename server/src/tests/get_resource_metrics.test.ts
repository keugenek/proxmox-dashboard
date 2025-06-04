
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { resourceMetricsTable } from '../db/schema';
import { type GetResourceMetricsInput } from '../schema';
import { getResourceMetrics } from '../handlers/get_resource_metrics';

const testInput: GetResourceMetricsInput = {
  vmid: 100,
  hours: 1
};

describe('getResourceMetrics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no metrics exist', async () => {
    const result = await getResourceMetrics(testInput);
    expect(result).toEqual([]);
  });

  it('should return metrics for specified VM within time range', async () => {
    // Create test metrics within the time range
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    await db.insert(resourceMetricsTable)
      .values({
        vmid: 100,
        cpu_usage: 85.5,
        memory_usage: 70.2,
        memory_used: 2048,
        disk_read: 12.5,
        disk_write: 8.3,
        network_in: 15.7,
        network_out: 9.2,
        recorded_at: thirtyMinutesAgo
      })
      .execute();

    const result = await getResourceMetrics(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].vmid).toEqual(100);
    expect(result[0].cpu_usage).toEqual(85.5);
    expect(result[0].memory_usage).toEqual(70.2);
    expect(result[0].memory_used).toEqual(2048);
    expect(result[0].disk_read).toEqual(12.5);
    expect(result[0].disk_write).toEqual(8.3);
    expect(result[0].network_in).toEqual(15.7);
    expect(result[0].network_out).toEqual(9.2);
    expect(result[0].recorded_at).toBeInstanceOf(Date);
  });

  it('should exclude metrics outside time range', async () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Create one metric outside range and one inside
    await db.insert(resourceMetricsTable)
      .values([
        {
          vmid: 100,
          cpu_usage: 50.0,
          memory_usage: 40.0,
          memory_used: 1024,
          recorded_at: twoHoursAgo // Outside 1-hour range
        },
        {
          vmid: 100,
          cpu_usage: 75.0,
          memory_usage: 60.0,
          memory_used: 1536,
          recorded_at: thirtyMinutesAgo // Inside 1-hour range
        }
      ])
      .execute();

    const result = await getResourceMetrics(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].cpu_usage).toEqual(75.0);
    expect(result[0].recorded_at).toEqual(thirtyMinutesAgo);
  });

  it('should exclude metrics for different VM', async () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Create metrics for different VMs
    await db.insert(resourceMetricsTable)
      .values([
        {
          vmid: 100,
          cpu_usage: 80.0,
          memory_usage: 65.0,
          memory_used: 2048,
          recorded_at: thirtyMinutesAgo
        },
        {
          vmid: 200, // Different VM
          cpu_usage: 90.0,
          memory_usage: 75.0,
          memory_used: 3072,
          recorded_at: thirtyMinutesAgo
        }
      ])
      .execute();

    const result = await getResourceMetrics(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].vmid).toEqual(100);
    expect(result[0].cpu_usage).toEqual(80.0);
  });

  it('should return metrics ordered by recorded_at descending', async () => {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60 * 1000);

    // Insert metrics in random order
    await db.insert(resourceMetricsTable)
      .values([
        {
          vmid: 100,
          cpu_usage: 60.0,
          memory_usage: 50.0,
          memory_used: 1536,
          recorded_at: thirtyMinutesAgo
        },
        {
          vmid: 100,
          cpu_usage: 80.0,
          memory_usage: 70.0,
          memory_used: 2048,
          recorded_at: fifteenMinutesAgo
        },
        {
          vmid: 100,
          cpu_usage: 40.0,
          memory_usage: 30.0,
          memory_used: 1024,
          recorded_at: fortyFiveMinutesAgo
        }
      ])
      .execute();

    const result = await getResourceMetrics(testInput);

    expect(result).toHaveLength(3);
    // Should be ordered by recorded_at descending (most recent first)
    expect(result[0].recorded_at).toEqual(fifteenMinutesAgo);
    expect(result[1].recorded_at).toEqual(thirtyMinutesAgo);
    expect(result[2].recorded_at).toEqual(fortyFiveMinutesAgo);
  });

  it('should handle different hour ranges correctly', async () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000); // Within 1 hour
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // Outside 1 hour but within 4 hours

    // Create metrics at different times
    await db.insert(resourceMetricsTable)
      .values([
        {
          vmid: 100,
          cpu_usage: 70.0,
          memory_usage: 60.0,
          memory_used: 1536,
          recorded_at: thirtyMinutesAgo
        },
        {
          vmid: 100,
          cpu_usage: 50.0,
          memory_usage: 40.0,
          memory_used: 1024,
          recorded_at: twoHoursAgo
        }
      ])
      .execute();

    // Test with 1 hour range
    const result1Hour = await getResourceMetrics({ vmid: 100, hours: 1 });
    expect(result1Hour).toHaveLength(1);
    expect(result1Hour[0].cpu_usage).toEqual(70.0);

    // Test with 4 hour range
    const result4Hours = await getResourceMetrics({ vmid: 100, hours: 4 });
    expect(result4Hours).toHaveLength(2);
  });
});
