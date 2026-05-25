import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { UserDriverReviewsService } from '../services/user-driver-reviews.service';

@ApiTags('User — Driver reviews')
@ApiBearerAuth()
@Roles(UserRole.USER, UserRole.RIDER)
@Controller('user/drivers')
export class UserDriverReviewsController {
    constructor(private readonly userDriverReviewsService: UserDriverReviewsService) {}

    @Get(':driverId/ratings')
    @ApiOperation({
        summary: 'Driver ratings, reviews, and stats',
        description:
            'Average rating, histogram, and paginated passenger reviews (all users who rated this driver).',
    })
    summary(
        @Param('driverId') driverId: string,
        @Query('page') page = '1',
        @Query('limit') limit = '50',
    ) {
        return this.userDriverReviewsService.getSummary(
            driverId,
            Number(page) || 1,
            Number(limit) || 50,
        );
    }

    @Get(':driverId/reviews')
    @ApiOperation({
        summary: 'Driver ratings and reviews',
        description: 'Summary plus paginated passenger reviews for the given driverId.',
    })
    reviews(
        @Param('driverId') driverId: string,
        @Query('page') page = '1',
        @Query('limit') limit = '10',
    ) {
        return this.userDriverReviewsService.getReviews(
            driverId,
            Number(page) || 1,
            Number(limit) || 10,
        );
    }
}
