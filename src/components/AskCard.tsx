import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { BidModal } from './BidModal';
import { Calendar, MapPin, Music, Clock, DollarSign } from 'lucide-react';
import type { Ask, Bid } from './Marketplace';

interface AskCardProps {
  ask: Ask;
  userType: 'soloist' | 'pianist';
  userName: string;
  onPlaceBid: (askId: string, bid: Omit<Bid, 'id' | 'status'>) => void;
  onAcceptBid: (askId: string, bidId: string) => void;
}

export function AskCard({ ask, userType, userName, onPlaceBid, onAcceptBid }: AskCardProps) {
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [showBids, setShowBids] = useState(false);

  const isMyAsk = ask.soloistName === userName;
  const myBid = ask.bids.find(bid => bid.pianistName === userName);
  const hasAcceptedBid = ask.bids.some(bid => bid.status === 'accepted');

  const handleSubmitBid = (amount: number, message: string) => {
    onPlaceBid(ask.id, {
      pianistName: userName,
      amount,
      message
    });
    setIsBidModalOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{ask.soloistName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg">{ask.soloistName}</h3>
                <p className="text-sm text-gray-600">{ask.instrument}</p>
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
                      {isMyAsk && bid.status === 'pending' && !hasAcceptedBid && (
                        <Button
                          size="sm"
                          onClick={() => onAcceptBid(ask.id, bid.id)}
                          className="w-full mt-2"
                        >
                          Accept Bid
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {myBid && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <Badge variant={
                  myBid.status === 'accepted' ? 'default' : 
                  myBid.status === 'rejected' ? 'secondary' : 
                  'outline'
                }>
                  Your bid: ${myBid.amount}
                </Badge>
                {myBid.status === 'accepted' && (
                  <span className="text-sm text-green-600">✓ Accepted</span>
                )}
                {myBid.status === 'pending' && (
                  <span className="text-sm text-gray-600">Pending</span>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter>
          {userType === 'pianist' && !isMyAsk && !myBid && !hasAcceptedBid && (
            <Button onClick={() => setIsBidModalOpen(true)} className="w-full">
              Place Bid
            </Button>
          )}
          {hasAcceptedBid && !isMyAsk && !myBid && (
            <div className="w-full text-center text-sm text-gray-600">
              This opportunity has been filled
            </div>
          )}
        </CardFooter>
      </Card>

      <BidModal
        isOpen={isBidModalOpen}
        onClose={() => setIsBidModalOpen(false)}
        onSubmit={handleSubmitBid}
        askCost={ask.cost}
      />
    </>
  );
}