import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/constants/user.constants';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateRideDto } from '../dto/create-ride.dto';
import { ListUserRidesQueryDto } from '../dto/list-user-rides-query.dto';
import { RideQuoteQueryDto } from '../dto/ride-quote-query.dto';
import { ValidatePromoDto } from '../dto/validate-promo.dto';
import { ValidateScheduleDto } from '../dto/validate-schedule.dto';
import { EstimateRideDto } from '../dto/estimate-ride.dto';
import { BookRideDto } from '../dto/book-ride.dto';
import { ScheduleRideDto } from '../dto/schedule-ride.dto';
import { CancelRideDto } from '../dto/cancel-ride.dto';
import { RideReviewDto } from '../dto/ride-review.dto';
import { SendRideMessageDto } from '../dto/send-ride-message.dto';
import { RideComplaintDto } from '../dto/ride-complaint.dto';
import { UserRideService } from '../services/user-ride.service';
import { RideChatService } from '../services/ride-chat.service';

@ApiTags('User — Ride booking')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/rides')
export class UserRideController {
    constructor(
        private readonly userRideService: UserRideService,
        private readonly rideChatService: RideChatService,
    ) {}

    @Post('estimate')
    @ApiOperation({ summary: 'Get fare estimate (Uber-like booking)' })
    estimate(@Body() dto: EstimateRideDto) {
        return this.userRideService.estimate(dto);
    }

    @Get('quote')
    @ApiOperation({
        summary: 'Quote ride options (Figma: Choose a ride)',
        description:
            'Returns distance, estimated duration, and per vehicle-type fare breakdown using admin fare rules.',
    })
    quote(@Query() query: RideQuoteQueryDto) {
        return this.userRideService.quote(query);
    }

    @Post('validate-schedule')
    @ApiOperation({
        summary: 'Validate scheduled date/time',
        description:
            'Matches Figma dialogs: date must be today or future; scheduled time must be in the future.',
    })
    validateSchedule(@Body() dto: ValidateScheduleDto) {
        return this.userRideService.validateSchedule(dto);
    }

    @Post('promo/validate')
    @ApiOperation({
        summary: 'Validate promo code',
        description: 'Optional `subtotal` from the quote so min-order and discount can be checked.',
    })
    validatePromo(@Body() dto: ValidatePromoDto) {
        return this.userRideService.validatePromo(dto);
    }

    @Post('book')
    @ApiOperation({
        summary: 'Book ride (Now or Later)',
        description:
            'Omit schedule fields for instant booking (status searching). Send `scheduledAt` (ISO) or `scheduledAtDate` + `scheduledAtTime` for a scheduled ride (status scheduled).',
    })
    book(@CurrentUser() user: { id: string }, @Body() dto: BookRideDto) {
        return this.userRideService.bookRide(user.id, dto);
    }

    @Post('schedule')
    @ApiOperation({
        summary: 'Schedule a trip (legacy alias)',
        description: 'Same body as POST /user/rides/book — prefer `book` with schedule fields.',
    })
    schedule(@CurrentUser() user: { id: string }, @Body() dto: ScheduleRideDto) {
        return this.userRideService.schedule(user.id, dto);
    }

    @Get('active')
    @ApiOperation({ summary: 'Get active ride for current user' })
    active(@CurrentUser() user: { id: string }) {
        return this.userRideService.getActiveRide(user.id);
    }

    @Post()
    @ApiOperation({
        summary: 'Create ride (immediate or scheduled)',
        description:
            'Persists a row aligned with the `rides` table: locations, `start_time`, `is_scheduled`, pricing, `payment_type`, OTP, status pending.',
    })
    create(@CurrentUser() user: { id: string }, @Body() dto: CreateRideDto) {
        return this.userRideService.createRide(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List current user rides' })
    list(@CurrentUser() user: { id: string }, @Query() query: ListUserRidesQueryDto) {
        return this.userRideService.listMyRides(user.id, query);
    }

    @Get(':rideId')
    @ApiOperation({ summary: 'Get ride details' })
    detail(@CurrentUser() user: { id: string }, @Param('rideId') rideId: string) {
        return this.userRideService.getRideDetails(user.id, rideId);
    }

    @Post(':rideId/cancel')
    @ApiOperation({ summary: 'Cancel ride (active or scheduled)' })
    cancel(@CurrentUser() user: { id: string }, @Param('rideId') rideId: string, @Body() dto: CancelRideDto) {
        return this.userRideService.cancelRide(user.id, rideId, dto);
    }

    @Post(':rideId/review')
    @ApiOperation({ summary: 'Submit rating & review after completion' })
    review(@CurrentUser() user: { id: string }, @Param('rideId') rideId: string, @Body() dto: RideReviewDto) {
        return this.userRideService.submitReview(user.id, rideId, dto);
    }

    @Get(':rideId/messages')
    @ApiOperation({ summary: 'Get ride messages' })
    messages(@CurrentUser() user: { id: string }, @Param('rideId') rideId: string) {
        return this.rideChatService.listMessagesForUser(user.id, rideId);
    }

    @Post(':rideId/messages')
    @ApiOperation({ summary: 'Send ride message' })
    sendMessage(
        @CurrentUser() user: { id: string },
        @Param('rideId') rideId: string,
        @Body() dto: SendRideMessageDto,
    ) {
        return this.rideChatService.sendMessageFromUser(user.id, rideId, dto.message);
    }

    @Post(':rideId/complaint')
    @ApiOperation({ summary: 'Submit complaint / report a problem' })
    complaint(
        @CurrentUser() user: { id: string },
        @Param('rideId') rideId: string,
        @Body() dto: RideComplaintDto,
    ) {
        return this.userRideService.submitComplaint(user.id, rideId, dto);
    }
}
