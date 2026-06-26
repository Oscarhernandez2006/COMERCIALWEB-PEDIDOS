import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderScheduleSetting } from './entities/order-schedule-setting.entity';
import { UpdateOrderScheduleDto } from './dto/update-order-schedule.dto';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';

/** Clave del módulo (permiso) que habilita configurar el horario de pedidos. */
export const ORDER_SCHEDULE_PERMISSION = '/admin/horario-pedidos';

/**
 * Configuración administrable de la aplicación. Por ahora gestiona la ventana
 * horaria para crear pedidos (hora de Colombia).
 */
@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(OrderScheduleSetting)
    private readonly scheduleRepo: Repository<OrderScheduleSetting>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Devuelve la configuración de horario (fila única). Si aún no existe, crea
   * una por defecto (7:00 a.m. – 4:30 p.m., activa).
   */
  async getOrderSchedule(): Promise<OrderScheduleSetting> {
    const existing = await this.scheduleRepo.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    if (existing.length > 0) return existing[0];

    const created = this.scheduleRepo.create({
      enabled: true,
      openHour: 7,
      openMinute: 0,
      closeHour: 16,
      closeMinute: 30,
    });
    return this.scheduleRepo.save(created);
  }

  /** Actualiza la configuración de horario (fila única). */
  async updateOrderSchedule(
    dto: UpdateOrderScheduleDto,
    user: User,
  ): Promise<OrderScheduleSetting> {
    await this.assertCanManage(user);

    const current = await this.getOrderSchedule();
    current.enabled = dto.enabled;
    current.openHour = dto.openHour;
    current.openMinute = dto.openMinute;
    current.closeHour = dto.closeHour;
    current.closeMinute = dto.closeMinute;
    return this.scheduleRepo.save(current);
  }

  /**
   * Verifica que el usuario pueda gestionar el horario: admin, o que tenga el
   * permiso del módulo asignado de forma global o en alguna de sus compañías.
   */
  private async assertCanManage(user: User): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    const fullUser = await this.usersService.findById(user.id);
    const globalPerms = fullUser.permissions ?? [];
    if (globalPerms.includes(ORDER_SCHEDULE_PERMISSION)) return;

    const companies = await this.usersService.findCompaniesForUser(user.id);
    const hasCompanyPerm = companies.some((c) =>
      (c.permissions ?? []).includes(ORDER_SCHEDULE_PERMISSION),
    );
    if (hasCompanyPerm) return;

    throw new ForbiddenException(
      'No tienes permiso para configurar el horario de pedidos.',
    );
  }
}
