import { NextResponse } from 'next/server';
import { contactFormSchema } from '@/lib/validation';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate the request body
        const result = contactFormSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { name, email, subject, message } = result.data;

        // TODO: Implement actual email sending or database storage
        // For now, we'll just log the message
        console.log('Contact Form Submission:', {
            name,
            email,
            subject,
            message,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
            { message: 'Message sent successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error processing contact form:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
