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
  }
}
