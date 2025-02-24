import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type ModelConfig } from "@shared/schema";
import { MODEL_CONFIGS, defaultModelConfigs } from "@/lib/model-config";
import { useState } from "react";

interface ModelSelectorProps {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [showAllModels, setShowAllModels] = useState(false);
  
  // Include all providers from MODEL_CONFIGS
  const availableProviders = Object.keys(MODEL_CONFIGS);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Label>Provider</Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="show-all-models"
            checked={showAllModels}
            onCheckedChange={setShowAllModels}
          />
          <Label htmlFor="show-all-models" className="text-xs cursor-pointer">
            Show All Models
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Select
          value={value.provider}
          onValueChange={(provider) => 
            onChange({ 
              ...value, 
              provider: provider as ModelConfig["provider"],
              // Set default model when provider changes
              model: MODEL_CONFIGS[provider]?.models[0]?.id || value.model
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {availableProviders.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {MODEL_CONFIGS[provider].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select
          value={value.model}
          onValueChange={(model) => onChange({ ...value, model })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_CONFIGS[value.provider]?.models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Temperature</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={value.temperature}
            onChange={(e) =>
              onChange({ ...value, temperature: parseFloat(e.target.value) })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Max Tokens</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={value.maxTokens}
            onChange={(e) =>
              onChange({ ...value, maxTokens: parseInt(e.target.value) })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Top P</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={value.topP}
            onChange={(e) => onChange({ ...value, topP: parseFloat(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
