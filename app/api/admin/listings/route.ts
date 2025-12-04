import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';
import User from '@/lib/models/User';

export async function GET() {
    try {
        const session = await getServerSession();

        // Check if user is admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!session || session.user.email !== adminEmail) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectDB();

        // Fetch all listings, sorted by creation date (newest first)
        // Populate seller details
        const listings = await Listing.find({})
            .sort({ createdAt: -1 })
            .populate('sellerId', 'fullName email mobileNumber')
            .lean();

        return NextResponse.json({
            success: true,
            listings,
        });
    } catch (error) {
        console.error('Error fetching admin listings:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
