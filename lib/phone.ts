import phoneUtils from 'intl-tel-input/dist/js/utils.js';
import { z } from 'zod';

// Keep direct API submissions subject to the same number checks as the form.
export const phoneSchema = z.string().trim()
  .regex(/^\+[1-9]\d{7,14}$/)
  .refine(number => phoneUtils.isValidNumber(number, 'gb', null));
