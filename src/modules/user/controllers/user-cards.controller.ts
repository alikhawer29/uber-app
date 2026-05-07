import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/constants/user.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AddCardDto } from '../dto/add-card.dto';
import { EditCardDto } from '../dto/edit-card.dto';
import { UserCardsService } from '../services/user-cards.service';

@ApiTags('User — Cards')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/cards')
export class UserCardsController {
    constructor(private readonly userCardsService: UserCardsService) { }

    @Get()
    @ApiOperation({ summary: 'List user cards' })
    list(@CurrentUser() user: { id: string }) {
        return this.userCardsService.list(user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Add card' })
    add(@CurrentUser() user: { id: string }, @Body() dto: AddCardDto) {
        return this.userCardsService.add(user.id, dto);
    }

    @Put(':cardId')
    @ApiOperation({ summary: 'Edit card' })
    edit(@CurrentUser() user: { id: string }, @Param('cardId') cardId: string, @Body() dto: EditCardDto) {
        return this.userCardsService.edit(user.id, cardId, dto);
    }

    @Delete(':cardId')
    @ApiOperation({ summary: 'Delete card' })
    remove(@CurrentUser() user: { id: string }, @Param('cardId') cardId: string) {
        return this.userCardsService.remove(user.id, cardId);
    }
}

