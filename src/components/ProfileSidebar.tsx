import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Settings, FileText, TrendingUp, DollarSign, CreditCard, LogOut } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import type { Ask } from './Marketplace';

interface ProfileSidebarProps {
  userId: string;
  userEmail: string;
  userName: string;
  userType: 'soloist' | 'pianist';
  onEditProfile: () => void;
  onLogout?: () => void;
  isMobileOverlay?: boolean;
}

interface ProfileData {
  bio: string | null;
  picture_url: string | null;
}

interface StripeData {
  accountId: string | null;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

interface Metrics {
  profileViews: number;
  totalAsks: number;
  totalBidsOnAsks: number;
  totalBidsDone: number;
  acceptedBids: number;
  activeAsks: number;
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
}

export function ProfileSidebar({ userId, userEmail, userName, userType, onEditProfile, onLogout, isMobileOverlay = false }: ProfileSidebarProps) {
  const [profile, setProfile] = useState<ProfileData>({ bio: null, picture_url: null });
  const [metrics, setMetrics] = useState<Metrics>({
    profileViews: 0,
    totalAsks: 0,
    totalBidsOnAsks: 0,
    totalBidsDone: 0,
    acceptedBids: 0,
    activeAsks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeData, setStripeData] = useState<StripeData>({
    accountId: null,
    onboardingComplete: false,
    chargesEnabled: false,
    payoutsEnabled: false,
  });

  useEffect(() => {
    fetchProfileData();
    fetchMetrics();
    fetchRecentActivity();
    if (userType === 'pianist') {
      fetchStripeData();
    }

    // Track profile view
    trackProfileView();
  }, [userId]);

  const trackProfileView = async () => {
    try {
      await supabase.from('profile_views').insert({
        profile_id: userId,
        viewer_id: userId, // Self-view, you could track other users viewing this profile later
      });
    } catch (error) {
      console.error('Error tracking profile view:', error);
    }
  };

  const fetchProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('bio, picture_url')
        .eq('id', userId)
        .single();

      if (error) {
        // Profile might not exist yet, that's okay
        console.log('No profile found, using defaults');
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);

      // Fetch profile views
      const { count: viewsCount } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userId);

      if (userType === 'soloist') {
        // Fetch soloist-specific metrics
        const { data: asksData } = await supabase
          .from('asks')
          .select('id')
          .eq('user_id', userId);

        const totalAsks = asksData?.length || 0;

        // Get all bids on this user's asks
        if (totalAsks > 0) {
          const askIds = asksData?.map(ask => ask.id) || [];
          const { count: bidsCount } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .in('ask_id', askIds);

          // Get accepted bids count
          const { count: acceptedCount } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .in('ask_id', askIds)
            .eq('status', 'accepted');

          setMetrics({
            profileViews: viewsCount || 0,
            totalAsks,
            totalBidsOnAsks: bidsCount || 0,
            totalBidsDone: 0,
            acceptedBids: acceptedCount || 0,
            activeAsks: totalAsks - (acceptedCount || 0),
          });
        } else {
          setMetrics({
            profileViews: viewsCount || 0,
            totalAsks: 0,
            totalBidsOnAsks: 0,
            totalBidsDone: 0,
            acceptedBids: 0,
            activeAsks: 0,
          });
        }
      } else {
        // Fetch pianist-specific metrics
        const { data: bidsData } = await supabase
          .from('bids')
          .select('id, status')
          .eq('user_id', userId);

        const totalBidsDone = bidsData?.length || 0;
        const acceptedBids = bidsData?.filter(bid => bid.status === 'accepted').length || 0;

        setMetrics({
          profileViews: viewsCount || 0,
          totalAsks: 0,
          totalBidsOnAsks: 0,
          totalBidsDone,
          acceptedBids,
          activeAsks: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStripeData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching Stripe data:', error);
        return;
      }

      if (data) {
        setStripeData({
          accountId: data.stripe_account_id,
          onboardingComplete: data.stripe_onboarding_complete || false,
          chargesEnabled: data.stripe_charges_enabled || false,
          payoutsEnabled: data.stripe_payouts_enabled || false,
        });
      }
    } catch (error) {
      console.error('Error fetching Stripe data:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      if (userType === 'soloist') {
        // Fetch recent asks for soloists
        const { data: asksData } = await supabase
          .from('asks')
          .select('id, instrument, pieces, cost, cost_type')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        const activities: ActivityItem[] = (asksData || []).map(ask => {
          let subtitle = 'No pieces listed';
          if (ask.pieces && ask.pieces.length > 0) {
            const piecesText = ask.pieces.slice(0, 2).join(', ') + (ask.pieces.length > 2 ? '...' : '');
            subtitle = piecesText.length > 30 ? piecesText.substring(0, 30) + '...' : piecesText;
          }

          const costSuffix = ask.cost_type === 'hourly' ? '/hr' : ask.cost_type === 'total' ? ' total' : '/piece';

          return {
            id: ask.id,
            title: `${ask.instrument} - $${ask.cost}${costSuffix}`,
            subtitle,
          };
        });

        setRecentActivity(activities);
      } else {
        // Fetch recent bids for pianists
        const { data: bidsData } = await supabase
          .from('bids')
          .select('id, amount, ask_id, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!bidsData || bidsData.length === 0) {
          setRecentActivity([]);
          return;
        }

        // Fetch ask details for each bid
        const askIds = bidsData.map(bid => bid.ask_id);
        const { data: asksData } = await supabase
          .from('asks')
          .select('id, instrument, soloist_name')
          .in('id', askIds);

        const activities: ActivityItem[] = bidsData.map(bid => {
          const ask = asksData?.find(a => a.id === bid.ask_id);
          return {
            id: bid.id,
            title: `${ask?.instrument || 'Unknown'} - $${bid.amount}`,
            subtitle: `${ask?.soloist_name || 'Unknown'} • ${bid.status}`,
          };
        });

        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const truncateBio = (bio: string | null) => {
    if (!bio) return 'No bio yet';
    if (bio.length <= 60) return bio;
    return bio.substring(0, 60) + '...';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStatusBadge = (subtitle: string) => {
    // Extract status from subtitle (format: "Name • status")
    const parts = subtitle.split('•').map(p => p.trim());
    if (parts.length < 2) return null;

    const status = parts[1].toLowerCase();

    const statusStyles = {
      pending: 'bg-amber-500 text-white shadow-lg shadow-amber-500/50',
      accepted: 'bg-green-600 text-white shadow-lg shadow-green-600/50',
      canceled: 'bg-red-600 text-white shadow-lg shadow-red-600/50',
    };

    const style = statusStyles[status as keyof typeof statusStyles];
    if (!style) return null;

    return { status, style };
  };

  return (
    <div className={isMobileOverlay ? "w-full space-y-3" : "w-48 flex-shrink-0 space-y-3 sticky top-20 self-start"}>
      {/* Profile Card */}
      <Card className="h-fit">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <Avatar className="size-9">
              <AvatarImage src={profile.picture_url || undefined} alt={userName} />
              <AvatarFallback className="text-[9px]">{getInitials(userName)}</AvatarFallback>
            </Avatar>
            <div className="w-full space-y-0.5">
              <h3 className="font-semibold text-[8px] leading-tight truncate">{userName}</h3>
              <p className="text-[7px] text-muted-foreground truncate leading-tight">{userEmail}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-5 text-[7px] px-1.5 mt-1"
              onClick={onEditProfile}
            >
              <Settings className="size-2 mr-0.5" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Card */}
      <Card className="h-fit">
        <CardHeader className="pb-1.5 pt-3.5 px-3">
          <CardTitle className="text-[9px] font-bold">Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-3 pb-2.5">
          {isLoading ? (
            <div className="text-center py-1">
              <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-red-600 border-t-transparent mx-auto"></div>
            </div>
          ) : (
            <>
              {userType === 'soloist' ? (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <FileText className="size-2 text-muted-foreground flex-shrink-0" />
                      <span className="text-[6px] text-muted-foreground truncate">Asks</span>
                    </div>
                    <span className="text-[7px] font-semibold flex-shrink-0">{metrics.totalAsks}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <TrendingUp className="size-2 text-muted-foreground flex-shrink-0" />
                      <span className="text-[6px] text-muted-foreground truncate">Bids</span>
                    </div>
                    <span className="text-[7px] font-semibold flex-shrink-0">{metrics.totalBidsOnAsks}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <DollarSign className="size-2 text-muted-foreground flex-shrink-0" />
                      <span className="text-[6px] text-muted-foreground truncate">Accepted</span>
                    </div>
                    <span className="text-[7px] font-semibold flex-shrink-0">{metrics.acceptedBids}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <TrendingUp className="size-2 text-muted-foreground flex-shrink-0" />
                      <span className="text-[6px] text-muted-foreground truncate">Active</span>
                    </div>
                    <span className="text-[7px] font-semibold flex-shrink-0">{metrics.activeAsks}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <TrendingUp className="size-2 text-muted-foreground flex-shrink-0" />
                      <span className="text-[6px] text-muted-foreground truncate">Bids</span>
                    </div>
                    <span className="text-[7px] font-semibold flex-shrink-0">{metrics.totalBidsDone}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <DollarSign className="size-2 text-muted-foreground flex-shrink-0" />
                      <span className="text-[6px] text-muted-foreground truncate">Accepted</span>
                    </div>
                    <span className="text-[7px] font-semibold flex-shrink-0">{metrics.acceptedBids}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <TrendingUp className="size-2 text-muted-foreground flex-shrink-0" />
                      <span className="text-[6px] text-muted-foreground truncate">Rate</span>
                    </div>
                    <span className="text-[7px] font-semibold flex-shrink-0">
                      {metrics.totalBidsDone > 0
                        ? Math.round((metrics.acceptedBids / metrics.totalBidsDone) * 100)
                        : 0}%
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card className={isMobileOverlay ? "h-fit w-full" : "h-fit max-h-[280px] overflow-hidden w-full"}>
        <CardHeader className="pb-1.5 pt-3.5 px-3">
          <CardTitle className="text-[9px] font-bold">Recent</CardTitle>
        </CardHeader>
        <CardContent className={isMobileOverlay ? "px-3 pb-2.5" : "px-3 pb-2.5 overflow-y-auto overflow-x-hidden max-h-[240px]"}>
          {recentActivity.length > 0 ? (
            <div className="space-y-1.5 w-full">
              {recentActivity.slice(0, 6).map(activity => {
                const statusBadge = getStatusBadge(activity.subtitle);
                // If status badge exists, remove it from subtitle display
                const displaySubtitle = statusBadge
                  ? activity.subtitle.split('•')[0].trim()
                  : activity.subtitle;

                return (
                  <div key={activity.id} className="border-l border-muted pl-1.5 py-0.5 min-w-0 w-full max-w-full">
                    <p className="text-[6px] font-medium leading-tight truncate overflow-hidden w-full">{activity.title}</p>
                    <div className="flex items-center gap-1 mt-0.5 min-w-0 w-full max-w-full">
                      <p className="text-[5px] text-muted-foreground leading-tight truncate flex-1 min-w-0 overflow-hidden max-w-0">
                        {displaySubtitle}
                      </p>
                      {statusBadge && (
                        <Badge className={`text-[7px] px-1.5 py-0.5 flex-shrink-0 ${statusBadge.style}`}>
                          {statusBadge.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[6px] text-muted-foreground text-center py-2">
              None yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stripe Status Card - Only for Pianists */}
      {userType === 'pianist' && (
        <Card className="h-fit">
          <CardHeader className="pb-1.5 pt-3.5 px-3">
            <CardTitle className="text-[9px] font-bold flex items-center gap-1">
              <CreditCard className="size-2" />
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-3 pb-2.5">
            {!stripeData.accountId ? (
              <div className="text-center py-1.5">
                <p className="text-[6px] text-muted-foreground leading-tight mb-1">
                  Not set up
                </p>
                <Badge variant="secondary" className="text-[6px] px-1.5 py-0.5">
                  Setup Required
                </Badge>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[6px] text-muted-foreground">Status</span>
                  <Badge
                    variant={stripeData.onboardingComplete ? 'default' : 'secondary'}
                    className="text-[6px] px-1.5 py-0.5"
                  >
                    {stripeData.onboardingComplete ? 'Active' : 'Pending'}
                  </Badge>
                </div>
                {stripeData.chargesEnabled && stripeData.payoutsEnabled && (
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[6px] text-muted-foreground truncate">Ready</span>
                    <Badge className="text-[6px] px-1.5 py-0.5 bg-green-600 flex-shrink-0">
                      ✓
                    </Badge>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logout Button - Only show if onLogout is provided */}
      {onLogout && (
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full h-8 text-[7px] px-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
        >
          <LogOut className="size-3 mr-1" />
          Logout
        </Button>
      )}
    </div>
  );
}
