import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { ClientBudget } from './entities/client-budget.entity';
import { Projection, ProjectionMode } from './entities/projection.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ClientsService } from '../clients/clients.service';
import { SaveBudgetsDto } from './dto/save-budgets.dto';
import { SaveClientBudgetsDto } from './dto/save-client-budgets.dto';
import { SaveProjectionDto } from './dto/save-projection.dto';
import { baseCompanyId, BUDGET_APART_SELLER_DOCS } from '../../common/companies';

/** Permiso de módulo que habilita la gestión de presupuestos. */
export const BUDGETS_PERMISSION = '/admin/presupuestos';

/** Fila de presupuesto de un vendedor para el mes consultado. */
export interface BudgetRow {
  sellerId: string;
  sellerName: string;
  siesaSellerCode: string | null;
  targetKilos: number;
  expectedRevenue: number;
  /** true si el vendedor va "por tienda/cliente" (meta por cada cliente). */
  clientBudget: boolean;
}

/** Fila de presupuesto de un cliente/tienda de un vendedor "por cliente". */
export interface ClientBudgetRow {
  clientCode: string;
  clientName: string;
  branch: string | null;
  branchName: string | null;
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
    @InjectRepository(ClientBudget)
    private readonly clientBudgetsRepository: Repository<ClientBudget>,
    @InjectRepository(Projection)
    private readonly projectionsRepository: Repository<Projection>,
    @InjectRepository(UserCompany)
    private readonly userCompaniesRepository: Repository<UserCompany>,
    private readonly usersService: UsersService,
    private readonly clientsService: ClientsService,
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
    // Las compañías virtuales (p. ej. MONTERIA TAT) comparten los vendedores de
    // su compañía base (Agropecuaria), pero sus presupuestos son propios: el
    // listado se resuelve por la base y los valores se leen por `companyId`.
    const mappings = await this.userCompaniesRepository.find({
      where: { companyId: baseCompanyId(companyId), active: true },
      relations: { user: true },
    });

    const budgets = await this.budgetsRepository.find({
      where: { companyId, month, year },
    });
    const bySeller = new Map(budgets.map((b) => [b.sellerId, b]));
    const clientDocs = this.clientBudgetDocs();

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
          clientBudget: clientDocs.has(m.user.documentId),
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
    // Vendedores "por cliente" (p. ej. Juan Sierra): su meta es la suma de sus
    // clientes/tiendas, no la fila única de `budgets`.
    if (await this.isClientBudgetSeller(sellerId)) {
      const rows = await this.clientBudgetsRepository.find({
        where: { companyId, sellerId, month, year },
      });
      if (rows.length === 0) return null;
      return {
        targetKilos: rows.reduce((s, r) => s + Number(r.targetKilos), 0),
        expectedRevenue: rows.reduce(
          (s, r) => s + Number(r.expectedRevenue),
          0,
        ),
      };
    }

