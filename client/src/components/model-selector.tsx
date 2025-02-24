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
import { useState, useEffect } from "react";

interface ModelSelectorProps {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  // Include all providers from MODEL_CONFIGS
  const availableProviders = Object.keys(MODEL_CONFIGS);
  
  // Force update when provider changes to ensure model is set correctly
  useEffect(() => {
    // If there's no model selected for the current provider, set the first one
    if (!value.model || !MODEL_CONFIGS[value.provider]?.models.some(m => m.id === value.model)) {
      const firstModel = MODEL_CONFIGS[value.provider]?.models[0]?.id || "";
      
      onChange({
        ...value,
        model: firstModel
      });
    }
  }, [value.provider]);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <Label>Provider</Label>
      </div>

      <div className="space-y-2">
        <Select
          value={value.provider}
          onValueChange={(provider) => {
            const typedProvider = provider as "openai" | "anthropic" | "google" | "groq";
            const firstModel = MODEL_CONFIGS[typedProvider]?.models[0]?.id || "";
            
            onChange({ 
              ...value, 
              provider: typedProvider,
              model: firstModel
            });
          }}
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
