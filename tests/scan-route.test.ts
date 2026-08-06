import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set required env vars before importing the route
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';

// Mock Supabase before importing the route
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockNeq = vi.fn();

// The route calls: from('products').select('*').neq('status', 'archived')
mockFrom.mockReturnValue({ select: mockSelect });
mockSelect.mockReturnValue({ neq: mockNeq });
mockNeq.mockResolvedValue({
  data: [
    { sku: 'GB-12', name: 'Golf Balls (Pack of 12)', base_price: 29.99 },
    { sku: 'TEE-01', name: 'Pro Tees', base_price: 5.99 },
  ],
  error: null,
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock Google GenAI
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function MockGoogleGenAI(this: Record<string, unknown>) {
    this.models = {
      generateContent: mockGenerateContent,
    };
    return this;
  }),
}));

// Import the route after mocks are set up
import { POST } from '@/app/api/scan/route';

function createMockRequest(imageData?: string, contentType = 'image/png') {
  const formData = new FormData();
  const bytes = Uint8Array.from(
    imageData ? Array.from(imageData).map((c) => c.charCodeAt(0)) : [1, 2, 3, 4, 5]
  );
  const file = new File([bytes], 'scan.png', { type: contentType });
  formData.append('image', file);
  return new Request('http://localhost/api/scan', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ neq: mockNeq });
    mockNeq.mockResolvedValue({
      data: [
        { sku: 'GB-12', name: 'Golf Balls (Pack of 12)', base_price: 29.99 },
        { sku: 'TEE-01', name: 'Pro Tees', base_price: 5.99 },
      ],
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 400 when no image is provided', async () => {
    const formData = new FormData();
    const request = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('No image provided');
  });

  it('returns 400 for unsupported image types', async () => {
    const request = createMockRequest('test', 'image/gif');
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Unsupported image format');
  });

  it('returns 400 for files larger than 10MB', async () => {
    // Create a fake large file directly in formData
    const formData = new FormData();
    const largeBytes = new Uint8Array(11 * 1024 * 1024); // 11MB
    const file = new File([largeBytes], 'large.png', { type: 'image/png' });
    formData.append('image', file);

    const request = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Image too large');
  });

  it('returns a successful match when AI finds a high-confidence match', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        match_found: true,
        matched_sku: 'GB-12',
        confidence: 95,
        reasoning: 'Clear match on the golf ball packaging.',
        low_light: false,
      }),
    });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.match_found).toBe(true);
    expect(body.matched_sku).toBe('GB-12');
    expect(body.confidence).toBe(95);
    expect(body.product_details).toEqual({
      sku: 'GB-12',
      name: 'Golf Balls (Pack of 12)',
      base_price: 29.99,
    });
  });

  it('triggers manual review flag for confidence below 85%', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        match_found: true,
        matched_sku: 'GB-12',
        confidence: 70,
        reasoning: 'Possible match but packaging is unclear.',
        low_light: false,
      }),
    });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.match_found).toBe(true);
    expect(body.confidence).toBe(70);
    expect(body.reasoning).toContain('Low confidence match');
    expect(body.product_details).toEqual({
      sku: 'GB-12',
      name: 'Golf Balls (Pack of 12)',
      base_price: 29.99,
    });
  });

  it('handles AI hallucinating a SKU not in the catalog', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        match_found: true,
        matched_sku: 'FAKE-SKU',
        confidence: 92,
        reasoning: 'Matched to a product.',
        low_light: false,
      }),
    });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.match_found).toBe(false);
    expect(body.reasoning).toBe('AI hallucinated a SKU not in the catalog.');
  });

  it('returns no match when AI does not find a match', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        match_found: false,
        matched_sku: null,
        confidence: 0,
        reasoning: 'No catalog item matches the image.',
        low_light: false,
      }),
    });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.match_found).toBe(false);
    expect(body.matched_sku).toBeNull();
    expect(body.reasoning).toBe('No catalog item matches the image.');
  });

  it('returns low_light flag for poorly lit images', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        match_found: false,
        matched_sku: null,
        confidence: 0,
        reasoning: 'Image is too dark to identify the product.',
        low_light: true,
      }),
    });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.low_light).toBe(true);
    expect(body.match_found).toBe(false);
  });

  it('handles malformed JSON from the AI', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'This is not JSON at all',
    });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.match_found).toBe(false);
    expect(body.reasoning).toContain('unparseable');
  });

  it('returns a timeout error when AI takes too long', async () => {
    // Simulate the route's 15s timeout being exceeded by having
    // generateContent reject with a timeout-style error.
    // The route's catch block checks for "timed out" in the message.
    mockGenerateContent.mockRejectedValue(
      new Error('AI scan timed out after 15 seconds')
    );

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.timeout).toBe(true);
    expect(body.reasoning).toContain('timed out');
  });
});