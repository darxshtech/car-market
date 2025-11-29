import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Listing from '@/lib/models/Listing';

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

    // Fetch all pending listings with seller information
    const listings = await Listing.find({ status: 'pending' })
      .populate('sellerId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      listings,
    });
  } catch (error) {
    console.error('Error fetching pending listings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
