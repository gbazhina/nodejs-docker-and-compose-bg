import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class HashingService {
  hash(data: string): Promise<string> {
    return bcrypt.hash(data, SALT_ROUNDS);
  }

  compare(data: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
