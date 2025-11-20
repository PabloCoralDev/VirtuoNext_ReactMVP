import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, message: string) => void;
  askCost: number;
  currentBid?: number;
  highestBid?: number | null;
  isRebid?: boolean;
}

export function BidModal({ isOpen, onClose, onSubmit, askCost, currentBid, highestBid, isRebid = false }: BidModalProps) {
  const [amount, setAmount] = useState(askCost.toString());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bidAmount = parseFloat(amount);

    // Validate that new bid is higher than highest bid
    if (highestBid && bidAmount <= highestBid) {
      setError(`Your bid must be higher than the current highest bid of $${highestBid}`);
      return;
    }

    setError('');
    onSubmit(bidAmount, message);
    setAmount('');
    setMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isRebid ? 'Submit Another Bid' : 'Place Your Bid'}</DialogTitle>
          <DialogDescription>
            {highestBid
              ? `Your bid must be higher than the current highest bid of $${highestBid}`
              : 'Submit your offer to accompany this soloist'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Your Bid Amount ($) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min={highestBid ? (highestBid + 0.01).toString() : "0"}
              placeholder={askCost.toString()}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              required
            />
            <p className="text-xs text-gray-500">
              {highestBid
                ? `Minimum: $${(highestBid + 0.01).toFixed(2)} (highest bid: $${highestBid})`
                : `Suggested: $${askCost}`
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Introduce yourself and explain why you're a great fit..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {isRebid ? 'Submit New Bid' : 'Submit Bid'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
