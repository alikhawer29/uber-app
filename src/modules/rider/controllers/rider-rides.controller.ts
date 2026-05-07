import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { RejectRideDto } from '../dto/reject-ride.dto';
import { CancelRideRiderDto } from '../dto/cancel-ride-rider.dto';
import { UpdateRiderLocationDto } from '../dto/update-rider-location.dto';
import { EndRideDto } from '../dto/end-ride.dto';
import { RiderAvailabilityDto } from '../dto/rider-availability.dto';
import { RiderRidesService } from '../services/rider-rides.service';
import { SendRideMessageDto } from 'src/modules/user/dto/send-ride-message.dto';

@ApiTags('Rider — Rides')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider/rides')
export class RiderRidesController {
    constructor(private readonly riderRidesService: RiderRidesService) { }

    @Post(':rideId/accept')
    @ApiOperation({ summary: 'Accept ride request' })
    accept(@CurrentUser() rider: { id: string }, @Param('rideId') rideId: string) {
        return this.riderRidesService.acceptRide(rider.id, rideId);
    }

    @Post(':rideId/reject')
    @ApiOperation({ summary: 'Reject ride request' })
    reject(
        @CurrentUser() rider: { id: string },
        @Param('rideId') rideId: string,
        @Body() dto: RejectRideDto,
    ) {
        return this.riderRidesService.rejectRide(rider.id, rideId, dto.reason);
    }

    @Post(':rideId/arrived')
    @ApiOperation({ summary: 'Mark arrived at pickup' })
    arrived(@CurrentUser() rider: { id: string }, @Param('rideId') rideId: string) {
        return this.riderRidesService.markArrived(rider.id, rideId);
    }

    @Post(':rideId/start')
    @ApiOperation({ summary: 'Start ride' })
    start(@CurrentUser() rider: { id: string }, @Param('rideId') rideId: string) {
        return this.riderRidesService.startRide(rider.id, rideId);
    }

    @Post(':rideId/end')
    @ApiOperation({
        summary: 'End ride',
        description:
            'Completes payment (wallet/card), credits your driver wallet, and for cash rides requires `cashCollectedAmount` (what the passenger paid).',
    })
    end(
        @CurrentUser() rider: { id: string },
        @Param('rideId') rideId: string,
        @Body() dto: EndRideDto,
    ) {
        return this.riderRidesService.endRide(rider.id, rideId, dto ?? {});
    }

    @Post(':rideId/cancel')
    @ApiOperation({ summary: 'Cancel ride (rider)' })
    cancel(
        @CurrentUser() rider: { id: string },
        @Param('rideId') rideId: string,
        @Body() dto: CancelRideRiderDto,
    ) {
        return this.riderRidesService.cancelRide(rider.id, rideId, dto.reason);
    }

    @Get('active')
    @ApiOperation({ summary: 'Get rider active ride' })
    active(@CurrentUser() rider: { id: string }) {
        return this.riderRidesService.getActiveRide(rider.id);
    }

    @Get()
    @ApiOperation({ summary: 'Rider ride history' })
    history(
        @CurrentUser() rider: { id: string },
        @Query('page') page = '1',
        @Query('limit') limit = '10',
        @Query('status') status: 'completed' | 'cancelled' | 'all' = 'all',
    ) {
        return this.riderRidesService.history(rider.id, Number(page) || 1, Number(limit) || 10, status);
    }

    @Get(':rideId/messages')
    @ApiOperation({ summary: 'Get ride messages (rider)' })
    messages(@CurrentUser() rider: { id: string }, @Param('rideId') rideId: string) {
        return this.riderRidesService.listMessages(rider.id, rideId);
    }

    @Post(':rideId/messages')
    @ApiOperation({ summary: 'Send ride message (rider)' })
    sendMessage(
        @CurrentUser() rider: { id: string },
        @Param('rideId') rideId: string,
        @Body() dto: SendRideMessageDto,
    ) {
        return this.riderRidesService.sendMessage(rider.id, rideId, dto.message);
    }
}

@ApiTags('Rider — Location')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider')
export class RiderLocationController {
    constructor(private readonly riderRidesService: RiderRidesService) { }

    @Post('location')
    @ApiOperation({ summary: 'Update rider location' })
    updateLocation(@CurrentUser() rider: { id: string }, @Body() dto: UpdateRiderLocationDto) {
        return this.riderRidesService.updateLocation(rider.id, dto);
    }

    @Patch('availability')
    @ApiOperation({
        summary: 'Go online or offline',
        description:
            'You must call POST /rider/location at least once before toggling online. Only online riders receive ride offers.',
    })
    setAvailability(@CurrentUser() rider: { id: string }, @Body() dto: RiderAvailabilityDto) {
        return this.riderRidesService.setAvailability(rider.id, dto.isOnline);
    }
}

