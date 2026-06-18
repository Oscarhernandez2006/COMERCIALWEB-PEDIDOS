import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../modules/users/entities/user.entity';
import { COMPANIES } from '../common/companies';

/**
 * Crea un usuario administrador inicial si la base esta vacia.
 * Solo para desarrollo / primer arranque.
 */
@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('env') === 'production') return;

    const documentId = '1044616409';
    const existing = await this.usersService.findByDocumentId(documentId);
    if (existing) {
      // Aseguramos que el admin tenga acceso a todas las compañías.
      for (const company of COMPANIES) {
        await this.usersService.assignCompany(existing.id, company.id);
      }
      return;
    }

    const admin = await this.usersService.create({
      documentId,
      name: 'Administrador',
      password: documentId.slice(-4),
      role: UserRole.ADMIN,
    });

    // El admin puede entrar a todas las compañías.
    for (const company of COMPANIES) {
      await this.usersService.assignCompany(admin.id, company.id);
    }

    this.logger.warn(
      `Usuario admin creado -> cedula: ${documentId} | password: ${documentId.slice(-4)} (cambialo!)`,
    );

    await this.seedCarteraUser();
  }

  /**
   * Crea un usuario con perfil de cartera (aprobación de pedidos retenidos por
   * deuda) si aún no existe. Solo para desarrollo / primer arranque.
   */
  private async seedCarteraUser(): Promise<void> {
    const documentId = '1111111111';
    const existing = await this.usersService.findByDocumentId(documentId);
    if (existing) {
      for (const company of COMPANIES) {
        await this.usersService.assignCompany(existing.id, company.id);
      }
      return;
    }

    const cartera = await this.usersService.create({
      documentId,
      name: 'Cartera',
      password: documentId.slice(-4),
      role: UserRole.CARTERA,
    });

    for (const company of COMPANIES) {
      await this.usersService.assignCompany(cartera.id, company.id);
    }

    this.logger.warn(
      `Usuario cartera creado -> cedula: ${documentId} | password: ${documentId.slice(-4)} (cambialo!)`,
    );
  }
}
