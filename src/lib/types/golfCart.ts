export type GolfCartStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service';

export interface GolfCartFleetRow {
  id: string;
  cart_number: string;
  model: string;
  status: GolfCartStatus;
  battery_level: number;
  odometer_miles: number;
  location: string;
  assigned_to: string | null;
  last_service_at: string | null;
  next_service_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type GolfCartFleetInsert = Omit<GolfCartFleetRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type GolfCartFleetUpdate = Partial<Omit<GolfCartFleetRow, 'id' | 'created_at'>>;
