import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';

export async function GET() {
    try {
        await connectDB();

        const locations = await Listing.aggregate([
            { $match: { status: 'approved' } },
            {
                $group: {
                    _id: '$city',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        return NextResponse.json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch locations' },
            { status: 500 }
        );
    }
}
