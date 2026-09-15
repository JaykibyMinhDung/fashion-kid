import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
export class CreateReviewDto {
  @IsUUID() orderItemId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() comment!: string;
}
export class UpdateReviewDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() comment?: string;
}
export class ReviewStatusDto {
  @IsString() status!: 'PUBLISHED' | 'HIDDEN';
}
export class ReviewQueryDto {
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() sort?: 'newest' | 'oldest' | 'rating';
}
