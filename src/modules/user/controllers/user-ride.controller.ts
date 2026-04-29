import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/constants/user.constants';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateRideDto } from '../dto/create-ride.dto';
import { ListUserRidesQueryDto } from '../dto/list-user-rides-query.dto';
import { RideQuoteQueryDto } from '../dto/ride-quote-query.dto';
import { ValidatePromoDto } from '../dto/validate-promo.dto';
import { ValidateScheduleDto } from '../dto/validate-schedule.dto';
import { UserRideService } from '../services/user-ride.service';

@ApiTags('User — Ride booking')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/rides')
export class UserRideController {
    constructor(private readonly userRideService: UserRideService) {}

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
}
