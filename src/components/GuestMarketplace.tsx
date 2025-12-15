import { useState, useCallback } from 'react';
import { Marketplace } from './PlatformWrapper';
import { GuestBlockModal } from './GuestBlockModal';

interface GuestMarketplaceProps {
  onSignUp: () => void;
}

export function GuestMarketplace({ onSignUp }: GuestMarketplaceProps) {
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Interceptor function that blocks any action and shows modal
  const blockInteraction = useCallback(() => {
    setShowBlockModal(true);
  }, []);

  // Create a guest profile with dummy data
  const guestProfile = {
    id: 'guest-user',
    name: 'Guest User',
    email: 'guest@example.com',
    userType: 'soloist' as const,
  };

  return (
    <div onClick={(e) => {
      // Block any button clicks
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.classList.contains('cursor-pointer')
      ) {
        e.stopPropagation();
        e.preventDefault();
        blockInteraction();
      }
    }}>
      <Marketplace
        userId={guestProfile.id}
        userType={guestProfile.userType}
        userName={guestProfile.name}
        userEmail={guestProfile.email}
        onLogout={blockInteraction}
        onEditProfile={blockInteraction}
      />

      <GuestBlockModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onSignUp={onSignUp}
      />
    </div>
  );
}
