import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Info } from 'lucide-react';
import { useFlowStore } from '@/store/flowstore';
import { MetaPromptNodeData } from '@/Types/flowTypes';
import { ModelSelector } from '@/components/model-selector';
import { generateVariations } from '@/lib/ai-providers';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Meta Prompt Node component
const MetaPromptNode: React.FC<NodeProps<MetaPromptNodeData>> = ({ id, data }) => {
  const [generatedPrompt, setGeneratedPrompt] = useState(data.metaPrompt?.generatedPrompt || '');
  const [modelConfig, setModelConfig] = useState(data.modelConfig);
  const [error, setError] = useState<string | null>(null);
  const { updateNodeData } = useFlowStore();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Update local state when node data changes
  useEffect(() => {
    if (data.metaPrompt?.generatedPrompt) {
      setGeneratedPrompt(data.metaPrompt.generatedPrompt);
    }
    
    if (data.modelConfig !== modelConfig) {
      setModelConfig(data.modelConfig);
    }
  }, [data.metaPrompt?.generatedPrompt, data.modelConfig, modelConfig]);

  // Handle generate variations
  const handleGenerateVariations = async () => {
    if (!data.metaPrompt) {
      setError("No meta prompt to generate variations from");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Update variations node to indicate generation is in progress
      const variationsNode = useFlowStore.getState().getNodeByType('variationsNode');
      if (variationsNode) {
        console.log("📝 MetaPromptNode: Setting variations node to generating state");
        updateNodeData(variationsNode.id, { 
          isGenerating: true,
          // Make sure to pass the meta prompt data to the variations node
          metaPrompt: data.metaPrompt,
          modelConfig: data.modelConfig || data.metaPrompt.modelConfig
        });
      }

      // Generate variations
      console.log("🔄 MetaPromptNode: Calling generateVariations with model config:", data.modelConfig || data.metaPrompt.modelConfig);
      const variations = await generateVariations(
        data.metaPrompt.generatedPrompt,
        data.modelConfig || data.metaPrompt.modelConfig
      );
      console.log("✅ MetaPromptNode: Generated variations:", variations.length);

      // Create variation objects
      const promptVariations = variations.map((content, index) => ({
        id: index,
        metaPromptId: data.metaPrompt?.id || 0,
        content,
        modelConfig: data.modelConfig || data.metaPrompt.modelConfig,
      }));

      // Update variations node with generated content
      if (variationsNode) {
        console.log("📝 MetaPromptNode: Updating variations node with result");
        updateNodeData(variationsNode.id, {
          metaPrompt: data.metaPrompt,
          variations: promptVariations,
          modelConfig: data.modelConfig || data.metaPrompt.modelConfig,
          isGenerating: false,
        });
      }

      toast({
        title: 'Success',
        description: 'Variations generated successfully',
      });
    } catch (error) {
      // Set error state
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during generation';
      setError(errorMessage);
      
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Reset variations node generation state
      const variationsNode = useFlowStore.getState().getNodeByType('variationsNode');
      if (variationsNode) {
        updateNodeData(variationsNode.id, { isGenerating: false });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    copyToClipboard(generatedPrompt);
    toast({
      title: 'Copied',
      description: 'Meta prompt copied to clipboard',
    });
  };

  // Handle text update
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedPrompt(e.target.value);
    setError(null);
    
    // Update node data with edited meta prompt
    if (data.metaPrompt) {
      updateNodeData(id, {
        metaPrompt: {
          ...data.metaPrompt,
          generatedPrompt: e.target.value
        }
      });
    }
  };

  // Estimated token count (rough approx)
  const tokenCount = Math.ceil(generatedPrompt.length / 4);

  return (
    <Card className="w-96 shadow-md">
      <CardHeader className="bg-primary/10 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          Meta Prompt
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  This is the detailed system prompt generated from your base prompt. You can edit it before generating variations.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        {generatedPrompt && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {isGenerating ? (
          <div className="flex flex-col justify-center items-center h-40 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Generating meta prompt...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {data.metaPrompt ? (
              <>
                <div className="space-y-2">
                  <Label>Generated Meta Prompt</Label>
                  <Textarea
                    value={generatedPrompt}
                    onChange={handleTextChange}
                    className={`min-h-40 font-mono text-sm ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      ~{tokenCount.toLocaleString()} tokens
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Model Configuration</Label>
                  <ModelSelector
                  value={modelConfig}
                  onChange={(newConfig) => {
                  console.log("🟡 ModelSelector Change Triggered:", newConfig); 
                  setModelConfig(newConfig);
                  updateNodeData(id, { modelConfig: newConfig }); 
              }}/>
                </div>

                <Button
                  onClick={handleGenerateVariations}
                  className="w-full"
                  disabled={!generatedPrompt.trim()}
                >
                  Generate Variations
                </Button>
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>Enter a base prompt and click "Generate Meta Prompt" to get started.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="w-3 h-3 bg-primary"
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 bg-primary"
      />
    </Card>
  );
};

export default MetaPromptNode;