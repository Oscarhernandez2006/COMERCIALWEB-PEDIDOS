import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { ProvisionUsuarioDto } from './dto/provisioning.dto';

/**
 * Catálogo de módulos (rutas del front) asignables por permisos. Refleja
 * `frontend/src/lib/modules.ts` para que la suite muestre las mismas opciones.
 */
const MODULE_GROUPS = [
  {
    area: 'seller',
    label: 'Operativo · Toma de pedidos',
    modules: [
      { key: '/', label: 'Dashboard comercial' },
      { key: '/pedidos', label: 'Pedidos' },
      { key: '/pedidos/canales', label: 'Pedidos · Canales' },
      { key: '/pedidos/subproductos', label: 'Pedidos · Subproductos' },
      { key: '/cotizaciones', label: 'Cotizaciones' },
      { key: '/clientes', label: 'Cartera de Clientes' },
      { key: '/disponibilidad', label: 'Disponibilidad' },
    ],
  },
  {
    area: 'admin',
    label: 'Administrativo',
    modules: [
      { key: '/admin', label: 'Dashboard' },
      { key: '/admin/inventario', label: 'Inventario' },
      { key: '/admin/pedidos', label: 'Administración de pedidos' },
      { key: '/admin/reportes', label: 'Reportes' },
      { key: '/admin/descargar-pedidos', label: 'Descargar pedidos · Cortes' },
      {
        key: '/admin/descargar-pedidos-subproductos-cerdo',
        label: 'Descargar subproductos · Cerdo',
      },
      {
        key: '/admin/descargar-pedidos-subproductos-res',
        label: 'Descargar subproductos · Res',
      },
      { key: '/admin/listas-precios', label: 'Listas de precios' },
      { key: '/admin/clientes', label: 'Clientes' },
      { key: '/admin/presupuestos', label: 'Presupuestos' },
      { key: '/admin/rentabilidad', label: 'Rentabilidad · Costos' },
      { key: '/admin/cartera', label: 'Aprobación de cartera' },
      {
        key: '/admin/controlador-subproductos',
        label: 'Controlador Subproductos',
      },
      { key: '/admin/horario-pedidos', label: 'Horario de pedidos' },
      { key: '/admin/usuarios', label: 'Usuarios' },
    ],
  },
];

const MODULOS_VALIDOS = new Set(
  MODULE_GROUPS.flatMap((g) => g.modules.map((m) => m.key)),
);

/**
 * Aprovisionamiento de usuarios controlado por la suite (SCTOOLS). Crea/actualiza
 * usuarios, cambia estado (activo/bloqueo), contraseña y permisos escribiendo
 * directamente en la BD de esta aplicación (la suite es la fuente de verdad).
 */
@Injectable()
export class ProvisioningService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    // Garantiza la columna de bloqueo aunque DB_SYNCHRONIZE esté desactivado.
    await this.usersRepository.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS suite_blocked boolean NOT NULL DEFAULT false`,
    );
  }

  catalogo() {
    return {
      roles: Object.values(UserRole),
      grupos: MODULE_GROUPS,
    };
  }

  private toRole(rol?: string): UserRole | undefined {
    if (rol === undefined) return undefined;
    const valor = rol.trim().toLowerCase();
    const encontrado = Object.values(UserRole).find((r) => r === valor);
    return encontrado ?? UserRole.SELLER;
  }

  private sanitizarPermisos(permisos?: string[]): string[] {
    if (!Array.isArray(permisos)) return [];
    return Array.from(new Set(permisos.filter((p) => MODULOS_VALIDOS.has(p))));
  }

  async obtenerPorCedula(cedula: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { documentId: cedula.trim() },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /**
   * Lista todos los usuarios (para que la suite los importe y refleje su rol y
   * permisos actuales). Forma normalizada común con las demás apps.
   */
  async listarUsuarios() {
    const users = await this.usersRepository.find({ order: { name: 'ASC' } });
    return users.map((u) => ({
      cedula: u.documentId,
      nombre: u.name,
      email: u.email ?? null,
      rol: u.role,
      activo: u.active,
      bloqueadoSuite: u.suiteBlocked,
      permisos: u.permissions ?? [],
    }));
  }

  /** Crea o actualiza (upsert por cédula) un usuario. */
  async upsertUsuario(dto: ProvisionUsuarioDto): Promise<User> {
    const documentId = dto.cedula.trim();
    if (!documentId) throw new BadRequestException('La cédula es obligatoria');

    let user = await this.usersRepository.findOne({ where: { documentId } });

    if (!user) {
      const password =
        dto.password && dto.password.length
          ? dto.password
          : crypto.randomBytes(24).toString('hex');
      user = this.usersRepository.create({
        documentId,
        name: (dto.nombre ?? '').trim() || documentId,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        role: this.toRole(dto.rol) ?? UserRole.SELLER,
        permissions: this.sanitizarPermisos(dto.permisos),
        active: dto.activo ?? true,
        passwordHash: await bcrypt.hash(password, 10),
        // Alta desde la suite: no forzamos cambio de contraseña.
        mustChangePassword: false,
      });
      return this.usersRepository.save(user);
    }

    if (dto.nombre !== undefined) user.name = dto.nombre.trim();
    if (dto.email !== undefined) {
      user.email = dto.email ? dto.email.toLowerCase() : undefined;
    }
    const role = this.toRole(dto.rol);
    if (role !== undefined) user.role = role;
    if (dto.permisos !== undefined) {
      user.permissions = this.sanitizarPermisos(dto.permisos);
    }
    if (dto.activo !== undefined) user.active = dto.activo;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    return this.usersRepository.save(user);
  }

  async setEstado(
    cedula: string,
    activo?: boolean,
    bloqueadoSuite?: boolean,
  ): Promise<User> {
    const user = await this.obtenerPorCedula(cedula);
    if (activo !== undefined) user.active = activo;
    if (bloqueadoSuite !== undefined) user.suiteBlocked = bloqueadoSuite;
    return this.usersRepository.save(user);
  }

  async setPassword(cedula: string, password: string): Promise<User> {
    const user = await this.obtenerPorCedula(cedula);
    user.passwordHash = await bcrypt.hash(password, 10);
    user.mustChangePassword = false;
    return this.usersRepository.save(user);
  }

  async setPermisos(
    cedula: string,
    rol?: string,
    permisos?: string[],
  ): Promise<User> {
    const user = await this.obtenerPorCedula(cedula);
    const role = this.toRole(rol);
    if (role !== undefined) user.role = role;
    if (permisos !== undefined) {
      user.permissions = this.sanitizarPermisos(permisos);
    }
    return this.usersRepository.save(user);
  }
}
