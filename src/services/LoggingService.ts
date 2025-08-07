import { apiRequest } from '@/lib/api';

export interface LogEntry {
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  description: string;
  region?: string;
  district?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class LoggingService {
  private static instance: LoggingService;
  private loggingEndpoint: string;

  private constructor() {
    this.loggingEndpoint = '/api/logs';
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  public async logAction(
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    description?: string,
    region?: string,
    district?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const logEntry: LogEntry = {
        userId,
        userName,
        userRole,
        action,
        resourceType,
        resourceId,
        description: description || `${action} on ${resourceType}`,
        region,
        district,
        metadata,
        timestamp: new Date().toISOString(),
      };

      await apiRequest(this.loggingEndpoint, {
        method: 'POST',
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      console.error('Error logging action:', error);
      // Don't throw error for logging failures to avoid breaking main functionality
    }
  }

  public async getLogs(
    filters?: {
      userId?: string;
      action?: string;
      resourceType?: string;
      region?: string;
      district?: string;
      startDate?: string;
      endDate?: string;
    },
    pagination?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<LogEntry[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            params.append(key, value);
          }
        });
      }
      
      if (pagination) {
        if (pagination.limit) {
          params.append('limit', pagination.limit.toString());
        }
        if (pagination.offset) {
          params.append('offset', pagination.offset.toString());
        }
      }
      
      params.append('sort', 'timestamp');
      params.append('order', 'desc');
      
      return await apiRequest(`${this.loggingEndpoint}?${params.toString()}`);
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw new Error('Failed to fetch logs');
    }
  }

  public async deleteLog(logId: string): Promise<void> {
    try {
      await apiRequest(`${this.loggingEndpoint}/${logId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting log:', error);
      throw new Error('Failed to delete log');
    }
  }

  public async clearLogs(olderThan?: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (olderThan) {
        params.append('olderThan', olderThan);
      }
      
      await apiRequest(`${this.loggingEndpoint}/clear?${params.toString()}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error clearing logs:', error);
      throw new Error('Failed to clear logs');
    }
  }
}

export default LoggingService; 