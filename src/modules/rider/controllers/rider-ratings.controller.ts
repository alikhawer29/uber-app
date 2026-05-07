import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { RiderRatingsService } from '../services/rider-ratings.service';

@ApiTags('Rider — Ratings & reviews')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider/ratings')
export class RiderRatingsController {
    constructor(private readonly riderRatingsService: RiderRatingsService) {}

    @Get('summary')
    @ApiOperation({
        summary: 'Overall rating stats',
        description: 'Average rating, total reviews, and per-star counts (histogram).',
    })
    summary(@CurrentUser() rider: { id: string }) {
        return this.riderRatingsService.getSummary(rider.id);
    }

    @Get('reviews')
    @ApiOperation({ summary: 'Paginated passenger reviews' })
    reviews(
        @CurrentUser() rider: { id: string },
        @Query('page') page = '1',
        @Query('limit') limit = '10',
    ) {
        return this.riderRatingsService.getReviews(rider.id, Number(page) || 1, Number(limit) || 10);
    }
}
