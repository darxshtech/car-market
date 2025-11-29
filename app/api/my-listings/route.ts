import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.user.profileComplete) {
      return NextResponse.json(
        { error: 'Profile not complete' },
        { status: 403 }
      );
    }

    await connectDB();

    // Fetch all listings for the current user
    const listings = await Listing.find({ sellerId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      listings,
    });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
