/** Haversine distance between two WGS84 points, in kilometers */
export function haversineDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLng = deg2rad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(d: number): number {
    return (d * Math.PI) / 180;
}

/** Trip duration estimate from distance using average urban speed (km/h). */
export function estimateDurationMinutes(distanceKm: number, avgSpeedKmh: number): number {
    if (avgSpeedKmh <= 0) return 0;
    return Math.max(1, Math.ceil((distanceKm / avgSpeedKmh) * 60));
}

export function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}
