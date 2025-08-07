import React, { useState } from 'react';
import { useAzureADAuth } from '@/contexts/AzureADAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { apiRequest } from '@/lib/api';
import { ChevronDown, ChevronUp, Send } from "lucide-react";

export function BroadcastMessageForm() {
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAzureADAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      const messageData = {
        message: message,
        priority: priority,
        createdBy: user?.name || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await apiRequest('/api/broadcastMessages', {
        method: 'POST',
        body: JSON.stringify(messageData),
      });

      toast.success('Broadcast message sent successfully');
      setMessage('');
      setPriority('medium');
      // onClose(); // This line was not in the new_code, so it's removed.
    } catch (error) {
      console.error('Error sending broadcast message:', error);
      toast.error('Failed to send broadcast message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="transition-all duration-300">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Send Broadcast Message</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-4 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your broadcast message..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              {/* The original code had RadioGroup, RadioGroupItem, Label, and value/onValueChange.
                  The new_code removed these imports and replaced them with a simple Select.
                  This means the priority selection is now a simple dropdown. */}
              <Select onValueChange={(value) => setPriority(value as "low" | "medium" | "high")} defaultValue="medium">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                "Sending..."
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Message
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
} 