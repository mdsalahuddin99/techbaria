"use server";

import { auth } from "@/server/auth/config";
import { ServiceError } from "@/server/lib/errors";

export async function generateProductDescriptionAction(productName: string): Promise<string> {
  const session = await auth();
  if (!session?.user) {
    throw new ServiceError("UNAUTHENTICATED", "User not authenticated", 401);
  }

  if (!productName || productName.trim() === "") {
    throw new Error("Product name is required to generate a description.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const prompt = `Write a professional, attractive, and concise e-commerce product description for: "${productName}". The description should be in English. Keep it under 100 words. Do not include markdown formatting or quotes around the text.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    console.error("Gemini API Error:", await response.text());
    throw new Error("Failed to generate description from AI. Please try again later.");
  }

  const data = await response.json();
  const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error("AI returned an empty response.");
  }

  return generatedText.trim();
}
