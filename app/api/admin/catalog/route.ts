import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CatalogRecord = {
  sku: string;
  name: string;
  base_price: number;
};

type CatalogPayloadItem = {
  sku?: string;
  name?: string;
  base_price?: number;
  price?: number;
};

function parseCsvLine(line: string): string[] {
  const entries: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      entries.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  entries.push(current.trim());
  return entries;
}

function parseCsvCatalog(text: string): CatalogRecord[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    return [];
  }

  const headers = parseCsvLine(rows[0]).map((header) => header.toLowerCase());
  const records = rows.slice(1).map((row) => {
    const values = parseCsvLine(row);
    const item = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));

    return {
      sku: String(item.sku ?? item.id ?? '').trim(),
      name: String(item.name ?? item.product_name ?? '').trim(),
      base_price: Number(item.base_price ?? item.price ?? item.cost ?? 0),
    };
  });

  return records.filter((record) => record.sku && record.name);
}

function normalizePayload(payload: unknown): CatalogRecord[] {
  if (Array.isArray(payload)) {
    return (payload as CatalogPayloadItem[])
      .map((item) => ({
        sku: String(item.sku ?? '').trim(),
        name: String(item.name ?? '').trim(),
        base_price: Number(item.base_price ?? item.price ?? 0),
      }))
      .filter((item) => item.sku && item.name);
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return normalizePayload(record.items);
    }
    if (Array.isArray(record.catalog)) {
      return normalizePayload(record.catalog);
    }
  }

  return [];
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore write failures during prerender or server context issues.
          }
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sku, name, base_price')
      .order('name', { ascending: true });

    if (productsError) {
      throw productsError;
    }

    return NextResponse.json({ catalog: (products ?? []).map((product) => ({
      sku: product.sku,
      name: product.name,
      base_price: product.base_price,
    })) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load catalog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore write failures during prerender or server context issues.
          }
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let catalog: CatalogRecord[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.text();
      try {
        const parsed = JSON.parse(body);
        catalog = normalizePayload(parsed);
      } catch {
        catalog = [];
      }
    } else {
      const body = await request.text();
      catalog = parseCsvCatalog(body);
    }

    if (catalog.length === 0) {
      return NextResponse.json({ error: 'No catalog rows were provided' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('products')
      .upsert(catalog, { onConflict: 'sku', ignoreDuplicates: false })
      .select('sku');

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, imported: catalog.length, rows: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import catalog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
