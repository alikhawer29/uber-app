const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatReviewDate(d: Date): string {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const mon = MONTHS[d.getUTCMonth()];
    const y = d.getUTCFullYear();
    return `${day}-${mon}-${y}`;
}

export function mapPassengerReviewsFromRides(rides: any[]) {
    return rides.map((ride: any) => {
        const u = ride.userId;
        const name =
            u && typeof u === 'object'
                ? `${(u.firstName || '').trim()} ${(u.lastName || '').trim()}`.trim() || 'Passenger'
                : 'Passenger';
        const reviewerImage = u && typeof u === 'object' ? u.avatar || null : null;
        const createdAt = ride.updatedAt || ride.createdAt;
        return {
            rideId: String(ride._id),
            reviewerName: name,
            reviewerImage,
            rating: ride.ratingByUser,
            comment: ride.reviewByUser ?? '',
            reviewDate: formatReviewDate(new Date(createdAt)),
            createdAt: new Date(createdAt).toISOString(),
        };
    });
}
