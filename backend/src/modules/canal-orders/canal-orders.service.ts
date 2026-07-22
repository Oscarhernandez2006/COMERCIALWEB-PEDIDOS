import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CanalOrder } from './entities/canal-order.entity';
import { CreateCanalOrderDto } from './dto/create-canal-order.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CanalOrdersService {
  constructor(
    @InjectRepository(CanalOrder)
    private readonly canalOrdersRepository: Repository<CanalOrder>,
  ) {}

  /** Crea un pedido de canales para la compañía activa. */
  async create(
    companyId: string,
    dto: CreateCanalOrderDto,
    user: User,
  ): Promise<CanalOrder> {
    const last = await this.canalOrdersRepository.findOne({
      where: { companyId },
      order: { orderNumber: 'DESC' },
    });
    const orderNumber = (last?.orderNumber ?? 0) + 1;

    const order = this.canalOrdersRepository.create({
      companyId,
      orderNumber,
      sellerId: user.id,
      sellerName: user.name,
      dispatchDate: dto.dispatchDate,
      clientCode: dto.clientCode,
      clientName: dto.clientName,
      clientAddress: dto.clientAddress,
      clientCity: dto.clientCity,
      items: dto.items.map((it) => ({
        itemRef: it.itemRef,
        itemName: it.itemName,
        especie: it.especie,
        quantity: it.quantity,
        specifications: it.specifications ?? '',
        price: it.price,
        freight: it.freight ?? 0,
      })),
    });

    return this.canalOrdersRepository.save(order);
  }

  /**
   * Lista los pedidos de canales de la compañía (consolidado). Con filtro
   * opcional por rango de fecha de despacho.
   */
  async findAll(
    companyId: string,
    from?: string,
    to?: string,
  ): Promise<CanalOrder[]> {
    const where: Record<string, unknown> = { companyId };
    if (from && to) {
      where.dispatchDate = Between(from, to);
    }
    return this.canalOrdersRepository.find({
      where,
      order: { dispatchDate: 'DESC', createdAt: 'DESC' },
    });
  }
}
