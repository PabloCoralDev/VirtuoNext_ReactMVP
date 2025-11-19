import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { BidModal } from './BidModal';
import { AuctionTimer } from './AuctionTimer';
import { AcceptBidDialog } from './AcceptBidDialog';
import { Calendar, MapPin, Music, Clock, DollarSign } from 'lucide-react';
import type { Ask, Bid } from './Marketplace';

interface AskCardProps {
  ask: Ask;
  userType: 'soloist' | 'pianist';
  userName: string;
  onPlaceBid: (askId: string, bid: Omit<Bid, 'id' | 'status'>) => void;
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
  const myBid = ask.bids.find(bid => bid.pianistName === userName);
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
      message
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
              <Badge variant={ask.costType === 'hourly' ? 'default' : 'secondary'}>
                {ask.costType === 'hourly' ? 'Hourly' : 'Per Piece'}
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
            <div className="pt-3 border-t">
              <AuctionTimer auctionEndTime={ask.auctionEndTime} />
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
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            {ask.pieces.length > 0 && (
              <div className="col-span-2 flex items-start gap-2 text-gray-600">
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

          {ask.bids.length > 0 && (
            <div className="pt-2 border-t">
              <button
                onClick={() => setShowBids(!showBids)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                {ask.bids.length} bid{ask.bids.length !== 1 ? 's' : ''} placed
                {showBids ? ' ▴' : ' ▾'}
              </button>

              {showBids && (
                <div className="mt-3 space-y-2">
                  {ask.bids.map(bid => (
                    <div
                      key={bid.id}
                      className={`p-3 rounded-lg border ${
                        bid.status === 'accepted' 
                          ? 'bg-green-50 border-green-200' 
                          : bid.status === 'rejected'
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{bid.pianistName}</span>
                            {bid.status === 'accepted' && (
                              <Badge className="bg-green-600">Accepted</Badge>
                            )}
                            {bid.status === 'rejected' && (
                              <Badge variant="secondary">Not Selected</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{bid.message}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <DollarSign className="size-4" />
                            <span>{bid.amount}</span>
                          </div>
                        </div>
                      </div>
                      {isMyAsk && bid.status === 'pending' && !hasAcceptedBid && !isActivityView && (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptClick(bid.id, bid.amount, bid.pianistName)}
                          className="w-full mt-2"
                          variant={isAuctionActive ? 'default' : 'default'}
                        >
                          {isAuctionActive ? 'Accept & End Auction' : 'Accept Bid'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {userType === 'pianist' && myBid && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Your bid: ${myBid.amount}</span>
                {myBid.status === 'accepted' && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Accepted
                  </Badge>
                )}
                {myBid.status === 'pending' && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                )}
                {myBid.status === 'rejected' && (
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    Canceled
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          {userType === 'pianist' && !isMyAsk && !myBid && !hasAcceptedBid && !isAuctionExpired && ask.auctionStatus !== 'expired' && ask.auctionStatus !== 'completed' && !isActivityView && (
            <Button onClick={() => setIsBidModalOpen(true)} className="w-full">
              Place Bid
            </Button>
          )}
          {(isAuctionExpired || ask.auctionStatus === 'expired') && !hasAcceptedBid && ask.auctionStatus !== 'completed' && !isMyAsk && !isActivityView && (
            <div className="w-full text-center text-sm text-gray-600">
              Bidding has ended
            </div>
          )}
          {hasAcceptedBid && !isMyAsk && !myBid && !isActivityView && (
            <div className="w-full text-center text-sm text-gray-600">
              This opportunity has been filled
            </div>
          )}
          {userType === 'soloist' && isMyAsk && !ask.archivedAt && hasAcceptedBid && ask.auctionStatus === 'completed' && (
            <Button
              onClick={() => onArchiveAsk(ask.id)}
              variant="destructive"
              className="w-full"
            >
              Delete Ask
            </Button>
          )}
        </CardFooter>
      </Card>

      <BidModal
        isOpen={isBidModalOpen}
        onClose={() => setIsBidModalOpen(false)}
        onSubmit={handleSubmitBid}
        askCost={ask.cost}
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