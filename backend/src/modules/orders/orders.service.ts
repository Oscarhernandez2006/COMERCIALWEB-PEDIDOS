import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClientsService } from '../clients/clients.service';
import { ClientRecord } from '../clients/entities/client-record.entity';
import { PriceListsService } from '../price-lists/price-lists.service';
import { SiesaService } from '../siesa/siesa.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { buildOrderPdf } from './order-pdf';
import {
  bogotaParts,
  bogotaToday,
  corteForHour,
  isValidCorte,
  isOrderCreationOpen,
  isOrderUploadOpen,
  ORDER_OPEN_HOUR,
  ORDER_UPLOAD_CLOSE_HOUR,
} from './order-cortes';

/** Resultado de subir un lote de pedidos (un corte) a Siesa. */
export interface UploadBatchResult {
  total: number;
  uploaded: number;
  failed: number;
  errors: { orderNumber: string; message: string }[];
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly clientsService: ClientsService,
    private readonly priceListsService: PriceListsService,
    private readonly siesaService: SiesaService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    companyId: string,
    dto: CreateOrderDto,
    seller: User,
  ): Promise<Order> {
    // Los pedidos solo se pueden crear a partir de las 7:00 a.m. (Colombia).
    if (!isOrderCreationOpen()) {
      throw new BadRequestException(
        `El pedido no se pudo realizar porque está fuera del horario de ` +
          `atención. La toma de pedidos está disponible a partir de las ` +
          `${ORDER_OPEN_HOUR}:00 a.m.`,
      );
    }

    const customer = await this.clientsService.findOne(
      companyId,
      dto.customerId,
    );

    // Todo se hace dentro de una transacción para que el descuento de stock y
    // la creación del pedido sean atómicos.
    return this.dataSource.transaction(async (manager) => {
      const ordersRepo = manager.getRepository(Order);

      const { items, subtotal, taxes } = await this.buildItemsAndAdjustStock(
        manager,
        companyId,
        customer,
        dto.items,
      );

      const order = ordersRepo.create({
        companyId,
        orderNumber: await this.nextOrderNumber(companyId, manager),
        customer,
        seller,
        items,
        // Los pedidos se crean listos para enviar a Siesa ("pendiente por envío").
        status: OrderStatus.CONFIRMED,
        subtotal: Number(subtotal.toFixed(2)),
        taxes: Number(taxes.toFixed(2)),
        total: Number((subtotal + taxes).toFixed(2)),
        notes: dto.notes,
      });

      return ordersRepo.save(order);
    });
  }

  /**
   * Edita un pedido pendiente por envío (CONFIRMED o FAILED): reemplaza sus
   * líneas (permite agregar/quitar productos y cambiar cantidades/descuentos).
   * Devuelve al inventario el stock de las líneas anteriores y descuenta el de
   * las nuevas, todo de forma atómica. Recalcula los totales.
   */
  async update(
    companyId: string,
    id: string,
    dto: UpdateOrderDto,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const ordersRepo = manager.getRepository(Order);
      const itemsRepo = manager.getRepository(OrderItem);
      const productsRepo = manager.getRepository(Product);

      const order = await ordersRepo.findOne({ where: { id, companyId } });
      if (!order) throw new NotFoundException('Pedido no encontrado');

      if (
        order.status !== OrderStatus.CONFIRMED &&
        order.status !== OrderStatus.FAILED
      ) {
        throw new BadRequestException(
          'Solo se pueden editar pedidos pendientes por envío.',
        );
      }

      // Devuelve al inventario el stock de las líneas actuales.
      for (const item of order.items) {
        if (!item.product) continue;
        const product = await productsRepo.findOne({
          where: { id: item.product.id, companyId },
          lock: { mode: 'pessimistic_write' },
        });
        if (product) {
          product.stock = Number(product.stock) + Number(item.quantity);
          await productsRepo.save(product);
        }
      }

      // Elimina las líneas anteriores (la relación no borra huérfanos solo).
      if (order.items.length > 0) {
        await itemsRepo.remove(order.items);
      }

      // Reconstruye las líneas con la lista de precios actual del cliente,
      // descontando de nuevo el stock.
      const { items, subtotal, taxes } = await this.buildItemsAndAdjustStock(
        manager,
        companyId,
        order.customer,
        dto.items,
      );

      order.items = items;
      order.subtotal = Number(subtotal.toFixed(2));
      order.taxes = Number(taxes.toFixed(2));
      order.total = Number((subtotal + taxes).toFixed(2));
      if (dto.notes !== undefined) order.notes = dto.notes;
      // Tras editar, vuelve a quedar pendiente por envío y se limpia el error.
      order.status = OrderStatus.CONFIRMED;
      order.syncError = undefined;

      return ordersRepo.save(order);
    });
  }

  /**
   * Construye las líneas de un pedido a partir de la lista de precios del
   * cliente, validando inventario y stock, y descuenta el stock dentro de la
   * transacción dada. Devuelve las líneas y los acumulados de subtotal/impuestos.
   */
  private async buildItemsAndAdjustStock(
    manager: EntityManager,
    companyId: string,
    customer: ClientRecord,
    itemDtos: CreateOrderItemDto[],
  ): Promise<{ items: OrderItem[]; subtotal: number; taxes: number }> {
    // El precio depende de la lista de precios asignada al cliente.
    if (!customer.priceList) {
      throw new BadRequestException(
        'El cliente no tiene una lista de precios asignada.',
      );
    }
    // El catálogo de venta es la lista del cliente: trae precio, nombre y
    // unidad de medida por referencia.
    const listItems = await this.priceListsService.findListItemMap(
      companyId,
      customer.priceList,
    );

    const productsRepo = manager.getRepository(Product);
    const items: OrderItem[] = [];
    let subtotal = 0;
    let taxes = 0;

    for (const itemDto of itemDtos) {
      const sku = itemDto.sku.trim();
      const listItem = listItems.get(sku);
      if (!listItem) {
        throw new BadRequestException(
          `El producto "${sku}" no está en la lista ${customer.priceList} ` +
            `del cliente.`,
        );
      }

      // El producto debe existir en el inventario y tener stock suficiente.
      // Bloqueamos la fila (FOR UPDATE) para que dos pedidos simultáneos no
      // puedan descontar el mismo stock y provocar sobreventa.
      const product = await productsRepo.findOne({
        where: { sku, companyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) {
        throw new BadRequestException(
          `El producto "${listItem.productName}" no está en el inventario.`,
        );
      }
      if (Number(product.stock) < itemDto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${listItem.productName}": ` +
            `disponible ${Number(product.stock)}, solicitado ${itemDto.quantity}.`,
        );
      }

      const discountPct = itemDto.discountPct ?? 0;
      const unitPrice = Number(listItem.price);
      const taxRate = Number(product.taxRate);
      const gross = unitPrice * itemDto.quantity;
      const discountAmount = (gross * discountPct) / 100;
      const net = gross - discountAmount;
      const lineTax = (net * taxRate) / 100;

      const item = new OrderItem();
      item.product = product;
      item.sku = sku;
      item.productName = listItem.productName;
      item.unitOfMeasure = listItem.unitOfMeasure;
      item.quantity = itemDto.quantity;
      item.unitPrice = unitPrice;
      item.discountPct = discountPct;
      item.taxRate = taxRate;
      item.lineTotal = Number(net.toFixed(2));

      items.push(item);
      subtotal += net;
      taxes += lineTax;

      // Pedido pendiente: descuenta el stock del producto.
      product.stock = Number(product.stock) - itemDto.quantity;
      await productsRepo.save(product);
    }

    return { items, subtotal, taxes };
  }

  findAllForSeller(companyId: string, sellerId: string): Promise<Order[]> {
    return this.ordersRepository
      .find({
        where: { companyId, seller: { id: sellerId } },
        order: { createdAt: 'DESC' },
        take: 100,
      })
      .then((orders) => this.withCustomerPriceListName(companyId, orders));
  }

  async findOne(companyId: string, id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, companyId },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    await this.withCustomerPriceListName(companyId, [order]);
    return order;
  }

  /**
   * Rellena el nombre de la lista de precios (DESC_LISTA) del cliente de cada
   * pedido, para mostrar la descripción en lugar del código.
   */
  private async withCustomerPriceListName(
    companyId: string,
    orders: Order[],
  ): Promise<Order[]> {
    if (orders.length === 0) return orders;
    const [listNames, sellerNames] = await Promise.all([
      this.priceListsService.findListNameMap(companyId),
      this.usersService.getSellerNameMap(companyId),
    ]);
    for (const order of orders) {
      if (!order.customer) continue;
      const listCode = order.customer.priceList?.trim();
      if (listCode) order.customer.priceListName = listNames.get(listCode);
      const sellerCode = order.customer.sellerCode?.trim();
      if (sellerCode) order.customer.sellerName = sellerNames.get(sellerCode);
    }
    return orders;
  }

  /** Genera el PDF (documento) de un pedido. */
  async generatePdf(companyId: string, id: string): Promise<Buffer> {
    const order = await this.findOne(companyId, id);
    return buildOrderPdf(order);
  }

  async confirm(companyId: string, id: string): Promise<Order> {
    const order = await this.findOne(companyId, id);
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden confirmar pedidos en borrador',
      );
    }
    order.status = OrderStatus.CONFIRMED;
    return this.ordersRepository.save(order);
  }

  /**
   * Anula un pedido: exige un motivo y devuelve al inventario el stock que se
   * había descontado al crearlo.
   */
  async cancel(companyId: string, id: string, reason: string): Promise<Order> {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'Debe indicar el motivo de la anulación.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const ordersRepo = manager.getRepository(Order);
      const productsRepo = manager.getRepository(Product);

      const order = await ordersRepo.findOne({ where: { id, companyId } });
      if (!order) throw new NotFoundException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('El pedido ya está anulado.');
      }
      if (order.status === OrderStatus.SYNCED) {
        throw new BadRequestException(
          'No se puede anular un pedido ya enviado a Siesa.',
        );
      }

      // Devuelve el stock de cada producto del pedido.
      for (const item of order.items) {
        if (!item.product) continue;
        const product = await productsRepo.findOne({
          where: { id: item.product.id, companyId },
          lock: { mode: 'pessimistic_write' },
        });
        if (product) {
          product.stock = Number(product.stock) + Number(item.quantity);
          await productsRepo.save(product);
        }
      }

      order.status = OrderStatus.CANCELLED;
      order.cancelReason = trimmed;
      return ordersRepo.save(order);
    });
  }

  /** Envia un pedido individual a Siesa y actualiza su estado segun el resultado. */
  async syncToSiesa(companyId: string, id: string): Promise<Order> {
    // Después de las 4:00 p.m. (Colombia) ya no se pueden subir pedidos.
    if (!isOrderUploadOpen()) {
      throw new BadRequestException(
        `El envío no se pudo realizar porque está fuera del horario de carga. ` +
          `La subida de pedidos está disponible hasta las ` +
          `${ORDER_UPLOAD_CLOSE_HOUR - 12}:00 p.m.`,
      );
    }
    const order = await this.findOne(companyId, id);
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        'Solo se sincronizan pedidos confirmados',
      );
    }
    return this.pushOrder(order);
  }

  /**
   * Previsualiza los pedidos pendientes por envío que entran en un corte
   * (según la hora de creación en Colombia) para una fecha (hoy por defecto).
   */
  async previewUpload(
    companyId: string,
    corteId: string,
    date?: string,
  ): Promise<Order[]> {
    return this.collectForCorte(companyId, corteId, date);
  }

  /**
   * Sube a Siesa todos los pedidos pendientes por envío de un corte.
   * Los que reciben respuesta satisfactoria pasan a "cargado en Siesa"
   * (SYNCED) y ya no se pueden anular.
   */
  async uploadBatch(
    companyId: string,
    corteId: string,
    date?: string,
  ): Promise<UploadBatchResult> {
    // Después de las 4:00 p.m. (Colombia) ya no se pueden subir pedidos.
    if (!isOrderUploadOpen()) {
      throw new BadRequestException(
        `El envío no se pudo realizar porque está fuera del horario de carga. ` +
          `La subida de pedidos está disponible hasta las ` +
          `${ORDER_UPLOAD_CLOSE_HOUR - 12}:00 p.m.`,
      );
    }
    const orders = await this.collectForCorte(companyId, corteId, date);
    const errors: { orderNumber: string; message: string }[] = [];

    for (const order of orders) {
      const result = await this.pushOrder(order);
      if (result.status !== OrderStatus.SYNCED) {
        errors.push({
          orderNumber: result.orderNumber,
          message: result.syncError ?? 'Error desconocido',
        });
      }
    }

    return {
      total: orders.length,
      uploaded: orders.length - errors.length,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Reúne los pedidos CONFIRMED (pendiente por envío) de una compañía que, por
   * su hora de creación en Colombia, pertenecen al corte y la fecha indicados.
   */
  private async collectForCorte(
    companyId: string,
    corteId: string,
    date?: string,
  ): Promise<Order[]> {
    if (!isValidCorte(corteId)) {
      throw new BadRequestException('Corte inválido.');
    }
    const targetDate = date?.trim() || bogotaToday();

    const orders = await this.ordersRepository.find({
      where: { companyId, status: OrderStatus.CONFIRMED },
      order: { createdAt: 'ASC' },
    });

    return orders.filter((order) => {
      const { date: orderDate, hour } = bogotaParts(order.createdAt);
      return orderDate === targetDate && corteForHour(hour) === corteId;
    });
  }

  /** Empuja un pedido a Siesa y persiste el estado resultante. */
  private async pushOrder(order: Order): Promise<Order> {
    order.status = OrderStatus.SYNCING;
    await this.ordersRepository.save(order);

    // El codigo de vendedor depende de la compañía (un mismo usuario puede
    // tener codigos distintos en cada una).
    const sellerCode =
      (await this.usersService.getSellerCode(
        order.seller.id,
        order.companyId,
      )) ?? order.seller.siesaSellerCode;

    try {
      const response = await this.siesaService.createOrder({
        companyId: order.companyId,
        customerSiesaId: order.customer.code,
        sellerCode,
        notes: order.notes,
        lines: order.items.map((item) => ({
          itemSiesaId: item.product?.siesaId ?? item.sku,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountPct: Number(item.discountPct),
        })),
      });

      order.status = OrderStatus.SYNCED;
      order.siesaDocumentId = response.documentId;
      order.syncError = undefined;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Fallo sincronizando pedido ${order.id}: ${message}`);
      order.status = OrderStatus.FAILED;
      order.syncError = message;
    }

    return this.ordersRepository.save(order);
  }

  /**
   * Consecutivo del pedido por compañía. Empieza en `000001` y avanza de uno
   * en uno (cada compañía lleva su propia numeración).
   */
  private async nextOrderNumber(
    companyId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const repo = manager
      ? manager.getRepository(Order)
      : this.ordersRepository;
    const count = await repo.count({ where: { companyId } });
    return (count + 1).toString().padStart(6, '0');
  }
}
