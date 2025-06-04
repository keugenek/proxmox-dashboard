
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Server, Monitor, Activity, Play, Square, RotateCw, Pause } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { DashboardOverview, VM, ResourceMetrics } from '../../server/src/schema';

function App() {
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [vms, setVms] = useState<VM[]>([]);
  const [selectedVm, setSelectedVm] = useState<VM | null>(null);
  const [vmMetrics, setVmMetrics] = useState<ResourceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await trpc.getDashboardOverview.query();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    }
  }, []);

  const loadVMs = useCallback(async () => {
    try {
      const vmData = await trpc.getVMs.query();
      setVms(vmData);
      setError(null);
    } catch (err) {
      setError('Failed to load VMs');
      console.error('VMs error:', err);
    }
  }, []);

  const loadVMMetrics = useCallback(async (vmid: number) => {
    try {
      const metrics = await trpc.getResourceMetrics.query({ vmid, hours: 1 });
      setVmMetrics(metrics);
    } catch (err) {
      console.error('Metrics error:', err);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadVMs();
  }, [loadDashboard, loadVMs]);

  useEffect(() => {
    if (selectedVm) {
      loadVMMetrics(selectedVm.vmid);
    }
  }, [selectedVm, loadVMMetrics]);

  const handleVMAction = async (vmid: number, action: 'start' | 'stop' | 'reboot' | 'pause' | 'resume') => {
    setIsLoading(true);
    try {
      await trpc.performVMAction.mutate({ vmid, action });
      await loadVMs();
      await loadDashboard();
      setError(null);
    } catch (err) {
      setError(`Failed to ${action} VM`);
      console.error('VM action error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      case 'suspended': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4" />;
      case 'stopped': return <Square className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatUptime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Server className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Proxmox VE Dashboard</h1>
              <p className="text-gray-600">Virtual Machine & Container Management</p>
            </div>
          </div>
          <Button 
            onClick={() => { loadDashboard(); loadVMs(); }}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RotateCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="vms">Virtual Machines</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {dashboardData && (
              <>
                {/* Host Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Server className="h-5 w-5 text-orange-500" />
                      <span>Host Status: {dashboardData.host.hostname}</span>
                    </CardTitle>
                    <CardDescription>
                      Uptime: {formatUptime(dashboardData.host.uptime)} | 
                      Load: {dashboardData.host.load_average}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>CPU Usage</span>
                          <span>{dashboardData.host.cpu_usage.toFixed(1)}%</span>
                        </div>
                        <Progress value={dashboardData.host.cpu_usage} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Memory Usage</span>
                          <span>
                            {formatBytes(dashboardData.host.used_memory)} / {formatBytes(dashboardData.host.total_memory)} 
                            ({dashboardData.host.memory_usage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={dashboardData.host.memory_usage} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* VM Summary */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboardData.vm_summary.total_vms}
                      </div>
                      <p className="text-sm text-gray-600">Total VMs</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardData.vm_summary.running_vms}
                      </div>
                      <p className="text-sm text-gray-600">Running VMs</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">
                        {dashboardData.vm_summary.stopped_vms}
                      </div>
                      <p className="text-sm text-gray-600">Stopped VMs</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-purple-600">
                        {dashboardData.vm_summary.total_containers}
                      </div>
                      <p className="text-sm text-gray-600">Total LXC</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardData.vm_summary.running_containers}
                      </div>
                      <p className="text-sm text-gray-600">Running LXC</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">
                        {dashboardData.vm_summary.stopped_containers}
                      </div>
                      <p className="text-sm text-gray-600">Stopped LXC</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent VMs */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Virtual Machines</CardTitle>
                    <CardDescription>Recently created or modified VMs and containers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardData.recent_vms.map((vm: VM) => (
                        <div key={vm.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className={`${getStatusColor(vm.status)} text-white`}>
                              {getStatusIcon(vm.status)}
                              <span className="ml-1">{vm.status}</span>
                            </Badge>
                            <div>
                              <p className="font-medium">{vm.name}</p>
                              <p className="text-sm text-gray-600">
                                ID: {vm.vmid} | Type: {vm.type.toUpperCase()} | 
                                {vm.cpu_cores} cores, {formatBytes(vm.memory_allocated)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {vm.created_at.toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* VMs Tab */}
          <TabsContent value="vms" className="space-y-6">
            <div className="grid gap-4">
              {vms.map((vm: VM) => (
                <Card key={vm.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className={`${getStatusColor(vm.status)} text-white`}>
                          {getStatusIcon(vm.status)}
                          <span className="ml-1">{vm.status}</span>
                        </Badge>
                        <div>
                          <h3 className="text-lg font-semibold">{vm.name}</h3>
                          <p className="text-sm text-gray-600">
                            ID: {vm.vmid} | Type: {vm.type.toUpperCase()} | 
                            Uptime: {formatUptime(vm.uptime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {vm.status === 'stopped' && (
                          <Button
                            size="sm"
                            onClick={() => handleVMAction(vm.vmid, 'start')}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {vm.status === 'running' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVMAction(vm.vmid, 'reboot')}
                              disabled={isLoading}
                            >
                              <RotateCw className="h-4 w-4 mr-1" />
                              Reboot
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVMAction(vm.vmid, 'stop')}
                              disabled={isLoading}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              Stop
                            </Button>
                          </>
                        )}
                        {vm.status === 'paused' && (
                          <Button
                            size="sm"
                            onClick={() => handleVMAction(vm.vmid, 'resume')}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">CPU Cores</p>
                        <p className="text-sm text-gray-600">{vm.cpu_cores}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Memory</p>
                        <p className="text-sm text-gray-600">
                          {formatBytes(vm.memory_allocated)}
                          {vm.memory_used && ` (${formatBytes(vm.memory_used)} used)`}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Disk Size</p>
                        <p className="text-sm text-gray-600">{vm.disk_size} GB</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Created</p>
                        <p className="text-sm text-gray-600">{vm.created_at.toLocaleDateString()}</p>
                      </div>
                    </div>

                    {vm.status === 'running' && vm.cpu_usage !== null && vm.memory_usage !== null && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>CPU Usage</span>
                            <span>{vm.cpu_usage.toFixed(1)}%</span>
                          </div>
                          <Progress value={vm.cpu_usage} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Memory Usage</span>
                            <span>{vm.memory_usage.toFixed(1)}%</span>
                          </div>
                          <Progress value={vm.memory_usage} className="h-2" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <span>Resource Monitoring</span>
                </CardTitle>
                <CardDescription>Select a running VM to view detailed metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {vms.filter((vm: VM) => vm.status === 'running').map((vm: VM) => (
                      <Button
                        key={vm.id}
                        variant={selectedVm?.id === vm.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedVm(vm)}
                      >
                        {vm.name} (ID: {vm.vmid})
                      </Button>
                    ))}
                  </div>

                  {selectedVm && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Metrics for {selectedVm.name} (ID: {selectedVm.vmid})
                        </h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadVMMetrics(selectedVm.vmid)}
                        >
                          <RotateCw className="h-4 w-4 mr-1" />
                          Refresh
                        </Button>
                      </div>

                      {vmMetrics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {vmMetrics.slice(-10).map((metric: ResourceMetrics, index: number) => (
                            <Card key={metric.id} className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">
                                    {metric.recorded_at.toLocaleTimeString()}
                                  </span>
                                  <Badge variant="outline">{index + 1}</Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>CPU Usage</span>
                                    <span>{metric.cpu_usage.toFixed(1)}%</span>
                                  </div>
                                  <Progress value={metric.cpu_usage} className="h-2" />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Memory Usage</span>
                                    <span>{metric.memory_usage.toFixed(1)}%</span>
                                  </div>
                                  <Progress value={metric.memory_usage} className="h-2" />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                  <div>Memory: {formatBytes(metric.memory_used)}</div>
                                  <div>Disk R: {metric.disk_read.toFixed(2)} MB/s</div>
                                  <div>Disk W: {metric.disk_write.toFixed(2)} MB/s</div>
                                  <div>Net: ↓{metric.network_in.toFixed(2)} ↑{metric.network_out.toFixed(2)} MB/s</div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No metrics data available for this VM
                        </div>
                      )}
                    </div>
                  )}

                  {vms.filter((vm: VM) => vm.status === 'running').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No running VMs available for monitoring
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
