import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../shared/ui/dialog';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Label } from '../shared/ui/label';
import { Textarea } from '../shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shared/ui/select';
import { X, Plus } from 'lucide-react';
import type { Ask } from './Marketplace';

interface CreateAskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ask: Omit<Ask, 'id' | 'bids'>) => void;
  userName: string;
}

export function CreateAskModal({ isOpen, onClose, onSubmit, userName }: CreateAskModalProps) {
  const [instrument, setInstrument] = useState('');
  const [pieces, setPieces] = useState<string[]>([]);
  const [currentPiece, setCurrentPiece] = useState('');
  const [duration, setDuration] = useState('');
  const [costType, setCostType] = useState<'hourly' | 'per-piece' | 'total'>('per-piece');
  const [cost, setCost] = useState('');
  const [location, setLocation] = useState('');
  const [dateType, setDateType] = useState<'single' | 'range' | 'semester'>('semester');
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [semester, setSemester] = useState('Fall 2025');
  const [description, setDescription] = useState('');
  const [auctionDuration, setAuctionDuration] = useState('7');

  const handleAddPiece = () => {
    if (currentPiece.trim()) {
      setPieces([...pieces, currentPiece.trim()]);
      setCurrentPiece('');
    }
  };

  const handleRemovePiece = (index: number) => {
    setPieces(pieces.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate auction end time based on selected duration
    const now = new Date();
    const durationDays = parseInt(auctionDuration);
    const auctionEndTime = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    onSubmit({
      soloistName: userName,
      instrument,
      pieces,
      duration: duration || undefined,
      costType,
      cost: parseFloat(cost),
      location,
      dateType,
      date: dateType === 'single' ? date : undefined,
      startDate: dateType === 'range' ? startDate : undefined,
      endDate: dateType === 'range' ? endDate : undefined,
      semester: dateType === 'semester' ? semester : undefined,
      description,
      auctionEndTime: auctionEndTime.toISOString(),
      auctionStatus: 'active'
    });

    // Reset form
    setInstrument('');
    setPieces([]);
    setCurrentPiece('');
    setDuration('');
    setCostType('per-piece');
    setCost('');
    setLocation('');
    setDateType('semester');
    setDate('');
    setStartDate('');
    setEndDate('');
    setSemester('Fall 2025');
    setDescription('');
    setAuctionDuration('7');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a New Ask</DialogTitle>
          <DialogDescription>
            Share details about your accompaniment needs
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="instrument">Instrument *</Label>
            <Input
              id="instrument"
              placeholder="e.g., Violin, Cello, Flute"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pieces">Pieces (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="pieces"
                placeholder="e.g., Brahms Violin Concerto"
                value={currentPiece}
                onChange={(e) => setCurrentPiece(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPiece();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddPiece}
                variant="outline"
                size="icon"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {pieces.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {pieces.map((piece, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-red-50 border border-red-200 text-sm"
                  >
                    <span>{piece}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePiece(index)}
                      className="ml-1 text-red-600 hover:text-red-700"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cost Type *</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setCostType('per-piece')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  costType === 'per-piece'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Per Piece
              </button>
              <button
                type="button"
                onClick={() => setCostType('hourly')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  costType === 'hourly'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Hourly Rate
              </button>
              <button
                type="button"
                onClick={() => setCostType('total')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  costType === 'total'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Total Fee
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">
                {costType === 'hourly' ? 'Hourly Rate' : costType === 'total' ? 'Total Fee' : 'Cost per Piece'} ($) *
              </Label>
              <Input
                id="cost"
                type="number"
                placeholder="150"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </div>

            {costType === 'hourly' && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 2 hours"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              placeholder="e.g., Carnegie Hall, NYC"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Date Type *</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDateType('single')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  dateType === 'single'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Single Date
              </button>
              <button
                type="button"
                onClick={() => setDateType('range')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  dateType === 'range'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Date Range
              </button>
              <button
                type="button"
                onClick={() => setDateType('semester')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  dateType === 'semester'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Semester
              </button>
            </div>
          </div>

          {dateType === 'single' && (
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          )}

          {dateType === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {dateType === 'semester' && (
            <div className="space-y-2">
              <Label htmlFor="semester">Semester *</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                  <SelectItem value="Spring 2026">Spring 2026</SelectItem>
                  <SelectItem value="Summer 2026">Summer 2026</SelectItem>
                  <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                  <SelectItem value="Spring 2027">Spring 2027</SelectItem>
                  <SelectItem value="Summer 2027">Summer 2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your needs, experience level required, repertoire, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auctionDuration">Bidding Duration *</Label>
            <Select value={auctionDuration} onValueChange={setAuctionDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day (24 hours)</SelectItem>
                <SelectItem value="2">2 days (48 hours)</SelectItem>
                <SelectItem value="3">3 days (72 hours)</SelectItem>
                <SelectItem value="7">1 week (7 days)</SelectItem>
                <SelectItem value="14">2 weeks (14 days)</SelectItem>
                <SelectItem value="30">1 month (30 days)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              How long pianists can bid on your ask. Timer extends by 1 minute if a bid is placed in the final minute.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Post Ask
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
