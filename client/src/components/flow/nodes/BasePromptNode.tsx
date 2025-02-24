import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Info } from 'lucide-react';
import { useFlowStore } from '@/store/flowStore';
import { BasePromptNodeData } from '@/Types/flowTypes';
import { ModelSelector } from '@/components/model-selector';
import { generateMetaPrompt } from '@/lib/ai-providers';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Example prompts for inspiration
const EXAMPLE_PROMPTS = [
  "I want an AI assistant that helps with writing professional emails",
  "I want an AI assistant that provides detailed explanations of scientific concepts",
  "I want an AI assistant specialized in creative storytelling for children",
  "I want an AI assistant that helps developers debug and optimize their code",
  "I want an AI assistant that acts as a personal fitness coach"
];

// Base Prompt Node component
const BasePromptNode: React.FC<NodeProps<BasePromptNodeData>> = ({ id, data }) => {
  const [basePrompt, setBasePrompt] = useState(data.basePrompt || '');
  const [modelConfig, setModelConfig] = useState(data.modelConfig);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateNodeData } = useFlowStore();
  const { toast } = useToast();

  // Update local state when node data changes externally
  useEffect(() => {
    if (data.basePrompt !== basePrompt && data.basePrompt !== undefined) {
      setBasePrompt(data.basePrompt);
    }
    
    if (data.modelConfig !== modelConfig && data.modelConfig !== undefined) {
      setModelConfig(data.modelConfig);
    }
  }, [data.basePrompt, data.modelConfig]);

  // Set a random example prompt
  const setRandomExample = () => {
    const randomIndex = Math.floor(Math.random() * EXAMPLE_PROMPTS.length);
    const examplePrompt = EXAMPLE_PROMPTS[randomIndex];
    setBasePrompt(examplePrompt);
    updateNodeData(id, { basePrompt: examplePrompt });
  };

  // Handle prompt generation
  const handleGenerate = async () => {
    // Input validation
    if (!basePrompt.trim()) {
      setError("Please enter a base prompt");
      toast({
        title: 'Error',
        description: 'Please enter a base prompt',
        variant: 'destructive',
      });
      return;
    }

    // Reset error state
    setError(null);
    setIsGenerating(true);
    
    // Update node data
    updateNodeData(id, { basePrompt, modelConfig });

    try {
      // Update meta prompt node to indicate generation is in progress
      const metaPromptNode = useFlowStore.getState().getNodeByType('metaPromptNode');
      if (metaPromptNode) {
        updateNodeData(metaPromptNode.id, { isGenerating: true });
      }

      // Generate meta prompt
      const generatedPrompt = await generateMetaPrompt(basePrompt, modelConfig);
      
      // Update meta prompt node with generated content
      if (metaPromptNode) {
        updateNodeData(metaPromptNode.id, {
          basePrompt,
          metaPrompt: {
            id: 0,
            basePrompt,
            generatedPrompt,
            modelConfig,
          },
          isGenerating: false,
        });
      }

      toast({
        title: 'Success',
        description: 'Meta prompt generated successfully',
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
      
      // Reset meta prompt node generation state
      const metaPromptNode = useFlowStore.getState().getNodeByType('metaPromptNode');
      if (metaPromptNode) {
        updateNodeData(metaPromptNode.id, { isGenerating: false });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-96 shadow-md">
      <CardHeader className="bg-primary/10 py-3 flex flex-row justify-between items-center">
        <CardTitle className="text-lg flex items-center">
          Base Prompt
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Describe what kind of AI assistant you want to create. This will be used to generate a more detailed system prompt.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <Label>What kind of AI assistant do you want?</Label>
          <Textarea
            placeholder="e.g., I want an AI that helps with writing blog posts"
            value={basePrompt}
            onChange={(e) => {
              setBasePrompt(e.target.value);
              setError(null);
            }}
            className={`min-h-20 ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={setRandomExample}
              className="text-xs"
              disabled={isGenerating}
            >
              Use Example
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Model Configuration</Label>
          <ModelSelector
            value={modelConfig}
            onChange={setModelConfig}
          />
        </div>

        <Button
          onClick={handleGenerate}
          className="w-full"
          disabled={isGenerating || !basePrompt.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Meta Prompt'
          )}
        </Button>
      </CardContent>

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

export default BasePromptNode;