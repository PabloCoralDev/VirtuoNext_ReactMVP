import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { BidModal } from './BidModal';
import { AuctionTimer } from './AuctionTimer';
import { AcceptBidDialog } from './AcceptBidDialog';
import { Calendar, MapPin, Music, Clock, DollarSign, ArrowUp } from 'lucide-react';
import type { Ask, Bid } from './Marketplace';

interface AskCardProps { 
  ask: Ask;
  userType: 'soloist' | 'pianist';
  userName: string;
  onPlaceBid: (askId: string, bid: Omit<Bid, 'id' | 'status'| 'createdAt'>) => void;
  onAcceptBid: (askId: string, bidId: string) => void;
  onArchiveAsk: (askId: string) => void;
  isActivityView?: boolean;
}

export function AskCard({ ask, userType, userName, onPlaceBid, onAcceptBid, onArchiveAsk, isActivityView = false }: AskCardProps) {
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [showBids, setShowBids] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<{ id: string; amount: number; pianistName: string } | null>(null);

  const isMyAsk = ask.soloistName === userName;
  const myBids = ask.bids.filter(bid => bid.pianistName === userName);
  const myActiveBid = myBids.find(bid => bid.status === 'pending');
  const hasAcceptedBid = ask.bids.some(bid => bid.status === 'accepted');

  // Check if auction has expired
  const isAuctionExpired = ask.auctionEndTime
    ? new Date(ask.auctionEndTime).getTime() < new Date().getTime()
    : false;

  const isAuctionActive = ask.auctionStatus === 'active' && !isAuctionExpired;

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  // Get time remaining for dialog
  const getTimeRemaining = () => {
    if (!ask.auctionEndTime) return '';

    const now = new Date();
    const end = new Date(ask.auctionEndTime);
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return '';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleSubmitBid = (amount: number, message: string) => {
    onPlaceBid(ask.id, {
      pianistName: userName,
      amount,
      message, 
    });
    setIsBidModalOpen(false);
  };

  const handleAcceptClick = (bidId: string, amount: number, pianistName: string) => {
    setSelectedBid({ id: bidId, amount, pianistName });
    setAcceptDialogOpen(true);
  };

  const handleConfirmAccept = () => {
    if (selectedBid) {
      onAcceptBid(ask.id, selectedBid.id);
      setAcceptDialogOpen(false);
      setSelectedBid(null);
    }
  };

  // Calculate bid statistics
  const pendingBids = ask.bids.filter(bid => bid.status === 'pending');
  const lowestBid = pendingBids.length > 0
    ? Math.min(...pendingBids.map(bid => bid.amount))
    : null;
  const averageBid = pendingBids.length > 0
    ? Math.round(pendingBids.reduce((sum, bid) => sum + bid.amount, 0) / pendingBids.length)
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{ask.soloistName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg">{ask.soloistName}</h3>
                <p className="text-sm text-gray-600">{ask.instrument}</p>
                <p className="text-xs text-gray-500">Posted {getTimeAgo(ask.createdAt)}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={ask.costType === 'hourly' ? 'default' : ask.costType === 'total' ? 'outline' : 'secondary'}>
                {ask.costType === 'hourly' ? 'Hourly' : ask.costType === 'total' ? 'Total Fee' : 'Per Piece'}
              </Badge>
              <div className="mt-1">
                <span className="text-2xl">${ask.cost}</span>
                <span className="text-sm text-gray-600">
                  {ask.costType === 'hourly' ? '/hr' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Auction Timer - only show for active, non-archived auctions in main view */}
          {ask.auctionEndTime && ask.auctionStatus === 'active' && !ask.archivedAt && !isActivityView && (
            <div className="pt-4 mt-3">
              <div className="inline-flex items-center gap-4 rounded-lg px-3 py-2 shadow-md" style={{ backgroundColor: '#AAA9AD' }}>
                <AuctionTimer auctionEndTime={ask.auctionEndTime} />
                {lowestBid !== null && (
                  <div className="flex items-center gap-2 text-white font-bold">
                    <ArrowUp className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} />
                    <span>Bid:</span>
                    <span>${lowestBid}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {ask.archivedAt && (
            <div className="pt-3 border-t">
              <Badge variant="secondary" className="bg-gray-400 text-white">Deleted</Badge>
            </div>
          )}

          {!ask.archivedAt && ask.auctionStatus === 'completed' && (
            <div className="pt-3 border-t">
              <Badge variant="default" className="bg-green-600">Auction Complete</Badge>
            </div>
          )}

          {!ask.archivedAt && (isAuctionExpired || ask.auctionStatus === 'expired') && ask.auctionStatus !== 'completed' && (
            <div className="pt-3 border-t">
              <Badge variant="destructive">Auction Expired</Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-700">{ask.description}</p>

          <div className="flex gap-6">
            {/* Left side - User details */}
            <div className="flex-1 space-y-2 text-sm">
              {ask.pieces.length > 0 && (
                <div className="flex items-start gap-2 text-gray-600">
                  <Music className="size-4 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {ask.pieces.map((piece, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs">
                        {piece}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {ask.duration && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="size-4" />
                  <span>{ask.duration}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="size-4" />
                <span>
                  {ask.dateType === 'single' && ask.date && new Date(ask.date).toLocaleDateString()}
                  {ask.dateType === 'range' && ask.startDate && ask.endDate &&
                    `${new Date(ask.startDate).toLocaleDateString()} - ${new Date(ask.endDate).toLocaleDateString()}`}
                  {ask.dateType === 'semester' && ask.semester}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="size-4" />
                <span>{ask.location}</span>
              </div>
            </div>

            {/* Right side - Bid statistics */}
            {ask.bids.length > 0 && !isActivityView && (
              <div className="w-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Bid Stats</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Total Bids</span>
                    <span className="text-sm font-bold text-gray-900">{ask.bids.length}</span>
                  </div>
                  {lowestBid && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Lowest Bid</span>
                      <span className="text-sm font-bold text-green-600">${lowestBid}</span>
                    </div>
                  )}
                  {averageBid && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Avg. Bid</span>
                      <span className="text-sm font-bold text-amber-600">${averageBid}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {ask.bids.length > 0 && (
            <div className="pt-2 border-t">
              <button
                onClick={() => setShowBids(!showBids)}
                style={{ background: '#fe440a' }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all hover:scale-[1.02] whitespace-nowrap"
              >
                <span>{showBids ? '▼' : '►'}</span>
                <span>{ask.bids.length} bid{ask.bids.length !== 1 ? 's' : ''} placed</span>
              </button>

              {showBids && (
                <div className="mt-3 space-y-2">
                  {[...ask.bids]
                    .map(bid => {
                      // Check if this bid has been superseded by a newer bid from the same pianist
                      const bidsFromSamePianist = ask.bids.filter(b => b.pianistName === bid.pianistName);
                      // Sort by timestamp to find the most recent bid
                      const sortedBids = [...bidsFromSamePianist].sort((a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      );
                      // If this bid is not the most recent from this pianist, it's superseded
                      const newerBidExists = sortedBids.length > 0 && sortedBids[0].id !== bid.id;

                      return { ...bid, newerBidExists };
                    })
                    .sort((a, b) => {
                      // First sort by superseded status (active bids first)
                      if (a.newerBidExists !== b.newerBidExists) {
                        return a.newerBidExists ? 1 : -1;
                      }
                      // Then sort by amount (lowest first - this is a reverse auction)
                      return a.amount - b.amount;
                    })
                    .map(bid => {
                      const newerBidExists = bid.newerBidExists;

                    return (
                      <div
                        key={bid.id}
                        className={`p-3 rounded-lg border ${
                          newerBidExists
                            ? 'bg-gray-100 border-gray-300 opacity-60'
                            : bid.status === 'accepted'
                            ? 'bg-green-50 border-green-200'
                            : bid.status === 'rejected'
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2" style={newerBidExists ? { textDecoration: 'line-through' } : {}}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{bid.pianistName}</span>
                              {bid.status === 'accepted' && (
                                <Badge className="bg-green-600" style={{ textDecoration: 'none' }}>Accepted</Badge>
                              )}
                              {bid.status === 'rejected' && (
                                <Badge variant="secondary" style={{ textDecoration: 'none' }}>Not Selected</Badge>
                              )}
                              {newerBidExists && (
                                <span style={{ textDecoration: 'none' }}>
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                    New Bid Placed
                                  </Badge>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {bid.message}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <DollarSign className="size-4" />
                              <span>{bid.amount}</span>
                            </div>
                          </div>
                        </div>
                        {isMyAsk && bid.status === 'pending' && !hasAcceptedBid && !isActivityView && !newerBidExists && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }} className="mt-2">
                            <button
                              onClick={() => handleAcceptClick(bid.id, bid.amount, bid.pianistName)}
                              style={{ background: '#16a34a' }}
                              className="relative overflow-hidden transition-all duration-300 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] rounded-md h-9 px-6 py-2 inline-flex items-center justify-center text-sm border-0"
                            >
                              {isAuctionActive ? 'Accept & End Auction' : 'Accept Bid'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {userType === 'pianist' && myActiveBid && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Your current bid: ${myActiveBid.amount}</span>
                {myActiveBid.status === 'accepted' && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Accepted
                  </Badge>
                )}
                {myActiveBid.status === 'pending' && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                )}
                {myActiveBid.status === 'rejected' && (
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    Canceled
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {userType === 'pianist' && !isMyAsk && !hasAcceptedBid && !isAuctionExpired && ask.auctionStatus !== 'expired' && ask.auctionStatus !== 'completed' && !isActivityView && (
            <button
              onClick={() => setIsBidModalOpen(true)}
              style={{
                background: '#fe440a'
              }}
              className="relative overflow-hidden transition-all duration-300 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] rounded-md h-9 px-6 py-2 inline-flex items-center justify-center text-sm border-0"
            >
              {myActiveBid ? 'Submit Another Bid' : 'Place Bid'}
            </button>
          )}
          {(isAuctionExpired || ask.auctionStatus === 'expired') && !hasAcceptedBid && ask.auctionStatus !== 'completed' && !isMyAsk && !isActivityView && (
            <div className="w-full text-center text-sm text-gray-600">
              Bidding has ended
            </div>
          )}
          {hasAcceptedBid && !isMyAsk && !myActiveBid && !isActivityView && (
            <div className="w-full text-center text-sm text-gray-600">
              This opportunity has been filled
            </div>
          )}
          {userType === 'soloist' && isMyAsk && !ask.archivedAt && hasAcceptedBid && ask.auctionStatus === 'completed' && !isActivityView && (
            <Button
              onClick={() => onArchiveAsk(ask.id)}
              variant="destructive"
              className="w-full"
            >
              Delete Ask
            </Button>
          )}

          {/* Activity View Status Tags */}
          {isActivityView && (
            <div className="w-full flex justify-center">
              {ask.auctionStatus === 'active' && !ask.archivedAt && (
                <Badge className="bg-green-600 text-white shadow-lg shadow-green-600/50">
                  Active
                </Badge>
              )}
              {ask.auctionStatus === 'completed' && (
                <Badge className="bg-green-600 text-white shadow-lg shadow-green-600/50">
                  Completed
                </Badge>
              )}
              {ask.archivedAt && (
                <Badge className="bg-yellow-600 text-white shadow-lg shadow-red-600/50">
                  Archived
                </Badge>
              )}
            </div>
          )}
        </CardFooter>
      </Card>

      <BidModal
        isOpen={isBidModalOpen}
        onClose={() => setIsBidModalOpen(false)}
        onSubmit={handleSubmitBid}
        askCost={ask.cost}
        currentBid={myActiveBid?.amount}
        lowestBid={lowestBid}
        isRebid={!!myActiveBid}
      />

      <AcceptBidDialog
        isOpen={acceptDialogOpen}
        onClose={() => setAcceptDialogOpen(false)}
        onConfirm={handleConfirmAccept}
        bidAmount={selectedBid?.amount || 0}
        pianistName={selectedBid?.pianistName || ''}
        isAuctionActive={isAuctionActive}
        timeRemaining={getTimeRemaining()}
      />
    </>
  );
}