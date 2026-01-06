import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WiFiSection, DeviceSection, SystemStatus } from "@/components/dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { Home, Wifi, Bluetooth, Settings } from "lucide-react";

function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
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
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="overview" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="wifi" className="gap-2">
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">WiFi</span>
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-2">
              <Bluetooth className="h-4 w-4" />
              <span className="hidden sm:inline">Devices</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <SystemStatus />
              <WiFiSection />
            </div>
            <DeviceSection />
          </TabsContent>

          {/* WiFi Tab */}
          <TabsContent value="wifi">
            <WiFiSection />
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices">
            <DeviceSection />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container flex items-center justify-between px-4 text-sm text-muted-foreground">
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
