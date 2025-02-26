import { openai, anthropic } from "./config";
import { type ModelConfig } from "@shared/schema";

// System prompts for different tasks
const SYSTEM_PROMPTS = {
  metaPrompt: `You are an expert at crafting system prompts for AI assistants. Your task is to convert the following base prompt into a detailed, effective system prompt that will guide the AI assistant's behavior and responses.

Consider:
- Role and persona
- Response format and style
- Constraints and guidelines
- Edge cases and safety measures

Output a clear, comprehensive system prompt that captures the essence of the request. PROVIDE A VERY DETAILED META PROMPT WHICH CAN BE USED AS A SYSTEM PROMPT.`,

  variations: `Create 3 variations of the following system prompt. Each variation should maintain the core functionality but approach it differently. Consider:
- Different personality traits
- Alternative frameworks
- Varying levels of detail
- Different emphasis points

Output exactly 3 complete variations, separated by "---".`,

  testCases: `Generate 5 diverse test cases that would effectively evaluate an AI assistant using the given system prompt. Consider:
- Different types of requests
- Edge cases
- Complex scenarios
- Simple baseline tests

Output exactly 5 test cases, one per line, starting with "Test case: ".`,

  evaluation: `Evaluate the following AI response based on the provided criterion. 
Output a single number between 0 and 10, where:
- 0-2: Poor/Inadequate
- 3-4: Below Average
- 5-6: Average
- 7-8: Good
- 9-10: Excellent

Consider:
- Adherence to the criterion
- Quality of execution
- Effectiveness

Only output the numeric score, nothing else.`,
};

export async function generateMetaPrompt(
  basePrompt: string,
  config: ModelConfig
): Promise<string> {
  try {
    if (config.provider === "openai") {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.metaPrompt },
          { role: "user", content: basePrompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
      });

      return response.choices[0].message.content || "";
    } 

    if (config.provider === "anthropic") {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [
          { role: "user", content: SYSTEM_PROMPTS.metaPrompt + "\n\n" + basePrompt },
        ],
        temperature: config.temperature,
      });

      const messageContent = response.content[0];
      if (messageContent.type === 'text') {
        return messageContent.text;
      }
      throw new Error("Unexpected response format from Anthropic");
    }

    if (config.provider === "google") {
      // TODO: Implement Google API integration
      throw new Error("Google API integration not yet implemented");
    }

    throw new Error(`Unsupported provider: ${config.provider}`);
  } catch (error) {
    console.error("[AI Provider] Failed to generate meta prompt:", error);
    throw error;
  }
}

export async function generateVariations(
  metaPrompt: string,
  config: ModelConfig
): Promise<string[]> {
  try {
    let variations: string[];

    if (config.provider === "openai") {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.variations },
          { role: "user", content: metaPrompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
      });

      variations = (response.choices[0].message.content || "")
        .split("---")
        .map(v => v.trim())
        .filter(v => v.length > 0);
    } 
    else if (config.provider === "anthropic") {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [
          { role: "user", content: SYSTEM_PROMPTS.variations + "\n\n" + metaPrompt },
        ],
        temperature: config.temperature,
      });

      const messageContent = response.content[0];
      if (messageContent.type === 'text') {
        variations = messageContent.text
          .split("---")
          .map(v => v.trim())
          .filter(v => v.length > 0);
      } else {
        throw new Error("Unexpected response format from Anthropic");
      }
    }
    else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Ensure exactly 3 variations
    if (variations.length < 3) {
      throw new Error("Not enough variations generated");
    }
    return variations.slice(0, 3);
  } catch (error) {
    console.error("[AI Provider] Failed to generate variations:", error);
    throw error;
  }
}

export async function generateTestCases(
  metaPrompt: string,
  config: ModelConfig
): Promise<string[]> {
  try {
    let testCases: string[];

    if (config.provider === "openai") {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.testCases },
          { role: "user", content: metaPrompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
      });

      testCases = (response.choices[0].message.content || "")
        .split("\n")
        .filter(line => line.startsWith("Test case: "))
        .map(line => line.replace("Test case: ", "").trim());
    } 
    else if (config.provider === "anthropic") {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [
          { role: "user", content: SYSTEM_PROMPTS.testCases + "\n\n" + metaPrompt },
        ],
        temperature: config.temperature,
      });

      const messageContent = response.content[0];
      if (messageContent.type === 'text') {
        testCases = messageContent.text
          .split("\n")
          .filter(line => line.startsWith("Test case: "))
          .map(line => line.replace("Test case: ", "").trim());
      } else {
        throw new Error("Unexpected response format from Anthropic");
      }
    }
    else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Ensure exactly 5 test cases
    if (testCases.length < 5) {
      throw new Error("Not enough test cases generated");
    }
    return testCases.slice(0, 5);
  } catch (error) {
    console.error("[AI Provider] Failed to generate test cases:", error);
    throw error;
  }
}

export async function evaluateResponse(
  response: string,
  criterion: string,
  config: ModelConfig
): Promise<number> {
  try {
    const prompt = `${SYSTEM_PROMPTS.evaluation}\n\nCriterion: "${criterion}"\n\nResponse to evaluate:\n${response}`;

    if (config.provider === "openai") {
      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: prompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
      });

      const score = parseFloat(completion.choices[0].message.content || "0");
      return Math.min(10, Math.max(0, score));
    } 
    else if (config.provider === "anthropic") {
      const message = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [{ role: "user", content: prompt }],
        temperature: config.temperature,
      });

      const messageContent = message.content[0];
      if (messageContent.type === 'text') {
        const score = parseFloat(messageContent.text);
        return Math.min(10, Math.max(0, score));
      }
      throw new Error("Unexpected response format from Anthropic");
    }

    throw new Error(`Unsupported provider: ${config.provider}`);
  } catch (error) {
    console.error("[AI Provider] Failed to evaluate response:", error);
    throw error;
  }
}