import { useState } from 'react';
import { Button } from './shared/ui/button';
import { Input } from './shared/ui/input';
import { Label } from './shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './shared/ui/card';
import { Music2 } from 'lucide-react';

interface ProfileSetupProps {
  email: string;
  onComplete: (name: string, userType: 'soloist' | 'pianist') => void;
}

export function ProfileSetup({ email, onComplete }: ProfileSetupProps) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<'soloist' | 'pianist'>('soloist');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete(name, selectedType);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-600 rounded-full p-3">
              <Music2 className="size-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl">Welcome to VirtuoNext</CardTitle>
          <CardDescription>
            Complete your profile to get started
          </CardDescription>
          <p className="text-sm text-gray-600 mt-2">
            Signed in as: {email}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>I am a...</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedType('soloist')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedType === 'soloist'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="mb-1">🎻</div>
                    <div>Soloist</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('pianist')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedType === 'pianist'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="mb-1">🎹</div>
                    <div>Pianist</div>
                  </div>
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Complete Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}