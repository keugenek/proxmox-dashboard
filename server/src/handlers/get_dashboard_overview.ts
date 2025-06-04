
import { db } from '../db';
import { hostStatusTable, vmsTable } from '../db/schema';
import { type DashboardOverview } from '../schema';
import { eq, desc, count, and } from 'drizzle-orm';

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  try {
    // Get the latest host status
    const hostResults = await db.select()
      .from(hostStatusTable)
      .orderBy(desc(hostStatusTable.updated_at))
      .limit(1)
      .execute();

    if (hostResults.length === 0) {
      throw new Error('No host status data available');
    }

    const host = hostResults[0];

    // Get VM summary statistics
    const vmSummaryResults = await db.select({
      total_vms: count(),
      type: vmsTable.type,
      status: vmsTable.status
    })
      .from(vmsTable)
      .groupBy(vmsTable.type, vmsTable.status)
      .execute();

    // Calculate summary stats
    let total_vms = 0;
    let running_vms = 0;
    let stopped_vms = 0;
    let total_containers = 0;
    let running_containers = 0;
    let stopped_containers = 0;

    vmSummaryResults.forEach(result => {
      const count_value = Number(result.total_vms);
      
      if (result.type === 'qemu') {
        total_vms += count_value;
        if (result.status === 'running') {
          running_vms += count_value;
        } else if (result.status === 'stopped') {
          stopped_vms += count_value;
        }
      } else if (result.type === 'lxc') {
        total_containers += count_value;
        if (result.status === 'running') {
          running_containers += count_value;
        } else if (result.status === 'stopped') {
          stopped_containers += count_value;
        }
      }
    });

    // Get recent VMs (last 5 created)
    const recentVmResults = await db.select()
      .from(vmsTable)
      .orderBy(desc(vmsTable.created_at))
      .limit(5)
      .execute();

    // Convert numeric fields for recent VMs
    const recent_vms = recentVmResults.map(vm => ({
      ...vm,
      cpu_usage: vm.cpu_usage !== null ? parseFloat(vm.cpu_usage.toString()) : null,
      memory_usage: vm.memory_usage !== null ? parseFloat(vm.memory_usage.toString()) : null
    }));

    // Convert numeric fields for host
    const hostWithNumbers = {
      ...host,
      cpu_usage: parseFloat(host.cpu_usage.toString()),
      memory_usage: parseFloat(host.memory_usage.toString())
    };

    return {
      host: hostWithNumbers,
      vm_summary: {
        total_vms,
        running_vms,
        stopped_vms,
        total_containers,
        running_containers,
        stopped_containers
      },
      recent_vms
    };
  } catch (error) {
    console.error('Dashboard overview fetch failed:', error);
    throw error;
  }
};
