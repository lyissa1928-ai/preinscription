import { Controller, Post, Get, Body, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { LoginDto, RefreshDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Inscription (désactivée - les utilisateurs sont créés par l\'admin)' })
  async register() {
    throw new ForbiddenException({
      code: 'REGISTRATION_DISABLED',
      message: "L'inscription est désactivée. Contactez l'administrateur pour obtenir un compte.",
    });
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Connexion' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rafraîchir le token' })
  async refresh(@Body() dto: RefreshDto, @Req() req: { body?: { refreshToken?: string }; cookies?: Record<string, string> }) {
    const token = dto.refreshToken ?? req.cookies?.refreshToken ?? req.body?.refreshToken ?? '';
    return this.authService.refresh(token);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Déconnexion' })
  async logout(@Req() req: { body?: { refreshToken?: string }; cookies?: Record<string, string> }) {
    const token = req.body?.refreshToken ?? req.cookies?.refreshToken;
    await this.authService.logout(token);
    return { success: true };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Mot de passe oublié' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Utilisateur connecté' })
  async me(@Req() req: { user: { sub: string } }) {
    const user = await this.authService.me(req.user.sub);
    if (!user) throw new Error('User not found');
    return user;
  }
}
