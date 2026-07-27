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
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: products, error: dbError } = await supabase.from('products').select('*');
    if (dbError) throw dbError;

    const productList = (products ?? []) as ProductRecord[];
    const catalogContext = productList.map((product) => 
      `SKU: ${product.sku} | Name: ${product.name} | Price: $${product.base_price}`
    ).join('\n');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    const prompt = `You are a B2B product identification AI.
    Review the uploaded image.
    Here is our current catalog:
    ${catalogContext}
    
    Determine if the item in the image matches exactly with any item in the catalog.
    Return ONLY a JSON object with these exact keys:
    "match_found": boolean,
    "matched_sku": string or null,
    "confidence": number 0-100,
    "reasoning": string explaining the match or why it failed.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: file.type
          }
        }
      ]
    });

    const rawText = response.text ?? "";
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiResult = JSON.parse(cleanedText || '{}') as AIResult;

    if (aiResult.match_found && aiResult.matched_sku) {
      const matchedProduct = productList.find((product) => product.sku === aiResult.matched_sku);
      if (matchedProduct) {
        aiResult.product_details = matchedProduct;
      } else {
        aiResult.match_found = false;
        aiResult.reasoning = "AI hallucinated a SKU not in the catalog.";
      }
    }

    return NextResponse.json(aiResult);

  } catch (error: unknown) {
    console.error("Vision Pipeline Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}