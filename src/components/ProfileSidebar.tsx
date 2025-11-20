import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Settings, FileText, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import type { Ask } from './Marketplace';

interface ProfileSidebarProps {
  userId: string;
  userEmail: string;
  userName: string;
  userType: 'soloist' | 'pianist';
  onEditProfile: () => void;
}

interface ProfileData {
  bio: string | null;
  picture_url: string | null;
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

export function ProfileSidebar({ userId, userEmail, userName, userType, onEditProfile }: ProfileSidebarProps) {
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

  useEffect(() => {
    fetchProfileData();
    fetchMetrics();
    fetchRecentActivity();

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

        const activities: ActivityItem[] = (asksData || []).map(ask => ({
          id: ask.id,
          title: `${ask.instrument} - $${ask.cost}${ask.cost_type === 'hourly' ? '/hr' : '/piece'}`,
          subtitle: ask.pieces && ask.pieces.length > 0
            ? ask.pieces.slice(0, 2).join(', ') + (ask.pieces.length > 2 ? '...' : '')
            : 'No pieces listed',
        }));

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
    <div className="w-28 flex-shrink-0 space-y-3 sticky top-20 self-start">
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
              <div className="animate-spin rounded-full h-3 w-3 border border-red-600 border-t-transparent mx-auto"></div>
            </div>
          ) : (
            <>
              {userType === 'soloist' ? (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5">
                      <FileText className="size-2 text-muted-foreground" />
                      <span className="text-[6px] text-muted-foreground">Asks</span>
                    </div>
                    <span className="text-[7px] font-semibold">{metrics.totalAsks}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5">
                      <TrendingUp className="size-2 text-muted-foreground" />
                      <span className="text-[6px] text-muted-foreground">Bids</span>
                    </div>
                    <span className="text-[7px] font-semibold">{metrics.totalBidsOnAsks}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5">
                      <DollarSign className="size-2 text-muted-foreground" />
                      <span className="text-[6px] text-muted-foreground">Accepted</span>
                    </div>
                    <span className="text-[7px] font-semibold">{metrics.acceptedBids}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5">
                      <TrendingUp className="size-2 text-muted-foreground" />
                      <span className="text-[6px] text-muted-foreground">Active</span>
                    </div>
                    <span className="text-[7px] font-semibold">{metrics.activeAsks}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5">
                      <TrendingUp className="size-2 text-muted-foreground" />
                      <span className="text-[6px] text-muted-foreground">Bids</span>
                    </div>
                    <span className="text-[7px] font-semibold">{metrics.totalBidsDone}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5">
                      <DollarSign className="size-2 text-muted-foreground" />
                      <span className="text-[6px] text-muted-foreground">Accepted</span>
                    </div>
                    <span className="text-[7px] font-semibold">{metrics.acceptedBids}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5">
                      <TrendingUp className="size-2 text-muted-foreground" />
                      <span className="text-[6px] text-muted-foreground">Rate</span>
                    </div>
                    <span className="text-[7px] font-semibold">
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
      <Card className="h-fit max-h-[280px]">
        <CardHeader className="pb-1.5 pt-3.5 px-3">
          <CardTitle className="text-[9px] font-bold">Recent</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-2.5 overflow-y-auto max-h-[240px]">
          {recentActivity.length > 0 ? (
            <div className="space-y-1.5">
              {recentActivity.slice(0, 6).map(activity => {
                const statusBadge = getStatusBadge(activity.subtitle);
                // If status badge exists, remove it from subtitle display
                const displaySubtitle = statusBadge
                  ? activity.subtitle.split('•')[0].trim()
                  : activity.subtitle;

                return (
                  <div key={activity.id} className="border-l border-muted pl-1.5 py-0.5">
                    <p className="text-[6px] font-medium leading-tight line-clamp-1">{activity.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-[5px] text-muted-foreground leading-tight line-clamp-1">
                        {displaySubtitle}
                      </p>
                      {statusBadge && (
                        <Badge className={`text-[7px] px-1.5 py-0.5 ${statusBadge.style}`}>
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
    </div>
  );
}
