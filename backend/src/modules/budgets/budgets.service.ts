import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SaveBudgetsDto } from './dto/save-budgets.dto';

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

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
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
