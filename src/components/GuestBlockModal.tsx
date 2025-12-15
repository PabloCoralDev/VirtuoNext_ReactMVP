import { Button } from './shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './shared/ui/dialog';

interface GuestBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
}

export function GuestBlockModal({ isOpen, onClose, onSignUp }: GuestBlockModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign Up Required</DialogTitle>
          <DialogDescription>
            You need to create an account to interact with the marketplace.
            Sign up now to post asks, submit bids, and connect with musicians!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={onSignUp} className="w-full">
            Create Account
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full">
            Continue Browsing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
