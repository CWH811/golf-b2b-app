import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

type ProductRecord = {
  sku: string;
  name: string;
  base_price: number;
};

type AIResult = {
  match_found: boolean;
  matched_sku: string | null;
  confidence: number;
  reasoning: string;
  product_details?: ProductRecord;
  error?: string;
  timeout?: boolean;
  low_light?: boolean;
};

const SCAN_TIMEOUT_MS = 15000; // 15-second timeout for poor network conditions

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported image format. Please use JPEG, PNG, or WebP.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: products, error: dbError } = await supabase
      .from('products')
      .select('*')
      .neq('status', 'archived');

    if (dbError) throw dbError;

    const productList = (products ?? []) as ProductRecord[];
    const catalogContext = productList.map((product) =>
      `SKU: ${product.sku} | Name: ${product.name} | Price: $${product.base_price}`
    ).join('\n');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const prompt = `You are a B2B product identification AI for a golf course operations platform.
Review the uploaded image carefully.

Here is our current catalog:
${catalogContext}

Determine if the item in the image matches exactly with any item in the catalog.
Consider the following:
- If the image is too dark, blurry, or poorly lit, set "low_light": true and explain why.
- If no match is found, set "match_found": false and explain what was seen vs what's in the catalog.
- If a match is found, provide the exact SKU and confidence score.

Return ONLY a JSON object with these exact keys:
"match_found": boolean,
"matched_sku": string or null,
"confidence": number 0-100,
"reasoning": string explaining the match or why it failed,
"low_light": boolean (true if image quality is insufficient)`;

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI scan timed out after 15 seconds')), SCAN_TIMEOUT_MS)
    );

    // Race the AI call against the timeout
    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: file.type,
            },
          },
        ],
      }),
      timeoutPromise,
    ]);

    const rawText = response.text ?? '';
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let aiResult: AIResult;
    try {
      aiResult = JSON.parse(cleanedText || '{}') as AIResult;
    } catch {
      // If AI returns malformed JSON, return a structured error
      return NextResponse.json({
        match_found: false,
        matched_sku: null,
        confidence: 0,
        reasoning: 'AI returned an unparseable response. Please try again with a clearer image.',
        low_light: false,
      } as AIResult);
    }

    // Validate confidence threshold — below 85% triggers manual review
    if (aiResult.match_found && aiResult.matched_sku) {
      if (aiResult.confidence < 85) {
        // Low confidence: flag for manual review but still return the match
        const matchedProduct = productList.find((product) => product.sku === aiResult.matched_sku);
        if (matchedProduct) {
          aiResult.product_details = matchedProduct;
          aiResult.reasoning = `Low confidence match (${aiResult.confidence}%). Manual review recommended. ${aiResult.reasoning}`;
        } else {
          aiResult.match_found = false;
          aiResult.reasoning = 'AI hallucinated a SKU not in the catalog.';
        }
      } else {
        const matchedProduct = productList.find((product) => product.sku === aiResult.matched_sku);
        if (matchedProduct) {
          aiResult.product_details = matchedProduct;
        } else {
          aiResult.match_found = false;
          aiResult.reasoning = 'AI hallucinated a SKU not in the catalog.';
        }
      }
    }

    return NextResponse.json(aiResult);
  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.message.includes('timed out');
    console.error('Vision Pipeline Error:', isTimeout ? 'TIMEOUT' : error);

    if (isTimeout) {
      return NextResponse.json({
        match_found: false,
        matched_sku: null,
        confidence: 0,
        reasoning: 'The scan timed out due to poor network conditions. Please try again in a location with better connectivity.',
        timeout: true,
        low_light: false,
      } as AIResult);
    }

    const message = error instanceof Error ? error.message : 'Failed to process image';
    return NextResponse.json({
      match_found: false,
      matched_sku: null,
      confidence: 0,
      reasoning: message,
      error: message,
      low_light: false,
    } as AIResult);
  }
}