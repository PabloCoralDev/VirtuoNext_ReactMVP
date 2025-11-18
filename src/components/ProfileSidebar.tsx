import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Eye, TrendingUp, DollarSign, FileText, Settings } from 'lucide-react';
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

  return (
    <div className="w-64 flex-shrink-0 space-y-4 sticky top-20 self-start">
      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="size-20">
              <AvatarImage src={profile.picture_url || undefined} alt={userName} />
              <AvatarFallback className="text-lg">{getInitials(userName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 w-full">
              <h3 className="font-semibold text-sm">{userName}</h3>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              <Badge variant="secondary" className="text-xs">
                {userType}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground italic w-full">
              {truncateBio(profile.bio)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={onEditProfile}
            >
              <Settings className="size-3 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Your Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Profile Views */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Profile Views</span>
                </div>
                <span className="text-sm font-semibold">{metrics.profileViews}</span>
              </div>

              {userType === 'soloist' ? (
                <>
                  {/* Total Asks */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Total Asks</span>
                    </div>
                    <span className="text-sm font-semibold">{metrics.totalAsks}</span>
                  </div>

                  {/* Total Bids on Asks */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Bids Received</span>
                    </div>
                    <span className="text-sm font-semibold">{metrics.totalBidsOnAsks}</span>
                  </div>

                  {/* Accepted Bids */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Accepted</span>
                    </div>
                    <span className="text-sm font-semibold">{metrics.acceptedBids}</span>
                  </div>

                  {/* Active Asks */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Active Asks</span>
                    </div>
                    <span className="text-sm font-semibold">{metrics.activeAsks}</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Total Bids Done */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Total Bids</span>
                    </div>
                    <span className="text-sm font-semibold">{metrics.totalBidsDone}</span>
                  </div>

                  {/* Accepted Bids */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Accepted</span>
                    </div>
                    <span className="text-sm font-semibold">{metrics.acceptedBids}</span>
                  </div>

                  {/* Success Rate */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Success Rate</span>
                    </div>
                    <span className="text-sm font-semibold">
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {userType === 'soloist' ? 'Your Asks' : 'Your Bids'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map(activity => (
                <div key={activity.id} className="border-l-2 border-muted pl-3 py-1">
                  <p className="text-xs font-medium leading-tight">{activity.title}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    {activity.subtitle}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              {userType === 'soloist'
                ? 'No asks posted yet'
                : 'No bids placed yet'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
