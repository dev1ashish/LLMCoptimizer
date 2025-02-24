import { type ModelConfig } from "@shared/schema";
import { apiRequest } from "./queryClient";
import { defaultModelConfigs } from "./model-config";

// API Functions that call the backend
export async function generateMetaPrompt(
  basePrompt: string,
  config: ModelConfig
): Promise<string> {
  try {
    console.log('[Meta Prompt] Requesting generation:', { basePrompt, config });

    // In local development or testing, we can mock the response
    // Use a safer check for development environment that works in browsers
    const isDevelopment = typeof window !== 'undefined' && 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1';
    
    const shouldMock = isDevelopment || localStorage.getItem('MOCK_API') === 'true';
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return `You are an AI assistant that ${basePrompt.toLowerCase()}. You should respond in a helpful, accurate, and thoughtful manner. Always prioritize user safety and provide information that is factual and up-to-date. Maintain a conversational tone while being concise and relevant to the user's needs. If you're unsure about something, acknowledge your limitations rather than making up information.`;
    }

    const response = await apiRequest<{ generatedPrompt: string }>("POST", "meta-prompts", {
      basePrompt,
      modelConfig: config,
    });

    console.log('[Meta Prompt] Generation successful:', response);
    return response.generatedPrompt;
  } catch (error) {
    console.error('[Meta Prompt] Generation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate meta prompt');
  }
}

export async function generateVariations(
  metaPrompt: string,
  config: ModelConfig
): Promise<string[]> {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = isDevelopment || localStorage.getItem('MOCK_API') === 'true';
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      return [
        `${metaPrompt}\n\nAdditionally, focus on providing concise answers that get to the point quickly.`,
        `${metaPrompt}\n\nFurthermore, prioritize detailed explanations that help the user understand complex concepts.`,
        `${metaPrompt}\n\nMoreover, emphasize engagement and interactivity, asking clarifying questions when appropriate.`
      ];
    }

    const response = await apiRequest<{ variations: string[] }>("POST", "variations", {
      metaPrompt,
      modelConfig: config,
    });
    return response.variations;
  } catch (error) {
    console.error('[Variations] Generation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate variations');
  }
}

export async function generateTestCases(
  metaPrompt: string,
  config: ModelConfig
): Promise<string[]> {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = isDevelopment || localStorage.getItem('MOCK_API') === 'true';
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay
      return [
        "Can you help me understand quantum computing in simple terms?",
        "I need to write an email to decline a job offer politely.",
        "What are the key differences between machine learning and deep learning?",
        "How can I improve my time management skills?",
        "I'm planning a trip to Japan. What are the must-see places?"
      ];
    }

    const response = await apiRequest<{ testCases: string[] }>("POST", "test-cases", {
      metaPrompt,
      modelConfig: config,
    });
    return response.testCases;
  } catch (error) {
    console.error('[Test Cases] Generation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate test cases');
  }
}

export async function evaluateResponse(
  response: string,
  criterion: string,
  config: ModelConfig
): Promise<number> {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = isDevelopment || localStorage.getItem('MOCK_API') === 'true';
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      // Return a random score between 6 and 9 for a generally positive evaluation
      return 6 + Math.random() * 3;
    }

    const data = await apiRequest<{ score: number }>("POST", "evaluate", {
      response,
      criterion,
      modelConfig: config,
    });
    return data.score;
  } catch (error) {
    console.error('[Evaluation] Failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to evaluate response');
  }
}

// New function to simulate AI response generation for a given prompt and input
export async function generateAIResponse(
  systemPrompt: string,
  userInput: string,
  config: ModelConfig
): Promise<string> {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = isDevelopment || localStorage.getItem('MOCK_API') === 'true';
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // Simulate variable API delay
      
      // Generate a simulated response
      const responseOptions = [
        `Here's a helpful response to your query about "${userInput.substring(0, 30)}...". This response is generated based on the system prompt that focuses on ${systemPrompt.substring(0, 50)}...`,
        `I'd be happy to help with your question regarding "${userInput.substring(0, 30)}...". Based on my understanding, I can provide information that aligns with the principles of ${systemPrompt.substring(0, 50)}...`,
        `Regarding your inquiry about "${userInput.substring(0, 30)}...", I can offer insights that follow the guidelines set forth in my training, which emphasizes ${systemPrompt.substring(0, 50)}...`
      ];
      
      return responseOptions[Math.floor(Math.random() * responseOptions.length)];
    }

    const response = await apiRequest<{ response: string }>("POST", "generate", {
      systemPrompt,
      userInput,
      modelConfig: config,
    });
    return response.response;
  } catch (error) {
    console.error('[Response Generation] Failed:', error);
    
    // For testing, return a mock response if the API fails
    return `This is a simulated response from ${config.provider}-${config.model} using the system prompt "${systemPrompt.substring(0, 50)}..." for the input "${userInput.substring(0, 50)}..."`;
  }
}

// Function to evaluate with agents (calls backend endpoint)
export async function evaluateWithAgents(
  systemPrompt: string,
  userInput: string,
  criterion: { id: number; name: string; description: string; weight: number },
  config: ModelConfig
) {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = isDevelopment || localStorage.getItem('MOCK_API') === 'true';
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      
      // Generate mock agent results
      return [
        {
          variationId: 0,
          testCaseId: 0,
          criterionId: criterion.id,
          score: 6 + Math.random() * 3, // Random score between 6 and 9
          reasoning: `This system prompt effectively addresses "${criterion.name}" because it provides clear guidelines for responding to the user's input. The prompt structure encourages ${criterion.description.toLowerCase()}.`,
          agent: "GPT-4o Evaluator"
        },
        {
          variationId: 0,
          testCaseId: 0,
          criterionId: criterion.id,
          score: 6 + Math.random() * 3, // Random score between 6 and 9
          reasoning: `The system prompt shows strong performance on "${criterion.name}" criterion. It successfully implements strategies that support ${criterion.description.toLowerCase()}.`,
          agent: "Claude 3.5 Evaluator"
        }
      ];
    }

    const result = await apiRequest("POST", "evaluate-with-agents", {
      systemPrompt,
      userInput,
      criterion,
      modelConfig: config
    });
    
    return result.results;
  } catch (error) {
    console.error('[Agent Evaluation] Failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to evaluate with agents');
  }
}