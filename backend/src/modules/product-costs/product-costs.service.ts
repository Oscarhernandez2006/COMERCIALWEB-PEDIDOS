import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCost } from './entities/product-cost.entity';
import { SaveProductCostsDto } from './dto/save-product-costs.dto';
import { baseCompanyId } from '../../common/companies';

@Injectable()
export class ProductCostsService {
  constructor(
    @InjectRepository(ProductCost)
    private readonly repository: Repository<ProductCost>,
  ) {}

  /** Lista los costos estándar cargados de una compañía. */
  list(companyId: string): Promise<ProductCost[]> {
    return this.repository.find({
      where: { companyId: baseCompanyId(companyId) },
      order: { name: 'ASC', productRef: 'ASC' },
    });
  }

  /** Mapa referencia -> costo por kilo (para el cálculo de rentabilidad). */
  async costMap(companyId: string): Promise<Map<string, number>> {
    const rows = await this.list(companyId);
    return new Map(rows.map((r) => [r.productRef.trim(), Number(r.unitCost)]));
  }

  /** Crea o actualiza varios costos estándar de una compañía. */
  async saveMany(
    companyId: string,
    dto: SaveProductCostsDto,
  ): Promise<ProductCost[]> {
    companyId = baseCompanyId(companyId);
    for (const item of dto.items) {
      const ref = item.productRef.trim();
      if (!ref) continue;
      const existing = await this.repository.findOne({
        where: { companyId, productRef: ref },
      });
      if (existing) {
        existing.name = item.name ?? existing.name;
        existing.unitCost = item.unitCost;
        await this.repository.save(existing);
      } else {
        await this.repository.insert({
          companyId,
          productRef: ref,
          name: item.name,
          unitCost: item.unitCost,
        });
      }
    }
    return this.list(companyId);
  }
}
