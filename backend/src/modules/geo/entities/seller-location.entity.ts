import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Punto de geolocalización del vendedor. Se registra periódicamente (ping cada
 * pocos minutos mientras usa la app) para reconstruir su recorrido en el mapa.
 */
@Entity('seller_locations')
export class SellerLocation extends BaseEntity {
  /** Usuario (vendedor) al que pertenece el punto. */
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  /** Compañía activa cuando se registró el punto. */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  /** Precisión reportada por el navegador (metros). */
  @Column({ type: 'double precision', nullable: true })
  accuracy?: number;

  /** Momento en que se capturó el punto. */
  @Index()
  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt: Date;
}
