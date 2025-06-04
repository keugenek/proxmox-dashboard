
import { db } from '../db';
import { hostStatusTable } from '../db/schema';
import { type HostStatus } from '../schema';
import { desc } from 'drizzle-orm';

export const getHostStatus = async (): Promise<HostStatus> => {
  try {
    // Get the most recent host status record
    const results = await db.select()
      .from(hostStatusTable)
      .orderBy(desc(hostStatusTable.updated_at))
      .limit(1)
      .execute();

    if (results.length === 0) {
      throw new Error('No host status data available');
    }

    const hostStatus = results[0];
    
    // Convert real fields back to numbers (cpu_usage, memory_usage are real type)
    return {
      ...hostStatus,
      cpu_usage: Number(hostStatus.cpu_usage),
      memory_usage: Number(hostStatus.memory_usage)
    };
  } catch (error) {
    console.error('Get host status failed:', error);
    throw error;
  }
};
