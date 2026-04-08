import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSavedPlaceService } from '../services/user-saved-place.service';
import { CreateSavedPlaceDto } from '../dto/create-saved-place.dto';
import { UpdateSavedPlaceDto } from '../dto/update-saved-place.dto';
import { SavedPlaceListQueryDto } from '../dto/saved-place-list-query.dto';

@ApiTags('User — Saved places')
@ApiBearerAuth()
@Controller('user/saved-places')
export class UserSavedPlaceController {
    constructor(private readonly userSavedPlaceService: UserSavedPlaceService) {}

    @Get()
    @ApiOperation({
        summary: 'List saved places',
        description:
            'Returns addresses the user saved for ride booking. The app should send `formattedAddress`, coordinates, and optional `googlePlaceId` from Google Places.',
    })
    async list(@CurrentUser() user: { id: string }, @Query() query: SavedPlaceListQueryDto) {
        return this.userSavedPlaceService.list(user.id, query.search);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one saved place' })
    async getById(@CurrentUser() user: { id: string }, @Param('id') id: string) {
        return this.userSavedPlaceService.getById(user.id, id);
    }

    @Post()
    @ApiOperation({
        summary: 'Add a saved place',
        description:
            'Use Google Places Autocomplete / Place Details (or equivalent) on the client, then submit the chosen place’s ID, formatted address, and lat/lng here.',
    })
    async create(@CurrentUser() user: { id: string }, @Body() dto: CreateSavedPlaceDto) {
        return this.userSavedPlaceService.create(user.id, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a saved place' })
    async update(
        @CurrentUser() user: { id: string },
        @Param('id') id: string,
        @Body() dto: UpdateSavedPlaceDto,
    ) {
        return this.userSavedPlaceService.update(user.id, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remove a saved place' })
    async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
        return this.userSavedPlaceService.remove(user.id, id);
    }
}
