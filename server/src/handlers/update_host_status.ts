
import { db } from '../db';
import { hostStatusTable } from '../db/schema';
import { type HostStatus } from '../schema';
import { desc } from 'drizzle-orm';

export const updateHostStatus = async (): Promise<HostStatus> => {
  try {
    // Simulate getting current host metrics (in real implementation, this would come from Proxmox API)
    const currentTime = new Date();
    const mockHostData = {
      hostname: 'proxmox-server',
      uptime: Math.floor(Math.random() * 1000000), // Random uptime in seconds
      cpu_usage: Math.random() * 100, // Random CPU usage percentage
      memory_usage: Math.random() * 100, // Random memory usage percentage
      total_memory: 32768, // 32GB in MB
      used_memory: Math.floor(Math.random() * 32768), // Random used memory
      load_average: `${(Math.random() * 2).toFixed(2)} ${(Math.random() * 2).toFixed(2)} ${(Math.random() * 2).toFixed(2)}`,
      updated_at: currentTime
    };

    // Insert new host status record
    const result = await db.insert(hostStatusTable)
      .values({
        hostname: mockHostData.hostname,
        uptime: mockHostData.uptime,
        cpu_usage: mockHostData.cpu_usage,
        memory_usage: mockHostData.memory_usage,
        total_memory: mockHostData.total_memory,
        used_memory: mockHostData.used_memory,
        load_average: mockHostData.load_average
      })
      .returning()
      .execute();

    const hostStatus = result[0];
    return {
      ...hostStatus,
      cpu_usage: hostStatus.cpu_usage || 0, // Handle potential null values
      memory_usage: hostStatus.memory_usage || 0
    };
  } catch (error) {
    console.error('Host status update failed:', error);
    throw error;
  }
};
