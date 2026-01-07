/**
 * MQTTConfigForm Component
 * Form for MQTT broker configuration
 */

import { useState } from 'react';
import { Server, KeyRound, User, Hash, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { MQTTConfig } from '@/domain/types/entities';

interface MQTTConfigFormProps {
  initialConfig?: Partial<MQTTConfig>;
  onSubmit: (config: MQTTConfig) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  showSaveDefault?: boolean;
  className?: string;
}

const DEFAULT_CONFIG: MQTTConfig = {
  broker: '',
  port: 1883,
  username: '',
  password: '',
  client_id: '',
  use_tls: false,
};

export function MQTTConfigForm({
  initialConfig,
  onSubmit,
  onCancel,
  isSubmitting,
  showSaveDefault = true,
  className,
}: MQTTConfigFormProps) {
  const [config, setConfig] = useState<MQTTConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof MQTTConfig, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof MQTTConfig, string>> = {};

    if (!config.broker.trim()) {
      newErrors.broker = 'Broker address is required';
    }

    if (config.port < 1 || config.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Save as default if requested
      if (saveAsDefault) {
        localStorage.setItem('delicasa-mqtt-default', JSON.stringify(config));
      }
      onSubmit(config);
    }
  };

  const loadDefaults = () => {
    const saved = localStorage.getItem('delicasa-mqtt-default');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      } catch {
        // Ignore parse errors
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {/* Broker Address */}
        <div className="space-y-2">
          <Label htmlFor="mqtt-broker">Broker Address</Label>
          <div className="relative">
            <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="mqtt-broker"
              placeholder="mqtt.example.com or 192.168.1.100"
              value={config.broker}
              onChange={(e) => setConfig({ ...config, broker: e.target.value })}
              className="pl-10"
            />
          </div>
          {errors.broker && (
            <p className="text-xs text-destructive">{errors.broker}</p>
          )}
        </div>

        {/* Port */}
        <div className="space-y-2">
          <Label htmlFor="mqtt-port">Port</Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="mqtt-port"
              type="number"
              min={1}
              max={65535}
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 1883 })}
              className="pl-10"
            />
          </div>
          {errors.port && (
            <p className="text-xs text-destructive">{errors.port}</p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="mqtt-username">Username (optional)</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="mqtt-username"
              placeholder="mqtt_user"
              value={config.username || ''}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="mqtt-password">Password (optional)</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="mqtt-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={config.password || ''}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              className="pl-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>

        {/* TLS Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="mqtt-tls" className="cursor-pointer">
                Use TLS/SSL
              </Label>
              <p className="text-xs text-muted-foreground">
                Secure connection (port 8883)
              </p>
            </div>
          </div>
          <Switch
            id="mqtt-tls"
            checked={config.use_tls || false}
            onCheckedChange={(checked) =>
              setConfig({
                ...config,
                use_tls: checked,
                port: checked ? 8883 : 1883,
              })
            }
          />
        </div>

        {/* Save as Default */}
        {showSaveDefault && (
          <div className="flex items-center gap-2">
            <Switch
              id="save-default"
              checked={saveAsDefault}
              onCheckedChange={setSaveAsDefault}
            />
            <Label htmlFor="save-default" className="cursor-pointer text-sm">
              Save as default configuration
            </Label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : 'Continue'}
        </Button>
        {localStorage.getItem('delicasa-mqtt-default') && (
          <Button type="button" variant="outline" onClick={loadDefaults}>
            Load Saved
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
