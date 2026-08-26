import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Lock } from "lucide-react";

interface ConfigState {
  appEnv: string;
  mockPaymentMode: boolean;
  dpoConfigured: boolean;
  dpoPaymentUrl: string;
  adminEmail: string;
}

export const DpoConfigBanner: React.FC = () => {
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !config) return null;

  if (config.mockPaymentMode) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Simulated Payment Mode Active (MOCK_PAYMENT_MODE=true)</strong>: DPO checkout transactions will be instantly simulated for testing without real gateway calls.
          </span>
        </div>
      </div>
    );
  }

  if (!config.dpoConfigured) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900">
        <div className="max-w-7xl mx-auto flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold text-amber-900">DPO Sandbox Configuration Required: </span>
            <span className="text-amber-800">
              `DPO_COMPANY_TOKEN` is unconfigured. Set a valid token to enable real DPO Sandbox checkout.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // When configured, the slim status bar inside Header cleanly presents status without visual clutter
  return null;
};
