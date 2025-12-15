import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client';
import { fetchUserRelationships } from '../../utils/relationships';
import { MessageSquare, Calendar, DollarSign, X } from 'lucide-react';
import virtuoNextLogo from '../../ui_elements/VirtuoNext Logo.png';

interface Relationship {
  id: string;
  relationship_id: string;
  pianist_user_id: string;
  soloist_user_id: string;
  pianist_name: string;
  soloist_name: string;
  status: string;
  dates: any[];
  payment_status: string;
  payment_amount: number;
  last_message_at: string | null;
  unread_count_pianist: number;
  unread_count_soloist: number;
  created_at: string;
  expires_at: string | null;
}

interface InboxProps {
  userId: string;
  userType: 'pianist' | 'soloist';
  userName: string;
  onBack: () => void;
  onOpenThread: (relationshipId: string) => void;
}

export function Inbox({ userId, userType, userName, onBack, onOpenThread }: InboxProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRelationships();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('relationships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'relationships' }, () => {
        loadRelationships();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadRelationships();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const loadRelationships = async () => {
    setIsLoading(true);
    const { data, error } = await fetchUserRelationships(userId);

    if (error) {
      console.error('Error fetching relationships:', error);
    } else {
      setRelationships(data || []);
    }

    setIsLoading(false);
  };

  const getOtherPersonName = (relationship: Relationship) => {
    return userType === 'pianist' ? relationship.soloist_name : relationship.pianist_name;
  };

  const getUnreadCount = (relationship: Relationship) => {
    return userType === 'pianist' ? relationship.unread_count_pianist : relationship.unread_count_soloist;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatDates = (dates: any[]) => {
    if (!dates || dates.length === 0) return 'No dates specified';

    const dateInfo = dates[0];
    if (dateInfo.type === 'single') {
      return new Date(dateInfo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (dateInfo.type === 'range') {
      const start = new Date(dateInfo.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = new Date(dateInfo.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    } else if (dateInfo.type === 'semester') {
      return dateInfo.semester;
    }
    return 'No dates specified';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-2">
            <img
              src={virtuoNextLogo}
              alt="VirtuoNext"
              className="h-8 w-8 object-contain"
            />
            <span className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-red-600">
              Inbox
            </span>
          </div>

          {/* Right: Close Button */}
          <button
            onClick={onBack}
            className="p-2.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-all"
            title="Back to Marketplace"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        ) : relationships.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="size-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 text-lg mb-2">No conversations yet</p>
            <p className="text-gray-500 text-sm">
              When you accept a bid, you'll be able to message here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {relationships.map(relationship => {
              const otherPerson = getOtherPersonName(relationship);
              const unreadCount = getUnreadCount(relationship);

              return (
                <div
                  key={relationship.id}
                  onClick={() => onOpenThread(relationship.id)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{otherPerson}</h3>
                        {unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        ID: {relationship.relationship_id}
                      </p>
                    </div>
                    {relationship.last_message_at && (
                      <span className="text-xs text-gray-500">
                        {formatDate(relationship.last_message_at)}
                      </span>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-2 mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(relationship.status)}`}>
                      {relationship.status}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPaymentStatusColor(relationship.payment_status)}`}>
                      {relationship.payment_status}
                    </span>
                  </div>

                  {/* Details Row */}
                  <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      <span className="text-xs">{formatDates(relationship.dates)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="size-3.5" />
                      <span className="text-xs">${relationship.payment_amount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>

                  {/* Expiration Warning */}
                  {relationship.expires_at && new Date(relationship.expires_at) < new Date() && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      ⚠️ Expired
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
