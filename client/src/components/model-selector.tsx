import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ModelConfig } from "@shared/schema";
import { defaultModelConfigs } from "@/lib/model-config";

interface ModelSelectorProps {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select
          value={value.provider}
          onValueChange={(provider) => 
            onChange({ ...value, provider: provider as ModelConfig["provider"] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="google">Google</SelectItem>
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
            {defaultModelConfigs
              .filter((config) => config.provider === value.provider)
              .map((config) => (
                <SelectItem key={config.model} value={config.model}>
                  {config.model}
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
