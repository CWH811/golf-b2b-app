import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set required env vars before importing the route
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock next/headers cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
    get: () => undefined,
  })),
}));

// Mock Supabase SSR
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Import the route after mocks are set up
import { POST } from '@/app/api/order/route';

function createOrderRequest(items: unknown) {
  return new Request('http://localhost/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}

describe('POST /api/order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth error' },
    });

    const request = createOrderRequest([
      { sku: 'GB-12', quantity: 1, price: 29.99 },
    ]);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized. Please log in.');
  });

  it('returns 401 when getUser returns an error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Session expired' },
    });

    const response = await POST(createOrderRequest([]));
    const body = await response.json();

    expect(response.status).toBe(401);
  });

  it('returns 400 when the cart is empty', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const response = await POST(createOrderRequest([]));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Cart is empty');
  });

  it('returns 400 when items is undefined', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const request = new Request('http://localhost/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Cart is empty');
  });

  it('creates an order with items for an authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Mock the orders table chain: from('orders').insert().select().single()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'order-abc' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockOrdersInsert = vi.fn().mockReturnValue({ select: mockSelect });

    // Mock the order_items table chain: from('order_items').insert()
    const mockOrderItemsInsert = vi.fn().mockResolvedValue({ error: null });

    // from() returns different objects based on the table name
    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') {
        return { insert: mockOrdersInsert };
      }
      if (table === 'order_items') {
        return { insert: mockOrderItemsInsert };
      }
      return {};
    });

    const request = createOrderRequest([
      { sku: 'GB-12', quantity: 2, price: 29.99 },
    ]);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.orderId).toBe('order-abc');

    // Verify the order was created with the correct user_id and status
    // The route inserts an array of records
    expect(mockOrdersInsert).toHaveBeenCalledWith([
      {
        user_id: 'user-123',
        status: 'pending',
      },
    ]);

    // Verify order items were inserted with the correct payload
    expect(mockOrderItemsInsert).toHaveBeenCalledWith([
      {
        order_id: 'order-abc',
        sku: 'GB-12',
        quantity: 2,
        price_at_purchase: 29.99,
      },
    ]);
  });
});