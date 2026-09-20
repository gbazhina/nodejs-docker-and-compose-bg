import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingService } from '../hashing/hashing.service';

interface PostgresError {
  code?: string;
  detail?: string;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hashingService.hash(
      createUserDto.password,
    );
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      this.handleUniqueViolation(error);
    }
  }

  async findMany(query: FindManyOptions<User>): Promise<User[]> {
    return this.userRepository.find(query);
  }

  async findOne(query: FindOneOptions<User>): Promise<User> {
    const user = await this.userRepository.findOne(query);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  async updateOne(
    query: FindOptionsWhere<User>,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findOne({ where: query });

    if (updateUserDto.password) {
      updateUserDto.password = await this.hashingService.hash(
        updateUserDto.password,
      );
    }

    Object.assign(user, updateUserDto);

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      this.handleUniqueViolation(error);
    }
  }

  async removeOne(query: FindOptionsWhere<User>): Promise<User> {
    const user = await this.findOne({ where: query });
    return this.userRepository.remove(user);
  }

  /**
   * Превращает ошибку нарушения уникальности username/email (Postgres code
   * 23505) в понятный 409 Conflict вместо необработанной 500-й ошибки.
   * Любую другую ошибку пробрасывает как есть.
   */
  private handleUniqueViolation(error: unknown): never {
    const dbError = error as PostgresError;

    if (dbError?.code === POSTGRES_UNIQUE_VIOLATION) {
      const detail = dbError.detail ?? '';

      if (detail.includes('username')) {
        throw new ConflictException(
          'Пользователь с таким username уже существует',
        );
      }

      if (detail.includes('email')) {
        throw new ConflictException(
          'Пользователь с такой почтой уже существует',
        );
      }

      throw new ConflictException(
        'Пользователь с такими данными уже существует',
      );
    }

    throw error;
  }
}
