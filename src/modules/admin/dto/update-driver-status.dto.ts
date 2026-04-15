import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UserStatus } from 'src/common/constants/user.constants';

export class UpdateDriverStatusDto {
    @ApiProperty({
        enum: [UserStatus.ACTIVE, UserStatus.INACTIVE],
        example: UserStatus.INACTIVE,
        description: 'Set driver (rider) to active or inactive',
    })
    @IsIn([UserStatus.ACTIVE, UserStatus.INACTIVE], {
        message: 'status must be active or inactive',
    })
    status: UserStatus.ACTIVE | UserStatus.INACTIVE;
}
