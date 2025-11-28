import { supabase } from './supabase/client';

/**
 * Generates a unique relationship ID in the format: PPSS####
 * PP = Pianist's first two initials
 * SS = Soloist's first two initials
 * #### = Instance number (0001, 0002, etc.)
 *
 * Example: John Doe (pianist) + Mary Smith (soloist) = JDMS0001
 */
export const generateRelationshipId = async (
  pianistName: string,
  soloistName: string,
  pianistId: string,
  soloistId: string
): Promise<string> => {
  // Extract initials (first two letters of first two words, or pad with X)
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    let initials = '';

    if (parts.length >= 2) {
      initials = parts[0][0] + parts[1][0];
    } else if (parts.length === 1) {
      initials = parts[0].substring(0, 2).padEnd(2, 'X');
    } else {
      initials = 'XX';
    }

    return initials.toUpperCase();
  };

  const pianistInitials = getInitials(pianistName);
  const soloistInitials = getInitials(soloistName);

  // Check for existing relationships between this pair
  const { data: existingRelationships, error } = await supabase
    .from('relationships')
    .select('relationship_id')
    .or(`and(pianist_user_id.eq.${pianistId},soloist_user_id.eq.${soloistId}),and(pianist_user_id.eq.${soloistId},soloist_user_id.eq.${pianistId})`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching existing relationships:', error);
    // Fallback to instance 1 if there's an error
    return `${pianistInitials}${soloistInitials}0001`;
  }

  // Filter to match our initials pattern
  const matchingRelationships = (existingRelationships || []).filter(rel => {
    const relId = rel.relationship_id;
    return relId.startsWith(pianistInitials + soloistInitials) ||
           relId.startsWith(soloistInitials + pianistInitials);
  });

  // Get the next instance number
  let maxInstance = 0;
  matchingRelationships.forEach(rel => {
    const instanceStr = rel.relationship_id.slice(-4);
    const instance = parseInt(instanceStr, 10);
    if (!isNaN(instance) && instance > maxInstance) {
      maxInstance = instance;
    }
  });

  const nextInstance = maxInstance + 1;
  const instanceStr = nextInstance.toString().padStart(4, '0');

  return `${pianistInitials}${soloistInitials}${instanceStr}`;
};

/**
 * Creates a new relationship when a bid is accepted
 */
export const createRelationship = async (
  askId: string,
  bidId: string,
  pianistUserId: string,
  pianistName: string,
  soloistUserId: string,
  soloistName: string,
  bidAmount: number,
  askDates?: {
    dateType: 'single' | 'range' | 'semester';
    date?: string;
    startDate?: string;
    endDate?: string;
    semester?: string;
  }
) => {
  try {
    // Generate unique relationship ID
    const relationshipId = await generateRelationshipId(
      pianistName,
      soloistName,
      pianistUserId,
      soloistUserId
    );

    // Format dates based on ask type
    let dates: any[] = [];
    let expiresAt: string | null = null;

    if (askDates) {
      if (askDates.dateType === 'single' && askDates.date) {
        dates = [{ date: askDates.date, type: 'single' }];
        expiresAt = askDates.date; // Expires on the date
      } else if (askDates.dateType === 'range' && askDates.startDate && askDates.endDate) {
        dates = [{
          startDate: askDates.startDate,
          endDate: askDates.endDate,
          type: 'range'
        }];
        expiresAt = askDates.endDate; // Expires at end of range
      } else if (askDates.dateType === 'semester' && askDates.semester) {
        dates = [{ semester: askDates.semester, type: 'semester' }];
        // For semester, set expiration to 6 months from now
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        expiresAt = sixMonthsLater.toISOString();
      }
    }

    // Create the relationship
    const { data, error } = await supabase
      .from('relationships')
      .insert({
        relationship_id: relationshipId,
        pianist_user_id: pianistUserId,
        soloist_user_id: soloistUserId,
        pianist_name: pianistName,
        soloist_name: soloistName,
        ask_id: askId,
        accepted_bid_id: bidId,
        status: 'active',
        dates: dates,
        payment_amount: bidAmount,
        payment_status: 'pending',
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw error;

    // Send initial system message
    if (data) {
      await supabase.from('messages').insert({
        relationship_id: data.id,
        sender_user_id: soloistUserId,
        sender_name: 'System',
        message_text: `🎉 Congratulations! ${soloistName} has accepted ${pianistName}'s bid. You can now communicate directly here. Payment details and booking information will be shared shortly.`
      });
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating relationship:', error);
    return { data: null, error };
  }
};

/**
 * Fetch all relationships for a user
 */
export const fetchUserRelationships = async (userId: string) => {
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .or(`pianist_user_id.eq.${userId},soloist_user_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return { data, error };
};

/**
 * Fetch messages for a relationship
 */
export const fetchRelationshipMessages = async (relationshipId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('relationship_id', relationshipId)
    .order('created_at', { ascending: true });

  return { data, error };
};

/**
 * Send a message in a relationship
 */
export const sendMessage = async (
  relationshipId: string,
  senderUserId: string,
  senderName: string,
  messageText: string
) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      relationship_id: relationshipId,
      sender_user_id: senderUserId,
      sender_name: senderName,
      message_text: messageText
    })
    .select()
    .single();

  return { data, error };
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  relationshipId: string,
  userId: string
) => {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('relationship_id', relationshipId)
    .neq('sender_user_id', userId)
    .is('read_at', null);

  return { error };
};
