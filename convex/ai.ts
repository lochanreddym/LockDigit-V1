import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * OpenAI integration via Convex HTTP actions.
 * All API calls are server-side to keep the API key secure.
 */

export const extractDocumentData = action({
  args: {
    imageUrl: v.string(),
    documentType: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a document data extraction assistant. Extract structured data from the provided ${args.documentType} image. Return a JSON object with the following fields where applicable: name, documentNumber, issuer, issueDate, expiryDate, dateOfBirth, address, and any other relevant fields. Dates should be in ISO 8601 format (YYYY-MM-DD). If a field cannot be determined, set it to null.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please extract all relevant information from this ${args.documentType}.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: args.imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  },
});

export const analyzeBills = action({
  args: {
    bills: v.array(
      v.object({
        title: v.string(),
        category: v.string(),
        amount: v.number(),
        dueDate: v.number(),
        status: v.string(),
      })
    ),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a financial assistant. Analyze the user's bills and provide a brief summary with actionable suggestions. Include: total due, priority payments, and any money-saving tips. Keep it concise (max 200 words). Return as JSON with fields: summary, totalDue, priorityBills (array of titles), tips (array of strings).",
          },
          {
            role: "user",
            content: `Here are my current bills:\n${JSON.stringify(args.bills, null, 2)}`,
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  },
});

export const generateSmartSuggestions = action({
  args: {
    context: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant for LockDigit, a digital identity and payment wallet app. Provide brief, actionable suggestions based on the user's context. Return as JSON with a 'suggestions' array of objects, each with 'title' and 'description' fields. Max 3 suggestions.",
          },
          {
            role: "user",
            content: args.context,
          },
        ],
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  },
});
