import React from 'react';
import { FlowEditor } from '@/components/flow/FlowEditor';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold">Meta Prompt Optimizer</h1>
          <p className="text-muted-foreground mt-2">
            Optimize your AI system prompts through systematic evaluation with multiple agents
          </p>
        </div>
        
        <FlowEditor />
        
        <footer className="mt-10 text-center text-sm text-muted-foreground">
          <p>
            Built with LangChain.js and React Flow. Test your prompts with GPT-4o and Claude 3.5 agents.
          </p>
        </footer>
      </div>
    </div>
  );
}