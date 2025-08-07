import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAzureADAuth } from '@/contexts/AzureADAuthContext';
import { BroadcastMessage as BroadcastMessageType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { toast } from '@/components/ui/sonner';
import { apiRequest } from '@/lib/api';
import { Trash2, Edit, Eye, AlertCircle, Bell, Info, X } from 'lucide-react';

interface BroadcastMessage {
  id: string;
  message: string;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  createdBy: string;
  priority: "low" | "medium" | "high";
}

export function BroadcastMessage() {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const { user } = useAzureADAuth(); // Changed from useAuth to useAzureADAuth

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Replace Firebase operations with API calls
  const loadMessages = async () => {
    try {
      const params = new URLSearchParams();
      params.append('sort', 'createdAt');
      params.append('order', 'desc');
      params.append('limit', '50');
      
      const messages = await apiRequest(`/api/broadcastMessages?${params.toString()}`);
      setMessages(messages);
    } catch (error) {
      console.error('Error loading broadcast messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await apiRequest(`/api/broadcastMessages/${messageId}`, {
        method: 'DELETE',
      });
      toast.success('Message deleted successfully');
      loadMessages(); // Reload messages
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const formatTimestamp = (timestamp: any) => {
    try {
      let date: Date;
      
      // Handle Firebase Timestamp format
      if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        console.error("Invalid timestamp format:", timestamp);
        return "Invalid time";
      }
      
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid time";
    }
  };

  const getPriorityIcon = (priority: "low" | "medium" | "high") => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "medium":
        return <Bell className="h-5 w-5 text-yellow-500" />;
      case "low":
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className="relative overflow-hidden mb-6 h-[120px]">
      <style>
        {`
          @keyframes scroll {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
          .scrolling-message {
            animation: scroll 20s linear infinite;
            white-space: nowrap;
          }
          .scrolling-message:hover {
            animation-play-state: paused;
          }
        `}
      </style>
      <div className="scrolling-message absolute top-0 left-0 w-full">
        <div className="flex space-x-4">
          {messages.map((message) => (
            <Card 
              key={message.id}
              className={`flex-shrink-0 shadow-sm transition-all duration-200 hover:shadow-md ${
                message.priority === "high" 
                  ? "border-l-4 border-red-500 bg-white dark:bg-gray-900" 
                  : message.priority === "medium"
                  ? "border-l-4 border-yellow-500 bg-white dark:bg-gray-900"
                  : "border-l-4 border-blue-500 bg-white dark:bg-gray-900"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getPriorityIcon(message.priority)}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                        {message.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{message.createdBy}</span>
                        <span>•</span>
                        <span>{formatTimestamp(message.createdAt)}</span>
                        <span>•</span>
                        <span className="capitalize">{message.priority} priority</span>
                      </div>
                    </div>
                  </div>
                  {(user?.role === "system_admin" || user?.role === "global_engineer") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      onClick={() => deleteMessage(message.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 