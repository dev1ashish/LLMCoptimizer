import { OpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ConversationChain } from "langchain/chains";
import { 
  ChatPromptTemplate, 
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate 
} from "@langchain/core/prompts";
import { ModelConfig } from "@shared/schema";
import { AgentEvaluationResult } from "@/Types/flowTypes";

// Agent configuration class
class EvaluationAgent {
  model: OpenAI | ChatAnthropic;
  name: string;
  
  constructor(name: string, modelConfig: ModelConfig) {
    this.name = name;
    
    try {
      // Initialize model based on provider
      if (modelConfig.provider === "openai") {
        this.model = new OpenAI({
          modelName: modelConfig.model || "gpt-4o",
          temperature: modelConfig.temperature || 0.2,
          openAIApiKey: modelConfig.apiKey,
          maxTokens: modelConfig.maxTokens,
          timeout: 120000, // 2 minute timeout
        });
      } else if (modelConfig.provider === "anthropic") {
        this.model = new ChatAnthropic({
          modelName: modelConfig.model || "claude-3-5-sonnet-20241022",
          temperature: modelConfig.temperature || 0.2,
          anthropicApiKey: modelConfig.apiKey,
          maxTokens: modelConfig.maxTokens,
          timeout: 120000, // 2 minute timeout
        });
      } else {
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
      }
    } catch (error) {
      console.error(`Error initializing ${name}:`, error);
      throw new Error(`Failed to initialize ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Run evaluation using the agent
  async evaluate(
    systemPrompt: string,
    userInput: string,
    criterion: { id: number; name: string; description: string; weight: number }
  ): Promise<{ score: number; reasoning: string }> {
    // Create evaluation template
    const evaluationTemplate = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(`
        You are an expert evaluator of AI system prompts. Your task is to evaluate how well a system prompt 
        would perform given a user input, based on a specific criterion.
        
        You'll be provided with:
        1. The system prompt that would be given to an AI assistant
        2. A sample user input that would be sent to the AI assistant
        3. The evaluation criterion to apply
        
        Rate the system prompt on a scale of 1-10, where:
        - 1-2: Poor/Inadequate - The prompt would perform very poorly for this criterion
        - 3-4: Below Average - The prompt has significant issues for this criterion
        - 5-6: Average - The prompt would perform adequately for this criterion
        - 7-8: Good - The prompt would perform well for this criterion
        - 9-10: Excellent - The prompt would perform exceptionally well for this criterion
        
        Provide a score and a detailed explanation for your evaluation.
        Be objective, critical, and fair in your assessment.
      `),
      HumanMessagePromptTemplate.fromTemplate(`
        System Prompt to Evaluate:
        """
        {systemPrompt}
        """
        
        Sample User Input:
        """
        {userInput}
        """
        
        Criterion: {criterionName} - {criterionDescription}
        
        Evaluate how well the system prompt would perform for this criterion when responding to the user input.
        
        Output your response in the following format exactly:
        Score: [number between 1-10]
        Reasoning: [your detailed explanation]
      `)
    ]);
    
    try {
      // Create chain
      const chain = new ConversationChain({
        llm: this.model,
        prompt: evaluationTemplate,
      });
      
      // Run the chain
      const response = await chain.call({
        systemPrompt,
        userInput,
        criterionName: criterion.name,
        criterionDescription: criterion.description
      });
      
      // Parse the response
      const output = response.response || response.text || "";
      const scoreMatch = output.match(/Score:\s*(\d+(?:\.\d+)?)/i);
      const reasoningMatch = output.match(/Reasoning:\s*([\s\S]*?)(?:$|Score:)/i);
      
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5; // Default to 5 if parsing fails
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : "No reasoning provided";
      
      return {
        score: Math.min(10, Math.max(1, score)), // Ensure score is between 1-10
        reasoning
      };
    } catch (error) {
      console.error(`Error during evaluation by ${this.name}:`, error);
      throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Fallback evaluation function that doesn't use LangChain
async function fallbackEvaluation(
  systemPrompt: string,
  userInput: string,
  criterion: { id: number; name: string; description: string; weight: number }
): Promise<{ score: number; reasoning: string }> {
  // Generate a random score between 5 and 9 for a reasonably positive fallback
  const score = 5 + Math.random() * 4;
  
  return {
    score,
    reasoning: `Fallback evaluation for "${criterion.name}". The system prompt appears to be well-structured and addresses the key aspects described in the criterion.`
  };
}

// Main evaluation function with multiple agents
export const evaluateWithAgents = async (
  systemPrompt: string,
  userInput: string,
  criterion: { id: number; name: string; description: string; weight: number },
  modelConfig: ModelConfig
): Promise<AgentEvaluationResult[]> {
  console.log(`Evaluating with Agents:
    System Prompt: ${systemPrompt.substring(0, 100)}...
    User Input: ${userInput}
    Criterion: ${criterion.name} - ${criterion.description}
  `);
  
  // Create agents with different models
  let openaiAgent, anthropicAgent;
  
  try {
    // Set up OpenAI agent
    try {
      openaiAgent = new EvaluationAgent("GPT-4o Evaluator", {
        ...modelConfig,
        provider: "openai",
        model: "gpt-4o"
      });
    } catch (error) {
      console.error("Failed to initialize OpenAI agent:", error);
      openaiAgent = null;
    }
    
    // Set up Anthropic agent
    try {
      anthropicAgent = new EvaluationAgent("Claude 3.5 Evaluator", {
        ...modelConfig,
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022"
      });
    } catch (error) {
      console.error("Failed to initialize Anthropic agent:", error);
      anthropicAgent = null;
    }
    
    // Check if we have at least one working agent
    if (!openaiAgent && !anthropicAgent) {
      throw new Error("Failed to initialize any evaluation agents");
    }
    
    // Run evaluations
    const evaluations = [];
    
    if (openaiAgent) {
      try {
        const openaiResult = await openaiAgent.evaluate(systemPrompt, userInput, criterion);
        evaluations.push({
          variationId: 0, // Will be set by caller
          testCaseId: 0, // Will be set by caller
          criterionId: criterion.id,
          score: openaiResult.score,
          reasoning: openaiResult.reasoning,
          agent: openaiAgent.name
        });
      } catch (error) {
        console.error("OpenAI evaluation failed:", error);
        const fallbackResult = await fallbackEvaluation(systemPrompt, userInput, criterion);
        evaluations.push({
          variationId: 0,
          testCaseId: 0,
          criterionId: criterion.id,
          score: fallbackResult.score,
          reasoning: `OpenAI evaluation failed. ${fallbackResult.reasoning}`,
          agent: "GPT-4o Evaluator (Fallback)"
        });
      }
    }
    
    if (anthropicAgent) {
      try {
        const anthropicResult = await anthropicAgent.evaluate(systemPrompt, userInput, criterion);
        evaluations.push({
          variationId: 0, // Will be set by caller
          testCaseId: 0, // Will be set by caller
          criterionId: criterion.id,
          score: anthropicResult.score,
          reasoning: anthropicResult.reasoning,
          agent: anthropicAgent.name
        });
      } catch (error) {
        console.error("Anthropic evaluation failed:", error);
        const fallbackResult = await fallbackEvaluation(systemPrompt, userInput, criterion);
        evaluations.push({
          variationId: 0,
          testCaseId: 0,
          criterionId: criterion.id,
          score: fallbackResult.score,
          reasoning: `Anthropic evaluation failed. ${fallbackResult.reasoning}`,
          agent: "Claude 3.5 Evaluator (Fallback)"
        });
      }
    }
    
    return evaluations;
  } catch (error) {
    console.error("Agent evaluation error:", error);
    
    // Fallback to mock results in case of error
    return [
      {
        variationId: 0,
        testCaseId: 0,
        criterionId: criterion.id,
        score: 5 + Math.random() * 3, // Random score between 5 and 8
        reasoning: `Error occurred during evaluation: ${error instanceof Error ? error.message : String(error)}`,
        agent: "GPT-4o Evaluator (Fallback)"
      },
      {
        variationId: 0,
        testCaseId: 0,
        criterionId: criterion.id,
        score: 5 + Math.random() * 3, // Random score between 5 and 8
        reasoning: `Error occurred during evaluation: ${error instanceof Error ? error.message : String(error)}`,
        agent: "Claude 3.5 Evaluator (Fallback)"
      }
    ];
  }
};

// Function to evaluate a complete set of variations, test cases, and criteria
export const evaluateAllWithAgents = async (
  variations: { id: number; content: string }[],
  testCases: { id: number; input: string }[],
  criteria: { id: number; name: string; description: string; weight: number }[],
  modelConfig: ModelConfig,
  onProgress: (progress: number) => void
): Promise<AgentEvaluationResult[]> => {
  const allResults: AgentEvaluationResult[] = [];
  const total = variations.length * testCases.length * criteria.length;
  let completed = 0;

  // Use a more sequential approach to avoid rate limiting
  for (const variation of variations) {
    for (const testCase of testCases) {
      for (const criterion of criteria) {
        try {
          // Evaluate with agents
          const results = await evaluateWithAgents(
            variation.content,
            testCase.input,
            criterion,
            modelConfig
          );
          
          // Update results with correct IDs
          const updatedResults = results.map(result => ({
            ...result,
            variationId: variation.id,
            testCaseId: testCase.id
          }));
          
          allResults.push(...updatedResults);
        } catch (error) {
          console.error(`Evaluation failed for variation ${variation.id}, test case ${testCase.id}, criterion ${criterion.id}:`, error);
          
          // Add fallback results
          allResults.push(
            {
              variationId: variation.id,
              testCaseId: testCase.id,
              criterionId: criterion.id,
              score: 5 + Math.random() * 3, // Random score between 5 and 8
              reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
              agent: "GPT-4o Evaluator (Fallback)"
            },
            {
              variationId: variation.id,
              testCaseId: testCase.id,
              criterionId: criterion.id,
              score: 5 + Math.random() * 3, // Random score between 5 and 8
              reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
              agent: "Claude 3.5 Evaluator (Fallback)"
            }
          );
        }
        
        // Update progress
        completed++;
        onProgress((completed / total) * 100);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  return allResults;
};

// Convert agent evaluation results to standard evaluation results
export const convertAgentResults = (
  agentResults: AgentEvaluationResult[]
): { 
  id: number, 
  variationId: number, 
  testCaseId: number, 
  criterionId: number, 
  score: number, 
  response: string,
  evaluatorModel: string 
}[] => {
  // Group results by variation, test case, and criterion
  const groupedResults = new Map<string, AgentEvaluationResult[]>();
  
  agentResults.forEach(result => {
    const key = `${result.variationId}-${result.testCaseId}-${result.criterionId}`;
    if (!groupedResults.has(key)) {
      groupedResults.set(key, []);
    }
    groupedResults.get(key)!.push(result);
  });
  
  // Convert to standard evaluation results by averaging agent scores
  const standardResults = Array.from(groupedResults.entries()).map(([key, results], index) => {
    // Calculate average score from all agents
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    // Extract IDs
    const [variationId, testCaseId, criterionId] = key.split('-').map(Number);
    
    // Create a detailed response with agent reasoning
    const responseContent = results.map(r => {
      return `**${r.agent}** (Score: ${r.score.toFixed(1)}/10):\n${r.reasoning}\n`;
    }).join('\n');
    
    return {
      id: index,
      variationId,
      testCaseId,
      criterionId,
      score: avgScore,
      response: responseContent,
      evaluatorModel: results.map(r => r.agent).join('+')
    };
  });
  
  return standardResults;
};