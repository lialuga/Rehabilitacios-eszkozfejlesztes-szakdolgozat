import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @Length(1, 64)
  userId!: string;

  @IsString()
  @Length(1, 64)
  clientId!: string;

  @IsISO8601()
  startedAt!: string;

  @IsInt()
  @Min(0)
  @Max(24 * 60 * 60 * 1000)
  durationMs!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  avgStability!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  inwardPercent!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  balance!: number;

  @IsInt()
  @Min(0)
  motorActivations!: number;

  @IsInt()
  @Min(0)
  outwardEvents!: number;

  @IsInt()
  @Min(0)
  avgCorrectionMs!: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  peakAngle!: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  avgAngle!: number;

  @IsInt()
  @Min(0)
  @Max(90)
  inwardThreshold!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  outwardThreshold?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  steps?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(400)
  cadence?: number | null;

  @IsIn(['ble', 'demo'])
  source!: 'ble' | 'demo';

  @IsArray()
  @ArrayMaxSize(200)
  @IsNumber({}, { each: true })
  trace!: number[];
}
