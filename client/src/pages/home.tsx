import React from 'react';
import { FlowEditor } from '@/components/flow/FlowEditor';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 px-4">
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