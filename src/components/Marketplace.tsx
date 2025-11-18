import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AskCard } from './AskCard';
import { CreateAskModal } from './CreateAskModal';
import { ProfileSidebar } from './ProfileSidebar';
import { LogOut, Plus } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface MarketplaceProps {
  userId: string;
  userType: 'soloist' | 'pianist';
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onEditProfile: () => void;
}

export interface Ask {
  id: string;
  soloistName: string;
  instrument: string;
  pieces: string[];
  duration?: string;
  costType: 'hourly' | 'per-piece';
  cost: number;
  location: string;
  dateType: 'single' | 'range' | 'semester';
  date?: string;
  startDate?: string;
  endDate?: string;
  semester?: string;
  description: string;
  bids: Bid[];
}

export interface Bid {
  id: string;
  pianistName: string;
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export function Marketplace({ userId, userType, userName, userEmail, onLogout, onEditProfile }: MarketplaceProps) {
  const [asks, setAsks] = useState<Ask[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch asks with their bids
  const fetchAsks = async () => {
    try {
      setIsLoading(true);

      // Fetch all asks
      const { data: asksData, error: asksError } = await supabase
        .from('asks')
        .select('*')
        .order('created_at', { ascending: false });

      if (asksError) throw asksError;

      // Fetch all bids
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .order('created_at', { ascending: true });

      if (bidsError) throw bidsError;

      // Combine asks with their bids
      const asksWithBids: Ask[] = (asksData || []).map(ask => ({
        id: ask.id,
        soloistName: ask.soloist_name,
        instrument: ask.instrument,
        pieces: ask.pieces || [],
        duration: ask.duration,
        costType: ask.cost_type as 'hourly' | 'per-piece',
        cost: ask.cost,
        location: ask.location,
        dateType: ask.date_type as 'single' | 'range' | 'semester',
        date: ask.date,
        startDate: ask.start_date,
        endDate: ask.end_date,
        semester: ask.semester,
        description: ask.description,
        bids: (bidsData || [])
          .filter(bid => bid.ask_id === ask.id)
          .map(bid => ({
            id: bid.id,
            pianistName: bid.pianist_name,
            amount: bid.amount,
            message: bid.message,
            status: bid.status as 'pending' | 'accepted' | 'rejected'
          }))
      }));

      setAsks(asksWithBids);
    } catch (error) {
      console.error('Error fetching asks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAsks();

    // Subscribe to real-time changes
    const asksSubscription = supabase
      .channel('asks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asks' }, () => {
        fetchAsks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        fetchAsks();
      })
      .subscribe();

    return () => {
      asksSubscription.unsubscribe();
    };
  }, []);

  const handleCreateAsk = async (newAsk: Omit<Ask, 'id' | 'bids'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('asks').insert({
        user_id: user.id,
        soloist_name: newAsk.soloistName,
        instrument: newAsk.instrument,
        pieces: newAsk.pieces,
        duration: newAsk.duration,
        cost_type: newAsk.costType,
        cost: newAsk.cost,
        location: newAsk.location,
        date_type: newAsk.dateType,
        date: newAsk.date,
        start_date: newAsk.startDate,
        end_date: newAsk.endDate,
        semester: newAsk.semester,
        description: newAsk.description
      });

      if (error) throw error;

      setIsCreateModalOpen(false);
      // The real-time subscription will update the UI
    } catch (error) {
      console.error('Error creating ask:', error);
      alert('Failed to create ask. Please try again.');
    }
  };

  const handlePlaceBid = async (askId: string, bid: Omit<Bid, 'id' | 'status'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('bids').insert({
        ask_id: askId,
        user_id: user.id,
        pianist_name: bid.pianistName,
        amount: bid.amount,
        message: bid.message,
        status: 'pending'
      });

      if (error) throw error;
      // The real-time subscription will update the UI
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Failed to place bid. Please try again.');
    }
  };

  const handleAcceptBid = async (askId: string, bidId: string) => {
    try {
      // Get all bids for this ask
      const ask = asks.find(a => a.id === askId);
      if (!ask) return;

      // Update all bids: accept the selected one, reject all others
      const updates = ask.bids.map(bid => {
        const newStatus = bid.id === bidId ? 'accepted' : 'rejected';
        return supabase
          .from('bids')
          .update({ status: newStatus })
          .eq('id', bid.id);
      });

      await Promise.all(updates);
      // The real-time subscription will update the UI
    } catch (error) {
      console.error('Error accepting bid:', error);
      alert('Failed to accept bid. Please try again.');
    }
  };

  const myAsks = asks.filter(ask => ask.soloistName === userName);
  const myBids = asks.filter(ask => 
    ask.bids.some(bid => bid.pianistName === userName)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl">VirtuoNext</h1>
            <p className="text-sm text-gray-600">
              Welcome, {userName} ({userType})
            </p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="size-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Sticky */}
          <ProfileSidebar
            userId={userId}
            userEmail={userEmail}
            userName={userName}
            userType={userType}
            onEditProfile={onEditProfile}
          />

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl">Marketplace</h2>
                <p className="text-gray-600">Browse opportunities and place bids</p>
              </div>
              {userType === 'soloist' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="size-4 mr-2" />
                  Post Ask
                </Button>
              )}
            </div>

            <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Asks</TabsTrigger>
            {userType === 'soloist' && <TabsTrigger value="my-asks">My Asks</TabsTrigger>}
            {userType === 'pianist' && <TabsTrigger value="my-bids">My Bids</TabsTrigger>}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading asks...</p>
              </div>
            ) : asks.length > 0 ? (
              asks.map(ask => (
                <AskCard
                  key={ask.id}
                  ask={ask}
                  userType={userType}
                  userName={userName}
                  onPlaceBid={handlePlaceBid}
                  onAcceptBid={handleAcceptBid}
                />
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                No asks available yet. {userType === 'soloist' && 'Create your first ask to get started!'}
              </div>
            )}
          </TabsContent>

          {userType === 'soloist' && (
            <TabsContent value="my-asks" className="space-y-4">
              {myAsks.length > 0 ? (
                myAsks.map(ask => (
                  <AskCard
                    key={ask.id}
                    ask={ask}
                    userType={userType}
                    userName={userName}
                    onPlaceBid={handlePlaceBid}
                    onAcceptBid={handleAcceptBid}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No asks posted yet. Create your first ask to get started!
                </div>
              )}
            </TabsContent>
          )}

          {userType === 'pianist' && (
            <TabsContent value="my-bids" className="space-y-4">
              {myBids.length > 0 ? (
                myBids.map(ask => (
                  <AskCard
                    key={ask.id}
                    ask={ask}
                    userType={userType}
                    userName={userName}
                    onPlaceBid={handlePlaceBid}
                    onAcceptBid={handleAcceptBid}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  You haven't placed any bids yet. Browse asks and place your first bid!
                </div>
              )}
            </TabsContent>
          )}
            </Tabs>

            <CreateAskModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onSubmit={handleCreateAsk}
              userName={userName}
            />
          </div>
        </div>
      </main>
    </div>
  );
}