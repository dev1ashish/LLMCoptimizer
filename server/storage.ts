import {
  type MetaPrompt,
  type CreateMetaPrompt,
  type PromptVariation,
  type CreatePromptVariation,
  type TestCase,
  type CreateTestCase,
  type EvaluationCriterion,
  type CreateEvaluationCriterion,
  type EvaluationResult,
  type CreateEvaluationResult,
  type LeaderboardEntry,
  type ModelProvider,
} from "@shared/schema";

export interface IStorage {
  // Meta Prompts
  createMetaPrompt(data: CreateMetaPrompt): Promise<MetaPrompt>;
  getMetaPrompt(id: number): Promise<MetaPrompt | undefined>;
  getAllMetaPrompts(): Promise<MetaPrompt[]>;

  // Variations
  createVariation(data: CreatePromptVariation): Promise<PromptVariation>;
  getVariation(id: number): Promise<PromptVariation | undefined>;
  getVariationsForMetaPrompt(metaPromptId: number): Promise<PromptVariation[]>;
  updateVariation(id: number, content: string): Promise<PromptVariation>;
  deleteVariation(id: number): Promise<void>;

  // Test Cases
  createTestCase(data: CreateTestCase): Promise<TestCase>;
  getTestCase(id: number): Promise<TestCase | undefined>;
  getTestCasesForMetaPrompt(metaPromptId: number): Promise<TestCase[]>;
  updateTestCase(id: number, input: string): Promise<TestCase>;
  deleteTestCase(id: number): Promise<void>;

  // Evaluation Criteria
  createCriterion(data: CreateEvaluationCriterion): Promise<EvaluationCriterion>;
  getCriterion(id: number): Promise<EvaluationCriterion | undefined>;
  getAllCriteria(): Promise<EvaluationCriterion[]>;
  updateCriterion(id: number, data: Partial<EvaluationCriterion>): Promise<EvaluationCriterion>;
  deleteCriterion(id: number): Promise<void>;

  // Evaluation Results
  createEvaluationResult(data: CreateEvaluationResult): Promise<EvaluationResult>;
  getEvaluationResult(id: number): Promise<EvaluationResult | undefined>;
  getResultsForVariation(variationId: number): Promise<EvaluationResult[]>;
  getResultsForTestCase(testCaseId: number): Promise<EvaluationResult[]>;

  // Leaderboard
  getLeaderboard(metaPromptId: number): Promise<LeaderboardEntry[]>;
}

class MemStorage implements IStorage {
  private metaPrompts: Map<number, MetaPrompt>;
  private variations: Map<number, PromptVariation>;
  private testCases: Map<number, TestCase>;
  private criteria: Map<number, EvaluationCriterion>;
  private results: Map<number, EvaluationResult>;
  private currentIds: {
    metaPrompt: number;
    variation: number;
    testCase: number;
    criterion: number;
    result: number;
  };

  constructor() {
    this.metaPrompts = new Map();
    this.variations = new Map();
    this.testCases = new Map();
    this.criteria = new Map();
    this.results = new Map();
    this.currentIds = {
      metaPrompt: 1,
      variation: 1,
      testCase: 1,
      criterion: 1,
      result: 1,
    };
  }

  // Meta Prompts
  async createMetaPrompt(data: CreateMetaPrompt): Promise<MetaPrompt> {
    const id = this.currentIds.metaPrompt++;
    const metaPrompt = { ...data, id };
    this.metaPrompts.set(id, metaPrompt);
    return metaPrompt;
  }

  async getMetaPrompt(id: number): Promise<MetaPrompt | undefined> {
    return this.metaPrompts.get(id);
  }

  async getAllMetaPrompts(): Promise<MetaPrompt[]> {
    return Array.from(this.metaPrompts.values());
  }

  // Variations
  async createVariation(data: CreatePromptVariation): Promise<PromptVariation> {
    const id = this.currentIds.variation++;
    const variation = { ...data, id };
    this.variations.set(id, variation);
    return variation;
  }

  async getVariation(id: number): Promise<PromptVariation | undefined> {
    return this.variations.get(id);
  }

  async getVariationsForMetaPrompt(metaPromptId: number): Promise<PromptVariation[]> {
    return Array.from(this.variations.values())
      .filter(v => v.metaPromptId === metaPromptId);
  }

  async updateVariation(id: number, content: string): Promise<PromptVariation> {
    const variation = this.variations.get(id);
    if (!variation) throw new Error("Variation not found");
    const updated = { ...variation, content };
    this.variations.set(id, updated);
    return updated;
  }

