import { Matches } from 'class-validator';

export class RequestUpdateDto {
  @Matches(/^v\d+\.\d+\.\d+$/, { message: 'version tem de ser vX.Y.Z' })
  version: string;
}
