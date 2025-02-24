import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFlowStore } from '@/store/flowstore';
import { generateMetaPrompt, generateVariations, generateTestCases } from '@/lib/ai-providers';
import type { ModelConfig } from '@shared/schema';
import type { 
  MetaPromptNodeData,
  VariationsNodeData,
  EvaluationNodeData,
  TestCasesNodeData 
} from '@/Types/flowTypes';

/**
 * Custom hook for Auto Mode functionality
 * Automatically runs the entire workflow from base prompt to evaluation
 */
export function useAutoMode() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const updateNodeData = useFlowStore(state => state.updateNodeData);
  const getNodeByType = useFlowStore(state => state.getNodeByType);
  
  // Create a ref to track if auto mode should stop
  const shouldStopRef = useRef(false);
  
  /**
   * Stop any running auto mode process
   */
  const stopAutoMode = () => {
    if (!isRunning) return;
    
    console.log("🛑 Manual stop requested for Auto Mode");
    shouldStopRef.current = true;
    
    toast({
      title: 'Stopping Auto Mode',
      description: 'Auto mode will stop at the next checkpoint',
    });
  };

  /**
   * Run the entire automated workflow
   */
  const runAutoMode = async (basePrompt: string, modelConfig: ModelConfig) => {
    // GUARD: Prevent multiple concurrent runs
    if (isRunning) {
      console.log("⚠️ Auto Mode already running - ignoring new request");
      return;
    }
    
    console.log("🚀 Auto Mode starting with:", { basePrompt: basePrompt.substring(0, 30) + "...", modelConfig });
    setIsRunning(true);
    setError(null);
    shouldStopRef.current = false;
    
    // Get node references
    const basePromptNode = getNodeByType('basePromptNode');
    const metaPromptNode = getNodeByType('metaPromptNode');
    const variationsNode = getNodeByType('variationsNode');
    const testCasesNode = getNodeByType('testCasesNode');
    const evaluationNode = getNodeByType('evaluationNode');
    const resultsNode = getNodeByType('resultsNode');
    const modelArenaNode = getNodeByType('modelArenaNode');
    
    // GUARD: Check all required nodes exist
    if (!basePromptNode || !metaPromptNode || !variationsNode || 
        !testCasesNode || !evaluationNode || !resultsNode || !modelArenaNode) {
      console.error("❌ Required nodes missing:", {
        basePromptNode: !!basePromptNode,
        metaPromptNode: !!metaPromptNode,
        variationsNode: !!variationsNode,
        testCasesNode: !!testCasesNode,
        evaluationNode: !!evaluationNode,
        resultsNode: !!resultsNode,
        modelArenaNode: !!modelArenaNode
      });
      setIsRunning(false);
      setError("Flow nodes are missing - cannot run auto mode");
      toast({
        title: 'Auto Mode Error',
        description: 'Some required nodes are missing from the flow',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      toast({
        title: 'Auto Mode Started',
        description: 'Starting the automated workflow process',
      });

      // Reset all node states at the beginning
      updateNodeData(basePromptNode.id, { 
        basePrompt, 
        modelConfig,
        isAutoMode: true 
      });
      updateNodeData(metaPromptNode.id, { isGenerating: false });
      updateNodeData(variationsNode.id, { isGenerating: false });
      updateNodeData(testCasesNode.id, { isGenerating: false });
      updateNodeData(evaluationNode.id, { isEvaluating: false, progress: 0 });
      
      //-----------------------------------------------
      // STEP 1: Generate Meta Prompt
      //-----------------------------------------------
      console.log("🔍 STEP 1: Starting Meta Prompt generation");
      
      // Mark meta prompt node as generating
      updateNodeData(metaPromptNode.id, { isGenerating: true });
      
      // Generate meta prompt
      console.log("🔄 Calling generateMetaPrompt API");
      const generatedPrompt = await generateMetaPrompt(basePrompt, modelConfig);
      console.log("✅ Meta prompt generated:", generatedPrompt.substring(0, 50) + "...");
      
      // Check for stop request
      if (shouldStopRef.current) {
        throw new Error('Auto mode was manually stopped');
      }
      
      // Create meta prompt object to be used in subsequent steps
      const metaPromptObj = {
        id: 0,
        basePrompt,
        generatedPrompt,
        modelConfig,
      };
      
      // Update meta prompt node
      console.log("📝 Updating meta prompt node with result");
      updateNodeData(metaPromptNode.id, {
        basePrompt,
        metaPrompt: metaPromptObj,
        isGenerating: false
      });
      
      // Force a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      //-----------------------------------------------
      // STEP 2: Generate Variations
      //-----------------------------------------------
      console.log("🔍 STEP 2: Starting Variations generation");
      
      // Mark variations node as generating
      updateNodeData(variationsNode.id, { 
        isGenerating: true,
        metaPrompt: metaPromptObj, // Pass meta prompt data forward
        modelConfig
      });
      
      // Generate variations
      console.log("🔄 Calling generateVariations API");
      const variationContents = await generateVariations(generatedPrompt, modelConfig);
      console.log("✅ Generated variations:", variationContents.length);
      
      // Check for stop request
      if (shouldStopRef.current) {
        throw new Error('Auto mode was manually stopped');
      }
      
      // Create variation objects
      const promptVariations = variationContents.map((content, index) => ({
        id: index,
        metaPromptId: 0,
        content,
        modelConfig,
      }));
      
      // Update variations node
      console.log("📝 Updating variations node with", promptVariations.length, "variations");
      updateNodeData(variationsNode.id, {
        metaPrompt: metaPromptObj,
        variations: promptVariations,
        modelConfig,
        isGenerating: false
      });
      
      // Force a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      //-----------------------------------------------
      // STEP 3: Generate Test Cases
      //-----------------------------------------------
      console.log("🔍 STEP 3: Starting Test Cases generation");
      
      // Mark test cases node as generating
      updateNodeData(testCasesNode.id, { 
        isGenerating: true,
        metaPrompt: metaPromptObj // Pass meta prompt data forward
      });
      
      // Generate test cases
      console.log("🔄 Calling generateTestCases API");
      const testCaseInputs = await generateTestCases(generatedPrompt, modelConfig);
      console.log("✅ Generated test cases:", testCaseInputs.length);
      
      // Check for stop request
      if (shouldStopRef.current) {
        throw new Error('Auto mode was manually stopped');
      }
      
      // Create test case objects
      const testCases = testCaseInputs.map((input, index) => ({
        id: index,
        metaPromptId: 0,
        input,
        isAutoGenerated: true,
      }));
      
      // Update test cases node
      console.log("📝 Updating test cases node with", testCases.length, "test cases");
      updateNodeData(testCasesNode.id, {
        metaPrompt: metaPromptObj,
        testCases,
        modelConfig,
        isGenerating: false
      });
      
      // Force a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      //-----------------------------------------------
      // STEP 4: Prepare & Run Evaluation
      //-----------------------------------------------
      console.log("🔍 STEP 4: Starting Evaluation");
      
      // Need to ensure there are default criteria in the evaluation node
      const getDefaultCriteria = () => [
        { id: 1, name: 'Relevance', description: 'How relevant is the response to the input?', weight: 3, modelConfig },
        { id: 2, name: 'Coherence', description: 'How well-structured and logical is the response?', weight: 2, modelConfig },
        { id: 3, name: 'Accuracy', description: 'How accurate is the information provided?', weight: 3, modelConfig },
        { id: 4, name: 'Creativity', description: 'How creative and innovative is the response?', weight: 2, modelConfig },
        { id: 5, name: 'Conciseness', description: 'How concise and to-the-point is the response?', weight: 1, modelConfig }
      ];
      
      // Check if we already have criteria
      const currentCriteria = (evaluationNode.data as EvaluationNodeData).criteria || [];
      const criteria = currentCriteria.length > 0 ? currentCriteria : getDefaultCriteria();
      
      // Update evaluation node to prepare for evaluation
      console.log("📝 Preparing evaluation node with data");
      updateNodeData(evaluationNode.id, {
        variations: promptVariations,
        testCases,
        criteria,
        modelConfig,
        isEvaluating: true,
        progress: 0,
        results: null
      });
      
      // Force a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Run evaluation using the service
      console.log("🔄 Importing evaluation service");
      const evalServiceModule = await import('@/services/langchainEvaluationService');
      
      // Create a progress handler that checks for abort
      const handleProgress = (progress: number) => {
        if (shouldStopRef.current) {
          throw new Error('Auto mode was manually stopped');
        }
        
        console.log(`📊 Evaluation progress: ${progress.toFixed(0)}%`);
        updateNodeData(evaluationNode.id, { progress });
      };
      
      // Start the evaluation
      console.log("🔄 Running evaluateAllWithAgents");
      const agentResults = await evalServiceModule.evaluateAllWithAgents(
        promptVariations,
        testCases,
        criteria,
        modelConfig,
        handleProgress
      );
      console.log("✅ Evaluation completed with", agentResults.length, "result entries");
      
      // Check for stop request
      if (shouldStopRef.current) {
        throw new Error('Auto mode was manually stopped');
      }
      
      // Convert to standard format
      console.log("🔄 Converting agent results to standard format");
      const standardResults = evalServiceModule.convertAgentResults(agentResults);
      
      // Update evaluation node with results
      console.log("📝 Updating evaluation node with completed results");
      updateNodeData(evaluationNode.id, {
        results: standardResults,
        isEvaluating: false,
        progress: 100
      });
      
      // Update results node
      console.log("📝 Updating results node with evaluation data");
      updateNodeData(resultsNode.id, {
        variations: promptVariations,
        testCases,
        evaluationResults: standardResults
      });
      
      // Update model arena node
      console.log("📝 Updating model arena node with evaluation data");
      updateNodeData(modelArenaNode.id, {
        variations: promptVariations,
        testCases,
        results: standardResults
      });
      
      console.log("🎉 Auto mode completed successfully!");
      
      // Notify user of success
      toast({
        title: 'Auto Mode Complete',
        description: 'The entire workflow has been completed automatically!',
      });
    } catch (err) {
      console.error("❌ Auto Mode error:", err);
      
      // Check if this was an intentional stop
      if (shouldStopRef.current) {
        console.log("🛑 Auto Mode was manually stopped");
        toast({
          title: 'Auto Mode Stopped',
          description: 'Auto mode was stopped as requested',
        });
      } else {
        // This was an unexpected error
        const errorMessage = err instanceof Error ? err.message : 'Auto mode failed unexpectedly';
        console.error("❌ Auto Mode failed with error:", errorMessage);
        setError(errorMessage);
        
        toast({
          title: 'Auto Mode Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      // Always reset states when done
      console.log("🧹 Cleaning up auto mode state");
      shouldStopRef.current = false;
      
      // Reset auto mode state in base prompt node
      if (basePromptNode) {
        updateNodeData(basePromptNode.id, { isAutoMode: false });
      }
      
      // Set running state to false
      setIsRunning(false);
    }
  };

  return {
    isRunning,
    error,
    runAutoMode,
    stopAutoMode
  };
} 