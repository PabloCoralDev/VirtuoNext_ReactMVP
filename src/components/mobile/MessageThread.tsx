import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase/client';
import { fetchRelationshipMessages, sendMessage, markMessagesAsRead } from '../../utils/relationships';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { ArrowLeft, Calendar, DollarSign, Info } from 'lucide-react';

interface MessageData {
  id: string;
  relationship_id: string;
  sender_user_id: string;
  sender_name: string;
  message_text: string;
  read_at: string | null;
  created_at: string;
}

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
  expires_at: string | null;
}

interface MessageThreadProps {
  relationshipId: string;
  userId: string;
  userType: 'pianist' | 'soloist';
  userName: string;
  onBack: () => void;
}

export function MessageThread({ relationshipId, userId, userType, userName, onBack }: MessageThreadProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const messageListRef = useRef<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRelationshipData();
    loadMessages();

    // Subscribe to real-time message updates
    const channel = supabase
      .channel(`messages-${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageData;

          // Check for duplicates before adding (prevents duplicate from optimistic update)
          setMessages(prev => {
            const exists = prev.find(msg => msg.id === newMessage.id);
            if (exists) {
              return prev; // Message already exists (from optimistic update)
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId]);

  useEffect(() => {
    // Mark messages as read when component mounts or messages update
    if (messages.length > 0) {
      markMessagesAsRead(relationshipId, userId);
    }
  }, [messages, relationshipId, userId]);

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (messages.length > 0 && isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isAtBottom]);

  // Detect scroll position to determine if user is at bottom
  useEffect(() => {
    const handleScroll = () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      // Get the scrollable element (chatscope creates internal scrollable div)
      const scrollableElement = container.querySelector('.cs-message-list__scroll-wrapper');
      if (!scrollableElement) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Consider "at bottom" if within 100px of bottom (accounts for padding)
      setIsAtBottom(distanceFromBottom < 100);
    };

    // Wait a bit for chatscope to render its internal structure
    const timer = setTimeout(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const scrollableElement = container.querySelector('.cs-message-list__scroll-wrapper');

      if (scrollableElement) {
        scrollableElement.addEventListener('scroll', handleScroll);
        // Check initial position
        handleScroll();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      const container = messagesContainerRef.current;
      if (container) {
        const scrollableElement = container.querySelector('.cs-message-list__scroll-wrapper');
        if (scrollableElement) {
          scrollableElement.removeEventListener('scroll', handleScroll);
        }
      }
    };
  }, []);

  // Visual Viewport API to handle keyboard appearance
  useEffect(() => {
    const handleViewportResize = () => {
      const viewport = window.visualViewport;
      const input = inputContainerRef.current;

      if (viewport && input) {
        // Calculate how much the keyboard is pushing up the viewport
        const viewportHeight = viewport.height;
        const windowHeight = window.innerHeight;
        const keyboardHeight = windowHeight - viewportHeight;

        // Move input up by keyboard height
        input.style.transform = `translateY(-${keyboardHeight}px)`;
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);

      // Call once on mount to set initial position
      handleViewportResize();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      }
    };
  }, []);

  const loadRelationshipData = async () => {
    const { data, error } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', relationshipId)
      .single();

    if (error) {
      console.error('Error fetching relationship:', error);
    } else {
      setRelationship(data);
    }
  };

  const loadMessages = async () => {
    setIsLoading(true);
    const { data, error } = await fetchRelationshipMessages(relationshipId);

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }

    setIsLoading(false);
  };

  const handleSendMessage = async (_innerHtml: string, textContent: string, _innerText: string) => {
    // Use textContent as it's the clean text without HTML
    const messageText = textContent.trim();

    if (!messageText || isSending) return;

    setIsSending(true);

    // Optimistic update: Add message to local state immediately
    const optimisticMessage: MessageData = {
      id: `temp-${Date.now()}`, // Temporary ID
      relationship_id: relationshipId,
      sender_user_id: userId,
      sender_name: userName,
      message_text: messageText,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Scroll to bottom immediately after adding optimistic message
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 50);

    // Send message to database
    const { error } = await sendMessage(relationshipId, userId, userName, messageText);

    if (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      alert('Failed to send message. Please try again.');
      setIsSending(false);
    } else {
      // Remove optimistic message - real-time subscription will add the real one
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setIsSending(false);
      // Real-time subscription will handle adding the actual message for both users
    }
  };

  const getOtherPersonName = () => {
    if (!relationship) return '';
    return userType === 'pianist' ? relationship.soloist_name : relationship.pianist_name;
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

  if (isLoading || !relationship) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Prevent iOS auto-zoom on input focus and ensure proper scrolling */}
      <style>{`
        /* Prevent iOS zoom on input focus (font-size must be 16px+) */
        .cs-message-input__content-editor-wrapper {
          font-size: 16px !important;
        }
        .cs-message-input__content-editor {
          font-size: 16px !important;
        }
        /* Make MessageList fill container and scroll */
        .cs-message-list {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
          height: 100% !important;
        }
        /* Remove default padding/margin from ChatContainer since we separated MessageInput */
        .cs-chat-container {
          height: 100% !important;
        }
      `}</style>

      <div
        className="bg-gradient-to-br from-red-50 via-white to-red-50 flex flex-col overflow-hidden"
        style={{
          height: '100vh',
          maxHeight: '-webkit-fill-available', // Better iOS support
          paddingBottom: 'env(safe-area-inset-bottom)', // iOS safe area for home indicator
        }}
      >
        {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left: Back Button & Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-all"
              title="Back to Inbox"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="font-semibold text-gray-900">{getOtherPersonName()}</h2>
              <p className="text-xs text-gray-500">ID: {relationship.relationship_id}</p>
            </div>
          </div>

          {/* Right: Info Button */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2.5 rounded-lg text-gray-600 hover:text-amber-600 hover:bg-gray-50 transition-all"
            title="Details"
          >
            <Info className="size-5" />
          </button>
        </div>

        {/* Details Panel (collapsible) */}
        {showDetails && (
          <div className="px-4 py-3 bg-gray-50 border-t space-y-2">
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(relationship.status)}`}>
                {relationship.status}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPaymentStatusColor(relationship.payment_status)}`}>
                {relationship.payment_status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="size-4" />
              <span>{formatDates(relationship.dates)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <DollarSign className="size-4" />
              <span>${relationship.payment_amount?.toFixed(2) || '0.00'}</span>
            </div>
            {relationship.expires_at && (
              <p className="text-xs text-gray-500">
                Expires: {new Date(relationship.expires_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            )}
          </div>
        )}
      </header>

      {/* Messages List Container - Scrollable */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-hidden" style={{ position: 'relative' }}>
        <MainContainer style={{ height: '100%' }}>
          <ChatContainer style={{ height: '100%' }}>
            <MessageList
              ref={messageListRef}
              typingIndicator={isSending ? <TypingIndicator content={`${userName} is typing`} /> : null}
            >
              {messages.map((msg) => {
                const isOwnMessage = msg.sender_user_id === userId;
                const isSystemMessage = msg.sender_name === 'System';

                return (
                  <Message
                    key={msg.id}
                    model={{
                      message: msg.message_text,
                      sentTime: new Date(msg.created_at).toLocaleString(),
                      sender: msg.sender_name,
                      direction: isOwnMessage ? 'outgoing' : 'incoming',
                      position: 'single',
                    }}
                    style={{
                      backgroundColor: isSystemMessage ? '#fef3c7' : undefined,
                      textAlign: isSystemMessage ? 'center' : undefined,
                    }}
                  >
                    <Message.Header sender={msg.sender_name} />
                    <Message.Footer sentTime={new Date(msg.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })} />
                  </Message>
                );
              })}
              {/* Invisible element at the end for scroll anchor with bottom padding */}
              <div ref={messagesEndRef} style={{ height: '80px' }} />
            </MessageList>
          </ChatContainer>
        </MainContainer>
      </div>

      {/* Message Input Container - Fixed at bottom of viewport */}
      <div
        ref={inputContainerRef}
        className="bg-white border-t"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 1000,
          transition: 'transform 0.2s ease-out',
        }}
      >
        <div style={{ padding: '8px' }}>
          <MessageInput
            placeholder="Type your message here..."
            onSend={handleSendMessage}
            disabled={isSending || relationship.status !== 'active'}
            attachButton={false}
          />
        </div>
      </div>
    </div>
    </>
  );
}
