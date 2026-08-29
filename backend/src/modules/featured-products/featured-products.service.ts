import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeaturedProduct } from './entities/featured-product.entity';
import { baseCompanyId } from '../../common/companies';

/** Gestiona los productos estrella/favoritos por compañía. */
@Injectable()
export class FeaturedProductsService {
  constructor(
    @InjectRepository(FeaturedProduct)
    private readonly repo: Repository<FeaturedProduct>,
  ) {}

  /** Productos estrella de la compañía (ordenados por nombre). */
  list(companyId: string): Promise<FeaturedProduct[]> {
    return this.repo.find({
      where: { companyId: baseCompanyId(companyId) },
      order: { name: 'ASC' },
    });
  }

  /** Marca un producto como estrella (idempotente: actualiza el nombre). */
  async add(
    companyId: string,
    sku: string,
    name?: string,
  ): Promise<FeaturedProduct> {
    const company = baseCompanyId(companyId);
    const cleanSku = (sku ?? '').trim();
    if (!cleanSku) {
      throw new BadRequestException('El SKU del producto es obligatorio.');
    }
    const cleanName = (name ?? '').trim() || cleanSku;
    // Upsert atómico: evita errores de clave duplicada si el producto ya estaba
    // marcado (p. ej. doble clic o marca simultánea).
    await this.repo.upsert(
      { companyId: company, sku: cleanSku, name: cleanName },
      ['companyId', 'sku'],
    );
    return this.repo.findOneOrFail({
      where: { companyId: company, sku: cleanSku },
    });
  }

  /** Quita la marca de estrella de un producto. */
  async remove(companyId: string, sku: string): Promise<void> {
    const cleanSku = (sku ?? '').trim();
    if (!cleanSku) {
      throw new BadRequestException('El SKU del producto es obligatorio.');
    }
    await this.repo.delete({
      companyId: baseCompanyId(companyId),
      sku: cleanSku,
    });
  }
}
