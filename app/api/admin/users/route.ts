import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
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

    // Fetch all users
    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    // Get listing count for each user
    const usersWithListingCount = await Promise.all(
      users.map(async (user) => {
        const listingCount = await Listing.countDocuments({ sellerId: user._id });
        return {
          ...user,
          listingCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithListingCount,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
