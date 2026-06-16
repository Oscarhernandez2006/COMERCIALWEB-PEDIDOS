import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { SiesaService } from '../siesa/siesa.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly siesaService: SiesaService,
  ) {}

  findAll(companyId: string, search?: string): Promise<Customer[]> {
    if (search) {
      return this.customersRepository.find({
        where: [
          { companyId, name: ILike(`%${search}%`), active: true },
          { companyId, nit: ILike(`%${search}%`), active: true },
        ],
        take: 100,
        order: { name: 'ASC' },
      });
    }
    return this.customersRepository.find({
      where: { companyId, active: true },
      take: 100,
      order: { name: 'ASC' },
    });
  }

  async findOne(companyId: string, id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id, companyId },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  findBySiesaId(companyId: string, siesaId: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { companyId, siesaId },
    });
  }

  /** Sincroniza clientes desde Siesa para una compañía (upsert por siesaId). */
  async syncFromSiesa(companyId: string): Promise<{ synced: number }> {
    const raws = await this.siesaService.fetchCustomers(companyId);
    let synced = 0;

    for (const raw of raws) {
      if (!raw.f200_id) continue;
      const existing = await this.findBySiesaId(companyId, raw.f200_id);
      const customer = this.customersRepository.merge(
        existing ?? new Customer(),
        {
          companyId,
          siesaId: raw.f200_id,
          nit: raw.f200_nit ?? raw.f200_id,
          name: raw.f200_razon_social ?? 'Sin nombre',
          address: raw.direccion,
          city: raw.ciudad,
          phone: raw.telefono,
          email: raw.email,
          priceList: raw.lista_precio,
          creditLimit: Number(raw.cupo_credito ?? 0),
          active: raw.f200_ind_estado !== '0',
        },
      );
      await this.customersRepository.save(customer);
      synced++;
    }

    this.logger.log(
      `Clientes sincronizados desde Siesa (compañía ${companyId}): ${synced}`,
    );
    return { synced };
  }
}
