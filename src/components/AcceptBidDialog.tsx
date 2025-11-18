import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { DollarSign, AlertTriangle } from 'lucide-react';

interface AcceptBidDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bidAmount: number;
  pianistName: string;
  isAuctionActive: boolean;
  timeRemaining?: string;
}

export function AcceptBidDialog({
  isOpen,
  onClose,
  onConfirm,
  bidAmount,
  pianistName,
  isAuctionActive,
  timeRemaining,
}: AcceptBidDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isAuctionActive && <AlertTriangle className="w-5 h-5 text-orange-600" />}
            Accept Bid from {pianistName}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                <DollarSign className="w-5 h-5" />
                ${bidAmount}
              </div>

              {isAuctionActive && timeRemaining && (
                <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-2">
                  <div className="font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Ending Auction Early
                  </div>
                  <div className="text-sm text-orange-800 dark:text-orange-200">
                    This auction still has <strong>{timeRemaining}</strong> remaining. Accepting this bid will:
                  </div>
                  <ul className="text-sm text-orange-800 dark:text-orange-200 list-disc list-inside space-y-1">
                    <li>Immediately end the auction</li>
                    <li>Reject all other pending bids</li>
                    <li>Prevent new bids from being placed</li>
                    <li>Reveal the pianist's contact information</li>
                  </ul>
                </div>
              )}

              {!isAuctionActive && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="text-sm text-green-800 dark:text-green-200">
                    The auction has ended. Accepting this bid will reveal the pianist's contact information.
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400">
                You'll receive <strong>{pianistName}'s</strong> email and phone number (if provided) to coordinate your performance.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {isAuctionActive ? 'End Auction & Accept Bid' : 'Accept Bid'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
