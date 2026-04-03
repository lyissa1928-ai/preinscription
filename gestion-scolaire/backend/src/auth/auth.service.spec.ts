import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const mockBcryptCompare = jest.fn();
jest.mock('bcrypt', () => ({
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    passwordHash: '$2b$10$hashed',
    role: 'ADMIN',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockBcryptCompare.mockResolvedValue(true);
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    const mockJwt = {
      sign: jest.fn().mockReturnValue('fake-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return token and user on valid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.login('test@test.com', 'password123');

      expect(result).toHaveProperty('access_token', 'fake-jwt-token');
      expect(result.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login('unknown@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(false);

      await expect(service.login('test@test.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user (select excludes passwordHash)', async () => {
      const userWithoutPassword = {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(
        userWithoutPassword,
      );

      const result = await service.validateUser('user-1');

      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should return null if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('unknown');

      expect(result).toBeNull();
    });
  });
});
