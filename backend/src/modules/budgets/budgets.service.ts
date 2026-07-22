import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { Projection, ProjectionMode } from './entities/projection.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SaveBudgetsDto } from './dto/save-budgets.dto';
import { SaveProjectionDto } from './dto/save-projection.dto';

/** Permiso de módulo que habilita la gestión de presupuestos. */
export const BUDGETS_PERMISSION = '/admin/presupuestos';

/** Fila de presupuesto de un vendedor para el mes consultado. */
export interface BudgetRow {
  sellerId: string;
  sellerName: string;
  siesaSellerCode: string | null;
  targetKilos: number;
  expectedRevenue: number;
}

/** Configuración de la proyección de una compañía para un mes. */
export interface ProjectionConfig {
  mode: ProjectionMode;
  revenue: number;
  kilos: number;
  workingDays: string[];
}

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Projection)
    private readonly projectionsRepository: Repository<Projection>,
    @InjectRepository(UserCompany)
    private readonly userCompaniesRepository: Repository<UserCompany>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Lista los vendedores asignados a una compañía junto con su presupuesto del
   * mes/año indicado (0 si aún no se ha cargado).
   */
  async list(
    companyId: string,
    month: number,
    year: number,
  ): Promise<BudgetRow[]> {
    const mappings = await this.userCompaniesRepository.find({
      where: { companyId, active: true },
      relations: { user: true },
    });

    const budgets = await this.budgetsRepository.find({
      where: { companyId, month, year },
    });
    const bySeller = new Map(budgets.map((b) => [b.sellerId, b]));

    const rows: BudgetRow[] = mappings
      .filter((m) => m.user && m.user.active && m.user.role === UserRole.SELLER)
      .map((m) => {
        const b = bySeller.get(m.userId);
        return {
          sellerId: m.userId,
          sellerName: m.user.name,
          siesaSellerCode: m.siesaSellerCode ?? null,
          targetKilos: Number(b?.targetKilos ?? 0),
          expectedRevenue: Number(b?.expectedRevenue ?? 0),
        };
      });

    rows.sort((a, b) => a.sellerName.localeCompare(b.sellerName));
    return rows;
  }

  /**
   * Crea o actualiza el presupuesto del mes para varios vendedores de una
   * compañía (guardado de la tabla completa).
   */
  async save(
    companyId: string,
    dto: SaveBudgetsDto,
    user: User,
  ): Promise<BudgetRow[]> {
    await this.assertCanManage(user);

    for (const item of dto.items) {
      const existing = await this.budgetsRepository.findOne({
        where: {
          companyId,
          sellerId: item.sellerId,
          month: dto.month,
          year: dto.year,
        },
      });

      if (existing) {
        existing.targetKilos = item.targetKilos;
        existing.expectedRevenue = item.expectedRevenue;
        await this.budgetsRepository.save(existing);
      } else {
        await this.budgetsRepository.insert({
          companyId,
          sellerId: item.sellerId,
          month: dto.month,
          year: dto.year,
          targetKilos: item.targetKilos,
          expectedRevenue: item.expectedRevenue,
        });
      }
    }

    return this.list(companyId, dto.month, dto.year);
  }

  /** Presupuesto de un vendedor concreto (para el tablero de gestión). */
  async getSellerBudget(
    companyId: string,
    sellerId: string,
    month: number,
    year: number,
  ): Promise<{ targetKilos: number; expectedRevenue: number } | null> {
    const b = await this.budgetsRepository.findOne({
      where: { companyId, sellerId, month, year },
    });
    if (!b) return null;
    return {
      targetKilos: Number(b.targetKilos),
      expectedRevenue: Number(b.expectedRevenue),
    };
  }

  /**
   * Configuración de la proyección de una compañía para un mes (para el editor
   * del presupuesto). Devuelve valores por defecto si aún no se ha creado.
   */
  async getProjection(
    companyId: string,
    month: number,
    year: number,
  ): Promise<ProjectionConfig> {
    const p = await this.projectionsRepository.findOne({
      where: { companyId, month, year },
    });
    return {
      mode: p?.mode ?? 'month',
      revenue: Number(p?.revenue ?? 0),
      kilos: Number(p?.kilos ?? 0),
      workingDays: p?.workingDays ?? [],
    };
  }

  /** Crea o actualiza la proyección de ventas de una compañía para un mes. */
  async saveProjection(
    companyId: string,
    dto: SaveProjectionDto,
    user: User,
  ): Promise<ProjectionConfig> {
    await this.assertCanManage(user);

    const existing = await this.projectionsRepository.findOne({
      where: { companyId, month: dto.month, year: dto.year },
    });

    if (existing) {
      existing.mode = dto.mode;
      existing.revenue = dto.revenue;
      existing.kilos = dto.kilos;
      existing.workingDays = dto.workingDays;
      await this.projectionsRepository.save(existing);
    } else {
      await this.projectionsRepository.insert({
        companyId,
        month: dto.month,
        year: dto.year,
        mode: dto.mode,
        revenue: dto.revenue,
        kilos: dto.kilos,
        workingDays: dto.workingDays,
      });
    }

    return this.getProjection(companyId, dto.month, dto.year);
  }

  /**
   * Proyección TOTAL DEL MES ya calculada (para el tablero). En modo 'day' se
   * multiplica el valor diario por la cantidad de días hábiles seleccionados.
   */
  async getCompanyProjection(
    companyId: string,
    month: number,
    year: number,
  ): Promise<{ revenue: number; kilos: number } | null> {
    const p = await this.projectionsRepository.findOne({
      where: { companyId, month, year },
    });
    if (!p) return null;
    const workingDays = Array.isArray(p.workingDays) ? p.workingDays.length : 0;
    const factor = p.mode === 'day' ? workingDays : 1;
    const revenue = Number(p.revenue) * factor;
    const kilos = Number(p.kilos) * factor;
    if (revenue <= 0 && kilos <= 0) return null;
    return { revenue, kilos };
  }

  /** Verifica que el usuario pueda administrar presupuestos. */
  private async assertCanManage(user: User): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    const fullUser = await this.usersService.findById(user.id);
    if ((fullUser.permissions ?? []).includes(BUDGETS_PERMISSION)) return;

    const companies = await this.usersService.findCompaniesForUser(user.id);
    if (companies.some((c) => (c.permissions ?? []).includes(BUDGETS_PERMISSION))) {
      return;
    }

    throw new ForbiddenException('No tienes permiso para gestionar presupuestos.');
  }
}
