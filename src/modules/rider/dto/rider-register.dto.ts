import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RiderRegisterDto {
    @ApiProperty({ example: 'Jane' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ example: 'Rider' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    lastName: string;

    @ApiProperty({ example: '+1 555 123 4567' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    phone: string;

    @ApiProperty({ example: 'jane.rider@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    })
    password: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    confirmPassword: string;

    @ApiProperty({ description: 'Vehicle type id from GET /rider/vehicle-types' })
    @IsMongoId()
    vehicleTypeId: string;

    @ApiProperty({ example: 'Toyota' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    brandName: string;

    @ApiProperty({ example: 'Camry' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    vehicleName: string;

    @ApiProperty({ example: 'Silver' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    vehicleColor: string;

    @ApiProperty({ example: 'ABC-1234' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    licensePlateNumber: string;
}
