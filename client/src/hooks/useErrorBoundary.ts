import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
  userId?: string;
}

export function useErrorBoundary() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const { toast } = useToast();

  const logError = useCallback((error: Error, errorInfo?: any) => {
    const errorData: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: localStorage.getItem('persistent_user_id') || undefined
    };

    // Add to local error log
    setErrors(prev => [...prev.slice(-9), errorData]); // Keep last 10 errors

    // Store in localStorage for persistence
    const existingErrors = JSON.parse(localStorage.getItem('error_log') || '[]');
    const updatedErrors = [...existingErrors.slice(-19), errorData]; // Keep last 20 errors
    localStorage.setItem('error_log', JSON.stringify(updatedErrors));

    // Show user-friendly error message
    toast({
      title: "Something went wrong",
      description: "The error has been logged. Please try again.",
      variant: "destructive",
    });

    console.error('Error logged:', errorData);
    
    return errorData;
  }, [toast]);

  const clearErrors = useCallback(() => {
    setErrors([]);
    localStorage.removeItem('error_log');
  }, []);

  const retryLastAction = useCallback(() => {
    // This would be implemented based on the specific action that failed
    window.location.reload();
  }, []);

  return {
    errors,
    logError,
    clearErrors,
    retryLastAction,
    errorCount: errors.length
  };
}