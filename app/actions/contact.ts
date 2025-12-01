'use server';

import { contactFormSchema, sanitizeObject } from '@/lib/validation';

interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function submitContactForm(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<ActionResult> {
  try {
    // Sanitize inputs
    const sanitized = sanitizeObject(formData);

    // Validate form data
    const validation = contactFormSchema.safeParse(sanitized);

    if (!validation.success) {
      const errors = validation.error.errors.map((err) => err.message).join(', ');
      return {
        success: false,
        error: `Validation failed: ${errors}`,
      };
    }

    // In a real application, you would:
    // 1. Send an email to support@drivesphere.com
    // 2. Store the message in a database
    // 3. Send a confirmation email to the user
    
    // For now, we'll just log it and return success
    console.log('Contact form submission:', validation.data);

    return {
      success: true,
      data: {
        message: 'Your message has been sent successfully',
      },
    };
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return {
      success: false,
      error: 'Failed to send message. Please try again later.',
    };
  }
}
