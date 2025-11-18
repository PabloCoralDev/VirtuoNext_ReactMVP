import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { AuctionTimer as TimerData } from '@/types/auction';

interface AuctionTimerProps {
  auctionEndTime: string;
  onExpire?: () => void;
  compact?: boolean;
}

function calculateTimeLeft(endTime: string): TimerData {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isLastDay: false,
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  const isLastDay = difference < 1000 * 60 * 60 * 24; // Less than 24 hours

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isLastDay,
  };
}

export function AuctionTimer({ auctionEndTime, onExpire, compact = false }: AuctionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimerData>(calculateTimeLeft(auctionEndTime));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(auctionEndTime);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.isExpired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auctionEndTime, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
        <AlertCircle className="w-4 h-4" />
        <span>Auction Ended</span>
      </div>
    );
  }

  // Show days format when more than 1 day left
  if (!timeLeft.isLastDay) {
    const totalHours = timeLeft.days * 24 + timeLeft.hours;
    return (
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <div className="font-medium">
          {timeLeft.days > 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              {timeLeft.days}d {timeLeft.hours}h
            </span>
          )}
          {timeLeft.days === 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              {totalHours}h {timeLeft.minutes}m
            </span>
          )}
          {!compact && <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">left</span>}
        </div>
      </div>
    );
  }

  // Show HH:MM:SS format when less than 24 hours left
  const isLastMinute = timeLeft.hours === 0 && timeLeft.minutes === 0;
  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 10;

  const hoursStr = String(timeLeft.hours).padStart(2, '0');
  const minutesStr = String(timeLeft.minutes).padStart(2, '0');
  const secondsStr = String(timeLeft.seconds).padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      <Clock
        className={`w-4 h-4 ${
          isLastMinute
            ? 'text-red-600 dark:text-red-400 animate-pulse'
            : isUrgent
            ? 'text-orange-600 dark:text-orange-400'
            : 'text-blue-600 dark:text-blue-400'
        }`}
      />
      <div className={`font-mono font-bold ${
        isLastMinute
          ? 'text-red-600 dark:text-red-400'
          : isUrgent
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-blue-600 dark:text-blue-400'
      }`}>
        {hoursStr}:{minutesStr}:{secondsStr}
      </div>
      {!compact && (
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          {isLastMinute ? 'FINAL MINUTE!' : isUrgent ? 'ending soon' : 'left'}
        </span>
      )}
    </div>
  );
}
