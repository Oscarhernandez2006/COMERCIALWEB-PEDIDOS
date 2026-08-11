import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerLocation } from './entities/seller-location.entity';
import { RecordLocationDto } from './dto/record-location.dto';
import { Order } from '../orders/entities/order.entity';
import { CanalOrder } from '../canal-orders/entities/canal-order.entity';
import { UsersService } from '../users/users.service';

/** Punto del recorrido devuelto al mapa. */
export interface RoutePoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  capturedAt: Date;
}

/** Pedido geolocalizado (marcador en el mapa). */
export interface RouteOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  type: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

@Injectable()
export class GeoService {
  constructor(
    @InjectRepository(SellerLocation)
    private readonly locationsRepository: Repository<SellerLocation>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(CanalOrder)
    private readonly canalOrdersRepository: Repository<CanalOrder>,
    private readonly usersService: UsersService,
  ) {}

  /** Registra un punto de ubicación del vendedor (ping periódico). */
  async recordLocation(
    userId: string,
    companyId: string,
    dto: RecordLocationDto,
  ): Promise<{ ok: true }> {
    const point = this.locationsRepository.create({
      userId,
      companyId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      capturedAt: new Date(),
    });
    await this.locationsRepository.save(point);
    return { ok: true };
  }

  /** Vendedores de una compañía (para el selector del mapa). */
  async sellers(companyId: string) {
    const sellers = await this.usersService.getCompanySellers(companyId);
    return sellers.map((s) => ({ id: s.id, name: s.name }));
  }

  /**
   * Recorrido de un vendedor en un día: los puntos de ubicación (línea/trazo) y
   * los pedidos geolocalizados (marcadores). Se toma TODO el recorrido del
   * vendedor ese día sin fragmentar por compañía (el vendedor es una sola
   * persona y su ruta es una sola, aunque tome pedidos de varias compañías).
   */
  async route(
    _companyId: string,
    sellerId: string,
    date: string,
  ): Promise<{ points: RoutePoint[]; orders: RouteOrder[] }> {
    const points = await this.locationsRepository
      .createQueryBuilder('l')
      .select(['l.latitude', 'l.longitude', 'l.accuracy', 'l.capturedAt'])
      .where('l.user_id = :sellerId', { sellerId })
      .andWhere(
        "CAST((l.captured_at AT TIME ZONE 'America/Bogota') AS date) = :day",
        { day: date },
      )
      .orderBy('l.captured_at', 'ASC')
      .getMany();

    // Pedidos normales (cortes/subproductos) geolocalizados.
    const normalRows = await this.ordersRepository
      .createQueryBuilder('o')
      .innerJoin('o.customer', 'c')
      .select('o.id', 'id')
      .addSelect('o.order_number', 'orderNumber')
      .addSelect('c.name', 'customerName')
      .addSelect('o.type', 'type')
      .addSelect('o.latitude', 'latitude')
      .addSelect('o.longitude', 'longitude')
      .addSelect('o.created_at', 'createdAt')
      .where('o.seller_id = :sellerId', { sellerId })
      .andWhere('o.latitude IS NOT NULL')
      .andWhere(
        "CAST((o.created_at AT TIME ZONE 'America/Bogota') AS date) = :day",
        { day: date },
      )
      .orderBy('o.created_at', 'ASC')
      .getRawMany();

    // Pedidos de canal geolocalizados.
    const canalRows = await this.canalOrdersRepository
      .createQueryBuilder('o')
      .select('o.id', 'id')
      .addSelect('o.order_number', 'orderNumber')
      .addSelect('o.client_name', 'customerName')
      .addSelect('o.latitude', 'latitude')
      .addSelect('o.longitude', 'longitude')
      .addSelect('o.created_at', 'createdAt')
      .where('o.seller_id = :sellerId', { sellerId })
      .andWhere('o.latitude IS NOT NULL')
      .andWhere(
        "CAST((o.created_at AT TIME ZONE 'America/Bogota') AS date) = :day",
        { day: date },
      )
      .orderBy('o.created_at', 'ASC')
      .getRawMany();

    const orders: RouteOrder[] = [
      ...normalRows.map((r) => ({
        id: r.id,
        orderNumber: String(r.orderNumber),
        customerName: r.customerName ?? '',
        type: r.type ?? 'corte',
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        createdAt: r.createdAt,
      })),
      ...canalRows.map((r) => ({
        id: r.id,
        orderNumber: String(r.orderNumber),
        customerName: r.customerName ?? '',
        type: 'canal',
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        createdAt: r.createdAt,
      })),
    ].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

    return {
      points: points.map((p) => ({
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        accuracy: p.accuracy ?? null,
        capturedAt: p.capturedAt,
      })),
      orders,
    };
  }
}
