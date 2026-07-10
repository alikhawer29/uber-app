import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AddCardDto } from 'src/modules/user/dto/add-card.dto';
import { EditCardDto } from 'src/modules/user/dto/edit-card.dto';
import { UserCardsService } from 'src/modules/user/services/user-cards.service';

@ApiTags('Rider — Cards')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider/cards')
export class RiderCardsController {
    constructor(private readonly userCardsService: UserCardsService) {}

    @Get()
    @ApiOperation({ summary: 'List saved cards' })
    list(@CurrentUser() rider: { id: string }) {
        return this.userCardsService.list(rider.id);
    }

    @Post()
    @ApiOperation({ summary: 'Add card' })
    add(@CurrentUser() rider: { id: string }, @Body() dto: AddCardDto) {
        return this.userCardsService.add(rider.id, dto);
    }

    @Put(':cardId')
    @ApiOperation({ summary: 'Edit card' })
    edit(
        @CurrentUser() rider: { id: string },
        @Param('cardId') cardId: string,
        @Body() dto: EditCardDto,
    ) {
        return this.userCardsService.edit(rider.id, cardId, dto);
    }

    @Delete(':cardId')
    @ApiOperation({ summary: 'Remove card' })
    remove(@CurrentUser() rider: { id: string }, @Param('cardId') cardId: string) {
        return this.userCardsService.remove(rider.id, cardId);
    }
}
