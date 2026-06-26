import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateOrderScheduleDto } from './dto/update-order-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Configuración administrable. La lectura del horario está disponible para
 * cualquier usuario autenticado (la usa la pantalla de toma de pedidos); la
 * edición la puede hacer un admin o un usuario con el permiso del módulo
 * (la autorización fina se valida en el servicio).
 */
@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Ventana horaria actual para crear pedidos. */
  @Get('settings/order-schedule')
  getOrderSchedule() {
    return this.settingsService.getOrderSchedule();
  }

  /** Actualiza la ventana horaria para crear pedidos (admin o permiso). */
  @Patch('admin/order-schedule')
  updateOrderSchedule(
    @Body() dto: UpdateOrderScheduleDto,
    @CurrentUser() user: User,
  ) {
    return this.settingsService.updateOrderSchedule(dto, user);
  }
}
