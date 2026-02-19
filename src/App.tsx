import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import {
  Home,
  Wifi,
  Bluetooth,
  Settings,
  Activity,
  Camera,
  DoorOpen,
  FileText,
  Network,
  Radio,
  Stethoscope,
  Package,
  ClipboardList,
  Eye,
} from "lucide-react";

// Presentation layer components (hexagonal architecture)
import { SystemStatus } from "@/presentation/components/system/SystemStatus";
import { WiFiSection } from "@/presentation/components/wifi/WiFiSection";
import { DeviceSection } from "@/presentation/components/devices/DeviceSection";
import { CameraSection } from "@/presentation/components/cameras/CameraSection";
import { DoorSection } from "@/presentation/components/door/DoorSection";
import { LogSection } from "@/presentation/components/logs/LogSection";
import { ConfigSection } from "@/presentation/components/config/ConfigSection";
import { NetworkSection } from "@/presentation/components/network/NetworkSection";
import { OfflineIndicator } from "@/presentation/components/offline/OfflineIndicator";
import { BatchProvisioningSection } from "@/presentation/components/provisioning/BatchProvisioningSection";
import { DiagnosticsSection } from "@/presentation/components/diagnostics/DiagnosticsSection";
import { ContainerSection } from "@/presentation/components/containers/ContainerSection";
import { InventorySection } from "@/presentation/components/inventory/InventorySection";
import { OperationsView } from "@/presentation/components/operations/OperationsView";
import { ContainerPicker } from "@/presentation/components/containers/ContainerPicker";
import { useBatchProvisioningEnabled } from "@/application/stores/features";
// 030-dashboard-recovery: Error boundary to catch uncaught exceptions
import { ErrorBoundary } from "@/presentation/components/common/ErrorBoundary";

function Dashboard() {
  const isBatchProvisioningEnabled = useBatchProvisioningEnabled();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">DeliCasa IoT Setup</h1>
              <p className="text-xs text-muted-foreground">
                Configure your smart container system
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ContainerPicker className="hidden sm:block" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Offline Indicator */}
      <OfflineIndicator className="container mx-auto mt-2 px-4" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="overview" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2" data-testid="tab-operations">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Operations</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="wifi" className="gap-2">
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">WiFi</span>
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-2">
              <Bluetooth className="h-4 w-4" />
              <span className="hidden sm:inline">Devices</span>
            </TabsTrigger>
            {isBatchProvisioningEnabled && (
              <TabsTrigger value="provisioning" className="gap-2">
                <Radio className="h-4 w-4" />
                <span className="hidden sm:inline">Provisioning</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="cameras" className="gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Cameras</span>
            </TabsTrigger>
            <TabsTrigger value="containers" className="gap-2" data-testid="tab-containers">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Containers</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2" data-testid="tab-inventory">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="door" className="gap-2">
              <DoorOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Door</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Network</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-2" data-testid="tab-diagnostics">
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">DEV</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          <TabsContent value="overview" className="space-y-6">
            <ErrorBoundary>
              <div className="grid gap-6 lg:grid-cols-2">
                <SystemStatus />
                <WiFiSection />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <CameraSection />
                <DoorSection />
              </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Operations Tab - 057-live-ops-viewer */}
          <TabsContent value="operations">
            <ErrorBoundary>
              <OperationsView />
            </ErrorBoundary>
          </TabsContent>

          {/* System Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          <TabsContent value="system">
            <ErrorBoundary>
              <SystemStatus />
            </ErrorBoundary>
          </TabsContent>

          {/* WiFi Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          <TabsContent value="wifi">
            <ErrorBoundary>
              <WiFiSection />
            </ErrorBoundary>
          </TabsContent>

          {/* Devices Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          <TabsContent value="devices">
            <ErrorBoundary>
              <DeviceSection />
            </ErrorBoundary>
          </TabsContent>

          {/* Provisioning Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          {isBatchProvisioningEnabled && (
            <TabsContent value="provisioning">
              <ErrorBoundary>
                <BatchProvisioningSection />
              </ErrorBoundary>
            </TabsContent>
          )}

          {/* Cameras Tab - 046-opaque-container-identity: scoped to active container */}
          <TabsContent value="cameras">
            <ErrorBoundary>
              <CameraSection scoped />
            </ErrorBoundary>
          </TabsContent>

          {/* Containers Tab - 043-container-management */}
          <TabsContent value="containers">
            <ErrorBoundary>
              <ContainerSection />
            </ErrorBoundary>
          </TabsContent>

          {/* Inventory Tab - 047-inventory-delta-viewer */}
          <TabsContent value="inventory">
            <ErrorBoundary>
              <InventorySection />
            </ErrorBoundary>
          </TabsContent>

          {/* Door Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          <TabsContent value="door">
            <ErrorBoundary>
              <DoorSection />
            </ErrorBoundary>
          </TabsContent>

          {/* Logs Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          <TabsContent value="logs">
            <ErrorBoundary>
              <LogSection />
            </ErrorBoundary>
          </TabsContent>

          {/* Network Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          <TabsContent value="network">
            <ErrorBoundary>
              <NetworkSection />
            </ErrorBoundary>
          </TabsContent>

          {/* Config Tab - 030-dashboard-recovery: wrapped with ErrorBoundary */}
          <TabsContent value="config">
            <ErrorBoundary>
              <ConfigSection />
            </ErrorBoundary>
          </TabsContent>

          {/* DEV Diagnostics Tab - 038-dev-observability-panels */}
          <TabsContent value="diagnostics">
            <ErrorBoundary>
              <DiagnosticsSection />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
          <p>DeliCasa PiOrchestrator</p>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="delicasa-pi-theme">
      <Dashboard />
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