  async deleteVariation(id: number): Promise<void> {
    this.variations.delete(id);
  }

  // Test Cases
  async createTestCase(data: CreateTestCase): Promise<TestCase> {
    const id = this.currentIds.testCase++;
    const testCase = { ...data, id };
    this.testCases.set(id, testCase);
    return testCase;
  }

  async getTestCase(id: number): Promise<TestCase | undefined> {
    return this.testCases.get(id);
  }

  async getTestCasesForMetaPrompt(metaPromptId: number): Promise<TestCase[]> {
    return Array.from(this.testCases.values())
      .filter(tc => tc.metaPromptId === metaPromptId);
  }

  async updateTestCase(id: number, input: string): Promise<TestCase> {
    const testCase = this.testCases.get(id);
    if (!testCase) throw new Error("Test case not found");
    const updated = { ...testCase, input };
    this.testCases.set(id, updated);
    return updated;
  }

  async deleteTestCase(id: number): Promise<void> {
    this.testCases.delete(id);
  }

  // Evaluation Criteria
  async createCriterion(data: CreateEvaluationCriterion): Promise<EvaluationCriterion> {
    const id = this.currentIds.criterion++;
    const criterion = { ...data, id };
    this.criteria.set(id, criterion);
    return criterion;
  }

  async getCriterion(id: number): Promise<EvaluationCriterion | undefined> {
    return this.criteria.get(id);
  }

  async getAllCriteria(): Promise<EvaluationCriterion[]> {
    return Array.from(this.criteria.values());
  }

  async updateCriterion(
    id: number,
    data: Partial<EvaluationCriterion>
  ): Promise<EvaluationCriterion> {
    const criterion = this.criteria.get(id);
    if (!criterion) throw new Error("Criterion not found");
    const updated = { ...criterion, ...data };
    this.criteria.set(id, updated);
    return updated;
  }

  async deleteCriterion(id: number): Promise<void> {
    this.criteria.delete(id);
  }

  // Evaluation Results
  async createEvaluationResult(data: CreateEvaluationResult): Promise<EvaluationResult> {
    const id = this.currentIds.result++;
    const result = { ...data, id };
    this.results.set(id, result);
    return result;
  }

  async getEvaluationResult(id: number): Promise<EvaluationResult | undefined> {
    return this.results.get(id);
  }

  async getResultsForVariation(variationId: number): Promise<EvaluationResult[]> {
    return Array.from(this.results.values())
      .filter(r => r.variationId === variationId);
  }

  async getResultsForTestCase(testCaseId: number): Promise<EvaluationResult[]> {
    return Array.from(this.results.values())
      .filter(r => r.testCaseId === testCaseId);
  }

  // Leaderboard
  async getLeaderboard(metaPromptId: number): Promise<LeaderboardEntry[]> {
    const variations = await this.getVariationsForMetaPrompt(metaPromptId);
    const criteria = await this.getAllCriteria();

    const leaderboard: LeaderboardEntry[] = [];

    for (const variation of variations) {
      const results = await this.getResultsForVariation(variation.id);

      // Calculate scores per criterion
      const scores: Record<string, number> = {};
      for (const criterion of criteria) {
        const criterionResults = results.filter(r => r.criterionId === criterion.id);
        if (criterionResults.length > 0) {
          const avgScore = criterionResults.reduce((sum, r) => sum + r.score, 0) / criterionResults.length;
          scores[criterion.name] = avgScore;
        }
      }

      // Calculate average score
      const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
      const averageScore = totalScore / Object.keys(scores).length;

      // Find best model
      let bestScore = 0;
      let bestProvider: ModelProvider = "openai";
      let bestModel = "";

      results.forEach(result => {
        if (result.score > bestScore) {
          bestScore = result.score;
          const criterion = criteria.find(c => c.id === result.criterionId);
          if (criterion) {
            bestProvider = criterion.modelConfig.provider;
            bestModel = criterion.modelConfig.model;
          }
        }
      });

      leaderboard.push({
        variationId: variation.id,
        content: variation.content,
        averageScore,
        scores,
        bestModelPair: {
          provider: bestProvider,
          model: bestModel,
          score: bestScore,
        },
      });
    }

    // Sort by average score descending
    return leaderboard.sort((a, b) => b.averageScore - a.averageScore);
  }
}

// Create single instance of storage
export const storage = new MemStorage();