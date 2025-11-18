import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AskCard } from './AskCard';
import { AskCardSkeleton } from './AskCardSkeleton';
import { CreateAskModal } from './CreateAskModal';
import { ProfileSidebar } from './ProfileSidebar';
import { ContactCard } from './ContactCard';
import { LogOut, Plus } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import type { ContactReveal } from '@/types/auction';

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
  auctionEndTime?: string;
  auctionStatus?: 'active' | 'completed' | 'expired';
  createdAt: string;
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
  const [isCreatingAsk, setIsCreatingAsk] = useState(false);
  const [contactReveals, setContactReveals] = useState<ContactReveal[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Fetch asks with their bids
  const fetchAsks = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

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
        auctionEndTime: ask.auction_end_time,
        auctionStatus: ask.auction_status as 'active' | 'completed' | 'expired' | undefined,
        createdAt: ask.created_at,
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

  // Fetch contact reveals for soloists
  const fetchContactReveals = async () => {
    if (userType !== 'soloist') return;

    try {
      setIsLoadingContacts(true);
      const { data, error } = await supabase
        .from('contact_reveals')
        .select('*')
        .eq('soloist_id', userId)
        .order('revealed_at', { ascending: false });

      if (error) throw error;
      setContactReveals(data || []);
    } catch (error) {
      console.error('Error fetching contact reveals:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchAsks(true); // Show loading on initial fetch
    if (userType === 'soloist') {
      fetchContactReveals();
    }

    // Subscribe to real-time changes
    const asksSubscription = supabase
      .channel('asks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asks' }, () => {
        fetchAsks(); // Don't show loading on real-time updates
        setIsCreatingAsk(false); // Clear creating state when new ask appears
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        fetchAsks(); // Don't show loading on real-time updates
        if (userType === 'soloist') {
          fetchContactReveals();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_reveals' }, () => {
        if (userType === 'soloist') {
          fetchContactReveals();
        }
      })
      .subscribe();

    return () => {
      asksSubscription.unsubscribe();
    };
  }, [userType]);

  const handleCreateAsk = async (newAsk: Omit<Ask, 'id' | 'bids'>) => {
    try {
      setIsCreatingAsk(true); // Show creating state
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Creating ask with data:', newAsk); // Debug log

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
        description: newAsk.description,
        auction_end_time: newAsk.auctionEndTime,
        auction_status: newAsk.auctionStatus || 'active'
      });

      if (error) {
        console.error('Supabase error details:', error); // More detailed error
        setIsCreatingAsk(false); // Clear creating state on error
        throw error;
      }

      setIsCreateModalOpen(false);
      // The real-time subscription will update the UI and clear isCreatingAsk
    } catch (error) {
      console.error('Error creating ask:', error);
      setIsCreatingAsk(false); // Clear creating state on error
      alert(`Failed to create ask: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    }
  };

  const handlePlaceBid = async (askId: string, bid: Omit<Bid, 'id' | 'status'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the ask to check auction end time
      const ask = asks.find(a => a.id === askId);
      if (!ask || !ask.auctionEndTime) {
        throw new Error('Ask not found or has no auction end time');
      }

      // Check if we're in the last minute of the auction
      const now = new Date();
      const endTime = new Date(ask.auctionEndTime);
      const timeLeft = endTime.getTime() - now.getTime();
      const isLastMinute = timeLeft > 0 && timeLeft < 60 * 1000; // Less than 60 seconds

      // Insert the bid
      const { error: bidError } = await supabase.from('bids').insert({
        ask_id: askId,
        user_id: user.id,
        pianist_name: bid.pianistName,
        amount: bid.amount,
        message: bid.message,
        status: 'pending'
      });

      if (bidError) throw bidError;

      // If bid placed in last minute, extend auction by 1 minute
      if (isLastMinute) {
        const newEndTime = new Date(endTime.getTime() + 60 * 1000); // Add 1 minute
        const { error: updateError } = await supabase
          .from('asks')
          .update({ auction_end_time: newEndTime.toISOString() })
          .eq('id', askId);

        if (updateError) throw updateError;
      }

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
      const updatePromises = ask.bids.map(async bid => {
        const newStatus = bid.id === bidId ? 'accepted' : 'rejected';
        const { data, error } = await supabase
          .from('bids')
          .update({ status: newStatus })
          .eq('id', bid.id)
          .select();

        if (error) {
          console.error(`Error updating bid ${bid.id}:`, error);
          throw error;
        }
        return data;
      });

      await Promise.all(updatePromises);
      console.log('All bids updated successfully');
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
            {userType === 'soloist' && <TabsTrigger value="my-contacts">My Contacts</TabsTrigger>}
            {userType === 'pianist' && <TabsTrigger value="my-bids">My Bids</TabsTrigger>}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading asks...</p>
              </div>
            ) : (
              <>
                {/* Show skeleton card when creating a new ask */}
                {isCreatingAsk && <AskCardSkeleton />}

                {asks.length > 0 ? (
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
                ) : !isCreatingAsk ? (
                  <div className="text-center py-12 text-gray-500">
                    No asks available yet. {userType === 'soloist' && 'Create your first ask to get started!'}
                  </div>
                ) : null}
              </>
            )}
          </TabsContent>

          {userType === 'soloist' && (
            <>
              <TabsContent value="my-asks" className="space-y-4">
                {/* Show skeleton card when creating a new ask */}
                {isCreatingAsk && <AskCardSkeleton />}

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
                ) : !isCreatingAsk ? (
                  <div className="text-center py-12 text-gray-500">
                    No asks posted yet. Create your first ask to get started!
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="my-contacts" className="space-y-4">
                {isLoadingContacts ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading contacts...</p>
                  </div>
                ) : contactReveals.length > 0 ? (
                  contactReveals.map(contact => {
                    // Find the corresponding ask for this contact
                    const ask = asks.find(a => a.id === contact.ask_id);
                    const bid = ask?.bids.find(b => b.id === contact.bid_id);

                    return (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        askDetails={ask ? {
                          instrument: ask.instrument,
                          pieces: ask.pieces,
                          dateType: ask.dateType,
                          date: ask.date,
                          startDate: ask.startDate,
                          endDate: ask.endDate,
                          semester: ask.semester,
                        } : undefined}
                        bidAmount={bid?.amount}
                      />
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No accepted bids yet. When you accept a bid, pianist contact information will appear here.
                  </div>
                )}
              </TabsContent>
            </>
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