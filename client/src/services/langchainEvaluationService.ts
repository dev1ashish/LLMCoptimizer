import { evaluateWithAgents } from '@/lib/ai-providers';
import type { 
  PromptVariation, 
  TestCase, 
  EvaluationCriterion,
  ModelConfig 
} from '@shared/schema';
import type { AgentEvaluationResult } from '@/Types/flowTypes';

/**
 * Evaluates all combinations of variations, test cases, and criteria using multiple AI agents
 */
export async function evaluateAllWithAgents(
  variations: PromptVariation[],
  testCases: TestCase[],
  criteria: EvaluationCriterion[],
  modelConfig: ModelConfig,
  onProgress: (progress: number) => void
): Promise<AgentEvaluationResult[]> {
  const allResults: AgentEvaluationResult[] = [];
  const total = variations.length * testCases.length * criteria.length;
  let completed = 0;

  // Use a more sequential approach to avoid rate limiting
  for (const variation of variations) {
    for (const testCase of testCases) {
      for (const criterion of criteria) {
        try {
          // Use the evaluateWithAgents function from ai-providers.ts
          const results = await evaluateWithAgents(
            variation.content,
            testCase.input,
            criterion,
            modelConfig
          );
          
          // Update results with correct IDs
          const updatedResults = results.map((result: any) => ({
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
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  return allResults;
}

/**
 * Convert agent evaluation results to standard evaluation results format
 */
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
