import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Mail, Phone, Music, DollarSign, Calendar } from 'lucide-react';
import type { ContactReveal } from '@/types/auction';

interface ContactCardProps {
  contact: ContactReveal;
  askDetails?: {
    instrument: string;
    pieces: string[];
    dateType: 'single' | 'range' | 'semester';
    date?: string;
    startDate?: string;
    endDate?: string;
    semester?: string;
  };
  bidAmount?: number;
}

export function ContactCard({ contact, askDetails, bidAmount }: ContactCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Winning Pianist</CardTitle>
          <Badge className="bg-green-600">Accepted</Badge>
        </div>
        <p className="text-sm text-gray-600">
          Bid accepted on {formatDate(contact.revealed_at)}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pianist Name */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{contact.pianist_name}</h3>
          {bidAmount && (
            <div className="flex items-center gap-1 text-green-700 mt-1">
              <DollarSign className="w-4 h-4" />
              <span className="font-medium">${bidAmount}</span>
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-3 pt-3 border-t border-green-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
              <Mail className="w-4 h-4 text-green-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600">Email</p>
              <a
                href={`mailto:${contact.pianist_email}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {contact.pianist_email}
              </a>
            </div>
          </div>

          {contact.pianist_phone && (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                <Phone className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">Phone</p>
                <a
                  href={`tel:${contact.pianist_phone}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {contact.pianist_phone}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Ask Details (Optional) */}
        {askDetails && (
          <div className="space-y-3 pt-3 border-t border-green-200">
            <div className="flex items-start gap-2">
              <Music className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Instrument</p>
                <p className="text-sm font-medium">{askDetails.instrument}</p>
              </div>
            </div>

            {askDetails.pieces.length > 0 && (
              <div className="flex items-start gap-2">
                <Music className="w-4 h-4 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Pieces</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {askDetails.pieces.map((piece, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-xs"
                      >
                        {piece}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Performance Date</p>
                <p className="text-sm font-medium">
                  {askDetails.dateType === 'single' && askDetails.date &&
                    new Date(askDetails.date).toLocaleDateString()}
                  {askDetails.dateType === 'range' && askDetails.startDate && askDetails.endDate &&
                    `${new Date(askDetails.startDate).toLocaleDateString()} - ${new Date(askDetails.endDate).toLocaleDateString()}`}
                  {askDetails.dateType === 'semester' && askDetails.semester}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-green-200">
          <p className="text-xs text-gray-600">
            Contact this pianist to coordinate rehearsals and finalize arrangements.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
