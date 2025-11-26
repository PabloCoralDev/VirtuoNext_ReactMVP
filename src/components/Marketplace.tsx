import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AskCard } from './AskCard';
import { AskCardSkeleton } from './AskCardSkeleton';
import { CreateAskModal } from './CreateAskModal';
import { ProfileSidebar } from './ProfileSidebar';
import { ContactCard } from './ContactCard';
import { LogOut, Plus, Search, TrendingUp, Users, Music, Menu, X } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import type { ContactReveal } from '@/types/auction';
import virtuoNextLogo from '../ui_elements/VirtuoNext Logo.png';

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
  costType: 'hourly' | 'per-piece' | 'total';
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
  archivedAt?: string;
  createdAt: string;
  bids: Bid[];
}

export interface Bid {
  id: string;
  pianistName: string;
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export function Marketplace({ userId, userType, userName, userEmail, onLogout, onEditProfile }: MarketplaceProps) {
  const [asks, setAsks] = useState<Ask[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAsk, setIsCreatingAsk] = useState(false);
  const [contactReveals, setContactReveals] = useState<ContactReveal[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
        costType: ask.cost_type as 'hourly' | 'per-piece' | 'total',
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
        archivedAt: ask.archived_at,
        createdAt: ask.created_at,
        bids: (bidsData || [])
          .filter(bid => bid.ask_id === ask.id)
          .map(bid => ({
            id: bid.id,
            pianistName: bid.pianist_name,
            amount: bid.amount,
            message: bid.message,
            status: bid.status as 'pending' | 'accepted' | 'rejected',
            createdAt: bid.created_at
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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Body scroll lock when mobile sidebar is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

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
      // Manually refetch to update UI immediately
      await fetchAsks();
      setIsCreatingAsk(false);
    } catch (error) {
      console.error('Error creating ask:', error);
      setIsCreatingAsk(false); // Clear creating state on error
      alert(`Failed to create ask: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    }
  };

  const handlePlaceBid = async (askId: string, bid: Omit<Bid, 'id' | 'status' | 'createdAt'>) => {
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

      // Manually refetch to update UI immediately
      await fetchAsks();
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

      // Manually refetch to update UI immediately
      await fetchAsks();
      if (userType === 'soloist') {
        await fetchContactReveals();
      }
    } catch (error) {
      console.error('Error accepting bid:', error);
      alert('Failed to accept bid. Please try again.');
    }
  };

  const handleArchiveAsk = async (askId: string) => {
    try {
      const { error } = await supabase
        .from('asks')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', askId);

      if (error) throw error;

      // Manually refetch to update UI immediately
      await fetchAsks();
    } catch (error) {
      console.error('Error archiving ask:', error);
      alert('Failed to delete ask. Please try again.');
    }
  };

  // Filter for different views
  const activeAsks = asks.filter(ask => !ask.archivedAt); // Only non-archived for "All" view
  const myAsks = asks.filter(ask => ask.soloistName === userName); // All asks (including archived) for Activity
  const myBids = asks.filter(ask =>
    ask.bids.some(bid => bid.pianistName === userName) // All asks with user's bids (including archived)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Brand */}
            <button
              onClick={() => setActiveTab('all')}
              className="flex items-center gap-2 sm:gap-3 group"
            >
              <img
                src={virtuoNextLogo}
                alt="VirtuoNext"
                className="h-8 w-8 sm:h-10 sm:w-10 transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col items-start -mt-1">
                <span className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 group-hover:from-amber-400 group-hover:via-amber-500 group-hover:to-red-500 transition-all leading-none">
                  VirtuoNext
                </span>
                <span className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                  Welcome, {userName.split(' ')[0]} ({userType === 'soloist' ? 'Soloist' : 'Pianist'})
                </span>
              </div>
            </button>

            {/* Right: Navigation, Post Ask Button & Logout */}
            <div className="flex items-center gap-4">
              {/* LinkedIn-style Navigation */}
              <nav className="flex gap-3">
                {/* Asks/Bids */}
                <button
                  onClick={() => setActiveTab('all')}
                  style={
                    activeTab === 'all'
                      ? { background: '#fe440a' }
                      : {}
                  }
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'all'
                      ? 'text-white shadow-lg'
                      : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
                  }`}
                >
                  <Search className="size-5" />
                  <span className="text-xs font-semibold">
                    {userType === 'soloist' ? 'Asks' : 'Bids'}
                  </span>
                </button>

                {/* Activity (My Asks/My Bids) */}
                <button
                  onClick={() => setActiveTab(userType === 'soloist' ? 'my-asks' : 'my-bids')}
                  style={
                    activeTab === 'my-asks' || activeTab === 'my-bids'
                      ? { background: '#fe440a' }
                      : {}
                  }
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'my-asks' || activeTab === 'my-bids'
                      ? 'text-white shadow-lg'
                      : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp className="size-5" />
                  <span className="text-xs font-semibold">Activity</span>
                </button>

                {/* Contacts (Soloists only) */}
                {userType === 'soloist' && (
                  <button
                    onClick={() => setActiveTab('my-contacts')}
                    style={
                      activeTab === 'my-contacts'
                        ? { background: '#fe440a' }
                        : {}
                    }
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                      activeTab === 'my-contacts'
                        ? 'text-white shadow-lg'
                        : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
                    }`}
                  >
                    <Users className="size-5" />
                    <span className="text-xs font-semibold">Contacts</span>
                  </button>
                )}
              </nav>

              {/* Post Ask Button - Hidden on mobile */}
              {userType === 'soloist' && !isMobile && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="!bg-black hover:!bg-gray-800 !text-white !border-0 font-semibold shadow-lg"
                  size="sm"
                >
                  <Plus className="size-4 mr-2" />
                  Post Ask
                </Button>
              )}

              {/* Logout Icon */}
              <button
                onClick={onLogout}
                className="p-2.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-all"
                title="Logout"
              >
                <LogOut className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="absolute inset-y-0 right-0 w-72 bg-white shadow-xl flex flex-col">
            {/* Close Button */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <ProfileSidebar
                userId={userId}
                userEmail={userEmail}
                userName={userName}
                userType={userType}
                onEditProfile={onEditProfile}
                isMobileOverlay={true}
              />
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t bg-gray-50 space-y-2">
              {/* Post Ask Button (Soloists only) */}
              {userType === 'soloist' && (
                <Button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full !bg-black hover:!bg-gray-800 !text-white !border-0"
                  size="sm"
                >
                  <Plus className="size-4 mr-2" />
                  Post Ask
                </Button>
              )}
              {/* Logout Button */}
              <Button
                onClick={onLogout}
                className="w-full !bg-red-600 hover:!bg-red-700 !text-white !border-0"
                size="sm"
              >
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Sticky - Hidden on mobile */}
          {!isMobile && (
            <ProfileSidebar
              userId={userId}
              userEmail={userEmail}
              userName={userName}
              userType={userType}
              onEditProfile={onEditProfile}
              onLogout={onLogout}
            />
          )}

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* All Asks/Bids Tab */}
          {activeTab === 'all' && (
            <div className="space-y-4">
            {/* Post Ask Button Card (Mobile only, Soloists only) */}
            {isMobile && userType === 'soloist' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{ background: '#000000', height: '56px' }}
                className="w-full text-white rounded-lg px-4 flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-90"
              >
                <Plus className="size-5" />
                <span className="font-semibold">Post New Ask</span>
              </button>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading asks...</p>
              </div>
            ) : (
              <>
                {/* Show skeleton card when creating a new ask */}
                {isCreatingAsk && <AskCardSkeleton />}

                {activeAsks.length > 0 ? (
                  activeAsks.map(ask => (
                    <AskCard
                      key={ask.id}
                      ask={ask}
                      userType={userType}
                      userName={userName}
                      onPlaceBid={handlePlaceBid}
                      onAcceptBid={handleAcceptBid}
                      onArchiveAsk={handleArchiveAsk}
                    />
                  ))
                ) : !isCreatingAsk ? (
                  <div className="text-center py-12 text-gray-500">
                    No asks available yet. {userType === 'soloist' && 'Create your first ask to get started!'}
                  </div>
                ) : null}
              </>
            )}
            </div>
          )}

          {/* My Asks Tab (Soloist only) */}
          {activeTab === 'my-asks' && userType === 'soloist' && (
            <div className="space-y-4">
                {/* Post Ask Button Card (Mobile only) */}
                {isMobile && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{ background: '#000000', height: '56px' }}
                    className="w-full text-white rounded-lg px-4 flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-90"
                  >
                    <Plus className="size-5" />
                    <span className="font-semibold">Post New Ask</span>
                  </button>
                )}

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
                      onArchiveAsk={handleArchiveAsk}
                      isActivityView={true}
                    />
                  ))
                ) : !isCreatingAsk ? (
                  <div className="text-center py-12 text-gray-500">
                    No asks posted yet. Create your first ask to get started!
                  </div>
                ) : null}
            </div>
          )}

          {/* My Contacts Tab (Soloist only) */}
          {activeTab === 'my-contacts' && userType === 'soloist' && (
            <div className="space-y-4">
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
            </div>
          )}

          {/* My Bids Tab (Pianist only) */}
          {activeTab === 'my-bids' && userType === 'pianist' && (
            <div className="space-y-4">
              {myBids.length > 0 ? (
                myBids.map(ask => (
                  <AskCard
                    key={ask.id}
                    ask={ask}
                    userType={userType}
                    userName={userName}
                    onPlaceBid={handlePlaceBid}
                    onAcceptBid={handleAcceptBid}
                    onArchiveAsk={handleArchiveAsk}
                    isActivityView={true}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  You haven't placed any bids yet. Browse asks and place your first bid!
                </div>
              )}
            </div>
          )}

            <CreateAskModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onSubmit={handleCreateAsk}
              userName={userName}
            />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="flex items-center justify-around py-4 px-4">
            {/* Asks/Bids */}
            <button
              onClick={() => setActiveTab('all')}
              style={
                activeTab === 'all'
                  ? { background: '#fe440a' }
                  : {}
              }
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'text-white shadow-lg'
                  : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
              }`}
            >
              <Search className="size-5" />
              <span className="text-xs font-semibold">
                {userType === 'soloist' ? 'Asks' : 'Bids'}
              </span>
            </button>

            {/* Activity */}
            <button
              onClick={() => setActiveTab(userType === 'soloist' ? 'my-asks' : 'my-bids')}
              style={
                activeTab === 'my-asks' || activeTab === 'my-bids'
                  ? { background: '#fe440a' }
                  : {}
              }
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'my-asks' || activeTab === 'my-bids'
                  ? 'text-white shadow-lg'
                  : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="size-5" />
              <span className="text-xs font-semibold">Activity</span>
            </button>

            {/* Contacts (Soloists only) */}
            {userType === 'soloist' && (
              <button
                onClick={() => setActiveTab('my-contacts')}
                style={
                  activeTab === 'my-contacts'
                    ? { background: '#fe440a' }
                    : {}
                }
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'my-contacts'
                    ? 'text-white shadow-lg'
                    : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
                }`}
              >
                <Users className="size-5" />
                <span className="text-xs font-semibold">Contacts</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}