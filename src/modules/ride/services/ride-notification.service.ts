import { Injectable } from '@nestjs/common';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { NotificationType } from 'src/shared/schemas/notification.schema';
import { RideStatus } from 'src/common/constants/ride.constants';

@Injectable()
export class RideNotificationService {
    constructor(private readonly notificationService: NotificationService) {}

    notifyRideBooked(userId: string, rideId: string, pickupAddress: string) {
        return this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Ride booked',
            message: `We are finding a driver near ${pickupAddress}.`,
            type: NotificationType.RIDE_BOOKED,
            data: { rideId, status: RideStatus.SEARCHING },
        });
    }

    notifyRideScheduled(userId: string, rideId: string, scheduledAt: string) {
        return this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Ride scheduled',
            message: `Your ride is scheduled for ${scheduledAt}.`,
            type: NotificationType.RIDE_SCHEDULED,
            data: { rideId, status: RideStatus.SCHEDULED, scheduledAt },
        });
    }

    notifyNewRideRequest(riderId: string, rideId: string, pickupAddress: string, fare: number) {
        return this.notificationService.notifyUserNonBlocking({
            recipientId: riderId,
            title: 'New ride request',
            message: `Pickup at ${pickupAddress}. Fare: ${fare}.`,
            type: NotificationType.RIDE_REQUEST,
            data: { rideId, pickupAddress, fare },
        });
    }

    notifyRideAccepted(userId: string, rideId: string, riderName: string) {
        return this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Driver assigned',
            message: `${riderName} accepted your ride.`,
            type: NotificationType.RIDE_ACCEPTED,
            data: { rideId, status: RideStatus.ACCEPTED },
        });
    }

    notifyRideArrived(userId: string, rideId: string) {
        return this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Driver arrived',
            message: 'Your driver has arrived at the pickup point.',
            type: NotificationType.RIDE_ARRIVED,
            data: { rideId, status: RideStatus.ARRIVED },
        });
    }

    notifyRideStarted(userId: string, rideId: string) {
        return this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Trip started',
            message: 'Your ride is now in progress.',
            type: NotificationType.RIDE_STARTED,
            data: { rideId, status: RideStatus.IN_PROGRESS },
        });
    }

    notifyRideCompleted(userId: string, riderId: string | null, rideId: string) {
        void this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Ride completed',
            message: 'Your trip has ended. You can rate your driver.',
            type: NotificationType.RIDE_COMPLETED,
            data: { rideId, status: RideStatus.COMPLETED },
        });
        if (riderId) {
            void this.notificationService.notifyUserNonBlocking({
                recipientId: riderId,
                title: 'Ride completed',
                message: 'The trip has been marked complete.',
                type: NotificationType.RIDE_COMPLETED,
                data: { rideId, status: RideStatus.COMPLETED },
            });
        }
    }

    notifyRideCancelledByUser(userId: string, driverId: string | null, rideId: string) {
        void this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Ride cancelled',
            message: 'You cancelled this ride.',
            type: NotificationType.RIDE_CANCELLED,
            data: { rideId, status: RideStatus.CANCELLED, cancelledBy: 'user' },
        });
        if (driverId) {
            void this.notificationService.notifyUserNonBlocking({
                recipientId: driverId,
                title: 'Ride cancelled by customer',
                message: 'The passenger cancelled this ride.',
                type: NotificationType.RIDE_CANCELLED,
                data: { rideId, status: RideStatus.CANCELLED, cancelledBy: 'user' },
            });
        }
    }

    notifyRideCancelledByDriver(userId: string, riderId: string, rideId: string) {
        void this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Ride cancelled by driver',
            message: 'Your driver cancelled this ride.',
            type: NotificationType.RIDE_CANCELLED,
            data: { rideId, status: RideStatus.CANCELLED, cancelledBy: 'driver' },
        });
        void this.notificationService.notifyUserNonBlocking({
            recipientId: riderId,
            title: 'Ride cancelled',
            message: 'You cancelled this ride.',
            type: NotificationType.RIDE_CANCELLED,
            data: { rideId, status: RideStatus.CANCELLED, cancelledBy: 'driver' },
        });
    }

    notifyReviewReceived(riderId: string, rideId: string, rating: number) {
        return this.notificationService.notifyUserNonBlocking({
            recipientId: riderId,
            title: 'New rating received',
            message: `You received a ${rating}-star rating for a completed trip.`,
            type: NotificationType.RIDE_REVIEW_RECEIVED,
            data: { rideId, rating },
        });
    }

    notifyRideComplaint(rideId: string, userId: string) {
        return this.notificationService.notifyAdmins({
            title: 'New ride complaint',
            message: 'A passenger submitted a complaint for a ride.',
            type: NotificationType.RIDE_COMPLAINT,
            sender: userId,
            data: { rideId, userId },
        });
    }
}