    const b = await this.budgetsRepository.findOne({
      where: { companyId, sellerId, month, year },
    });
    if (!b) return null;
    return {
      targetKilos: Number(b.targetKilos),
      expectedRevenue: Number(b.expectedRevenue),
    };
  }

  /** Cédulas (document_id) configuradas como "presupuesto por cliente". */
  private clientBudgetDocs(): Set<string> {
    return new Set(BUDGET_APART_SELLER_DOCS.map((d) => d.trim()).filter(Boolean));
  }

  /** ¿El vendedor maneja presupuesto por cliente/tienda? (config, sin DB extra). */
  async isClientBudgetSeller(sellerId: string): Promise<boolean> {
    const docs = this.clientBudgetDocs();
    if (docs.size === 0) return false;
    const u = await this.usersService.findById(sellerId).catch(() => null);
    return !!u && docs.has(u.documentId);
  }

  /**
   * Lista los clientes/tiendas asignados a un vendedor (por CODIGO_VENDEDOR)
   * junto con su presupuesto del mes (0 si aún no se ha cargado). Base del editor
   * de presupuesto por cliente y del desglose por tienda en el tablero.
   */
  async listClientBudgets(
    companyId: string,
    sellerId: string,
    month: number,
    year: number,
  ): Promise<ClientBudgetRow[]> {
    const sellerCode =
      (await this.usersService.getSellerCode(sellerId, companyId)) ??
      (await this.usersService.findById(sellerId).catch(() => null))
        ?.siesaSellerCode ??
      '';
    if (!sellerCode.trim()) return [];

    const clients = await this.clientsService.findAll(
      companyId,
      undefined,
      sellerCode,
    );
    // El presupuesto es POR CLIENTE (código): un cliente con varias sucursales
    // debe aparecer UNA sola vez (igual que la Cartera de Clientes, que
    // deduplica por NIT/código). Se conserva la primera sucursal como referencia.
    const seen = new Set<string>();
    const uniqueClients = clients.filter((c) => {
      const key = (c.code ?? '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const saved = await this.clientBudgetsRepository.find({
      where: { companyId, sellerId, month, year },
    });
    const byCode = new Map(saved.map((b) => [b.clientCode.trim(), b]));

    const rows: ClientBudgetRow[] = uniqueClients.map((c) => {
      const code = c.code.trim();
      const b = byCode.get(code);
      return {
        clientCode: code,
        clientName: c.name,
        branch: c.branch ?? null,
        branchName: c.branchName ?? null,
        targetKilos: Number(b?.targetKilos ?? 0),
        expectedRevenue: Number(b?.expectedRevenue ?? 0),
      };
    });

    rows.sort((a, b) => a.clientName.localeCompare(b.clientName));
    return rows;
  }

  /** Crea o actualiza el presupuesto del mes por cliente de un vendedor. */
  async saveClientBudgets(
    companyId: string,
    dto: SaveClientBudgetsDto,
    user: User,
  ): Promise<ClientBudgetRow[]> {
    await this.assertCanManage(user);

    for (const item of dto.items) {
      const existing = await this.clientBudgetsRepository.findOne({
        where: {
          companyId,
          sellerId: dto.sellerId,
          clientCode: item.clientCode,
          month: dto.month,
          year: dto.year,
        },
      });

      if (existing) {
        existing.targetKilos = item.targetKilos;
        existing.expectedRevenue = item.expectedRevenue;
        await this.clientBudgetsRepository.save(existing);
      } else {
        await this.clientBudgetsRepository.insert({
          companyId,
          sellerId: dto.sellerId,
          clientCode: item.clientCode,
          month: dto.month,
          year: dto.year,
          targetKilos: item.targetKilos,
          expectedRevenue: item.expectedRevenue,
        });
      }
    }

    return this.listClientBudgets(companyId, dto.sellerId, dto.month, dto.year);
  }

  /**
   * Presupuesto agregado de TODA la compañía (suma de todos los vendedores) para
   * un mes. Se usa en el tablero cuando un administrador consulta el general.
   *
   * Los vendedores marcados como "aparte" (BUDGET_APART_SELLER_DOCS, p. ej. Juan
   * Sierra) NO se suman aquí: su meta se mide por separado.
   */
  async getCompanyBudget(
    companyId: string,
    month: number,
    year: number,
  ): Promise<{ targetKilos: number; expectedRevenue: number } | null> {
    const apartIds = await this.apartSellerIds();
    const rows = (
      await this.budgetsRepository.find({
        where: { companyId, month, year },
      })
    ).filter((b) => !apartIds.has(b.sellerId));
    if (rows.length === 0) return null;
    return {
      targetKilos: rows.reduce((sum, b) => sum + Number(b.targetKilos), 0),
      expectedRevenue: rows.reduce(
        (sum, b) => sum + Number(b.expectedRevenue),
        0,
      ),
    };
  }

  /** Ids de usuarios cuyo presupuesto va aparte (por cédula en config). */
  private async apartSellerIds(): Promise<Set<string>> {
    if (BUDGET_APART_SELLER_DOCS.length === 0) return new Set();
    const docs = new Set(BUDGET_APART_SELLER_DOCS.map((d) => d.trim()));
    const users = await this.usersService.findAll();
    return new Set(
      users.filter((u) => docs.has(u.documentId)).map((u) => u.id),
    );
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
