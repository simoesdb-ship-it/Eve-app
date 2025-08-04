import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from './error-handler';

export const validateRequest = (schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Validation failed', {
          errors: error.errors,
          issues: error.issues
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const locationValidation = {
  body: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
    latitude: z.string().refine(
      (val) => !isNaN(parseFloat(val)) && Math.abs(parseFloat(val)) <= 90,
      'Invalid latitude'
    ),
    longitude: z.string().refine(
      (val) => !isNaN(parseFloat(val)) && Math.abs(parseFloat(val)) <= 180,
      'Invalid longitude'
    ),
    name: z.string().min(1, 'Location name is required'),
    accuracy: z.number().min(0).optional()
  })
};

export const voteValidation = {
  body: z.object({
    suggestionId: z.number().positive('Invalid suggestion ID'),
    sessionId: z.string().min(1, 'Session ID is required'),
    voteType: z.enum(['upvote', 'downvote'], {
      errorMap: () => ({ message: 'Vote type must be upvote or downvote' })
    })
  })
};

export const paginationValidation = {
  query: z.object({
    limit: z.string().optional().transform((val) => 
      val ? Math.min(Math.max(parseInt(val), 1), 100) : 10
    ),
    offset: z.string().optional().transform((val) => 
      val ? Math.max(parseInt(val), 0) : 0
    )
  })
};