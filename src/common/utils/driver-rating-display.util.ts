export function formatDriverRatingDisplay(averageRating: number, totalReviews: number): string {
    const avg = Number.isFinite(averageRating) ? averageRating : 0;
    const count = Math.max(0, totalReviews || 0);
    const label = count === 1 ? 'rating' : 'ratings';
    return `${avg.toFixed(1)} (${count} ${label})`;
}

export function buildDriverRatingSummary(stats: {
    averageRating: number;
    totalReviews: number;
}) {
    return {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        display: formatDriverRatingDisplay(stats.averageRating, stats.totalReviews),
    };
}
