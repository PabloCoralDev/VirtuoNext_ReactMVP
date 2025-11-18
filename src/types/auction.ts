export interface Ask {
  id: string;
  user_id: string;
  soloist_name: string;
  instrument: string;
  pieces: string[];
  duration?: string;
  cost_type: 'hourly' | 'per-piece';
  cost: number;
  location: string;
  date_type: 'single' | 'range' | 'semester';
  date?: string;
  start_date?: string;
  end_date?: string;
  semester?: string;
  description: string;
  created_at: string;
  auction_end_time?: string;
  auction_status?: 'active' | 'completed' | 'expired';
}

export interface Bid {
  id: string;
  ask_id: string;
  user_id: string;
  pianist_name: string;
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  bid_time: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  user_type: 'soloist' | 'pianist';
  bio?: string;
  picture_url?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactReveal {
  id: string;
  ask_id: string;
  bid_id: string;
  soloist_id: string;
  pianist_id: string;
  pianist_email: string;
  pianist_phone?: string;
  pianist_name: string;
  revealed_at: string;
}

export interface AuctionTimer {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isLastDay: boolean;
}
