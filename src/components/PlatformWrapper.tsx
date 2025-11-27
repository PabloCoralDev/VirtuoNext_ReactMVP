import { useState, useEffect } from 'react';

// Desktop imports
import { Marketplace as DesktopMarketplace } from './desktop/Marketplace';
import { AskCard as DesktopAskCard } from './desktop/AskCard';
import { CreateAskModal as DesktopCreateAskModal } from './desktop/CreateAskModal';
import { ProfileSidebar as DesktopProfileSidebar } from './desktop/ProfileSidebar';

// Mobile imports
import { Marketplace as MobileMarketplace } from './mobile/Marketplace';
import { AskCard as MobileAskCard } from './mobile/AskCard';
import { CreateAskModal as MobileCreateAskModal } from './mobile/CreateAskModal';
import { ProfileSidebar as MobileProfileSidebar } from './mobile/ProfileSidebar';

// Hook to detect mobile vs desktop
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Export the components with platform detection
export function Marketplace(props: any) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileMarketplace {...props} /> : <DesktopMarketplace {...props} />;
}

export function AskCard(props: any) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileAskCard {...props} /> : <DesktopAskCard {...props} />;
}

export function CreateAskModal(props: any) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileCreateAskModal {...props} /> : <DesktopCreateAskModal {...props} />;
}

export function ProfileSidebar(props: any) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileProfileSidebar {...props} /> : <DesktopProfileSidebar {...props} />;
}

// Re-export types from desktop (they're identical)
export type { Ask, Bid } from './desktop/Marketplace';
