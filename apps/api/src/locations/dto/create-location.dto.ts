import {
  IsString,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ minLength: 2, maxLength: 100, description: 'Office location name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ minLength: 5, maxLength: 500, description: 'Office address' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address: string;

  @ApiProperty({ description: 'Latitude coordinate (-90 to 90)' })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate (-180 to 180)' })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiProperty({ minimum: 50, maximum: 5000, description: 'Geofence radius in meters' })
  @IsNumber()
  @Min(50)
  @Max(5000)
  radiusMeters: number;
}
