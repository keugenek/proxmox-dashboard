
import { db } from '../db';
import { resourceMetricsTable } from '../db/schema';
import { type GetResourceMetricsInput, type ResourceMetrics } from '../schema';
import { eq, gte, desc, and } from 'drizzle-orm';

export const getResourceMetrics = async (input: GetResourceMetricsInput): Promise<ResourceMetrics[]> => {
  try {
    // Calculate the time threshold for filtering
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - input.hours);

    // Query resource metrics for the specified VM within the time range
    const results = await db.select()
      .from(resourceMetricsTable)
      .where(
        and(
          eq(resourceMetricsTable.vmid, input.vmid),
          gte(resourceMetricsTable.recorded_at, hoursAgo)
        )
      )
      .orderBy(desc(resourceMetricsTable.recorded_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map((result: any) => ({
      ...result,
      cpu_usage: parseFloat(result.cpu_usage.toString()),
      memory_usage: parseFloat(result.memory_usage.toString()),
      disk_read: parseFloat(result.disk_read.toString()),
      disk_write: parseFloat(result.disk_write.toString()),
      network_in: parseFloat(result.network_in.toString()),
      network_out: parseFloat(result.network_out.toString())
    }));
  } catch (error) {
    console.error('Failed to get resource metrics:', error);
    throw error;
  }
};
