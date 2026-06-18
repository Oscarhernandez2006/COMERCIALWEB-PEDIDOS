import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { QuoteItem } from './entities/quote-item.entity';
import { CreateQuoteDto, CreateQuoteItemDto } from './dto/create-quote.dto';
import { ClientsService } from '../clients/clients.service';
import { ClientRecord } from '../clients/entities/client-record.entity';
import { PriceListsService } from '../price-lists/price-lists.service';
import { UsersService } from '../users/users.service';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { buildQuotePdf } from './quote-pdf';

const DEFAULT_VALIDITY_DAYS = 15;

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quotesRepository: Repository<Quote>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly clientsService: ClientsService,
    private readonly priceListsService: PriceListsService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    companyId: string,
    dto: CreateQuoteDto,
    seller: User,
  ): Promise<Quote> {
    const customer = await this.clientsService.findOne(
      companyId,
      dto.customerId,
    );

    const { items, subtotal, taxes } = await this.buildItems(
      companyId,
      customer,
      dto.items,
    );

    const validityDays = dto.validityDays ?? DEFAULT_VALIDITY_DAYS;
    const validUntil = new Date(
      Date.now() + validityDays * 24 * 60 * 60 * 1000,
    );

    const quote = this.quotesRepository.create({
      companyId,
      quoteNumber: await this.nextQuoteNumber(companyId),
      customer,
      seller,
      items,
      subtotal: Number(subtotal.toFixed(2)),
      taxes: Number(taxes.toFixed(2)),
      total: Number((subtotal + taxes).toFixed(2)),
      notes: dto.notes,
      validityDays,
      validUntil,
    });

    return this.quotesRepository.save(quote);
  }

  /**
   * Construye las líneas de la cotización a partir de la lista de precios del
   * cliente. A diferencia de un pedido, NO descuenta inventario ni valida
   * stock: una cotización solo informa los precios de venta.
   */
  private async buildItems(
    companyId: string,
    customer: ClientRecord,
    itemDtos: CreateQuoteItemDto[],
  ): Promise<{ items: QuoteItem[]; subtotal: number; taxes: number }> {
    if (!customer.priceList) {
      throw new BadRequestException(
        'El cliente no tiene una lista de precios asignada.',
      );
    }

    const listItems = await this.priceListsService.findListItemMap(
      companyId,
      customer.priceList,
    );

    // Mapa de IVA por referencia (si el producto existe en inventario).
    const inventory = await this.productsRepository.find({
      where: { companyId },
      select: { sku: true, taxRate: true },
    });
    const taxBySku = new Map(
      inventory.map((p) => [p.sku.trim(), Number(p.taxRate)]),
    );

    const items: QuoteItem[] = [];
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

      const discountPct = itemDto.discountPct ?? 0;
      const unitPrice = Number(listItem.price);
      const taxRate = taxBySku.get(sku) ?? 0;
      const gross = unitPrice * itemDto.quantity;
      const discountAmount = (gross * discountPct) / 100;
      const net = gross - discountAmount;
      const lineTax = (net * taxRate) / 100;

      const item = new QuoteItem();
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
    }

    return { items, subtotal, taxes };
  }

  private async nextQuoteNumber(companyId: string): Promise<string> {
    const count = await this.quotesRepository.count({ where: { companyId } });
    return (count + 1).toString().padStart(6, '0');
  }

  findAllForSeller(companyId: string, sellerId: string): Promise<Quote[]> {
    return this.quotesRepository
      .find({
        where: { companyId, seller: { id: sellerId } },
        order: { createdAt: 'DESC' },
        take: 100,
      })
      .then((quotes) => this.withCustomerNames(companyId, quotes));
  }

  async findOne(companyId: string, id: string): Promise<Quote> {
    const quote = await this.quotesRepository.findOne({
      where: { id, companyId },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    await this.withCustomerNames(companyId, [quote]);
    return quote;
  }

  /** Rellena el nombre de la lista de precios y del vendedor del cliente. */
  private async withCustomerNames(
    companyId: string,
    quotes: Quote[],
  ): Promise<Quote[]> {
    if (quotes.length === 0) return quotes;
    const [listNames, sellerNames] = await Promise.all([
      this.priceListsService.findListNameMap(companyId),
      this.usersService.getSellerNameMap(companyId),
    ]);
    for (const quote of quotes) {
      if (!quote.customer) continue;
      const listCode = quote.customer.priceList?.trim();
      if (listCode) quote.customer.priceListName = listNames.get(listCode);
      const sellerCode = quote.customer.sellerCode?.trim();
      if (sellerCode) quote.customer.sellerName = sellerNames.get(sellerCode);
    }
    return quotes;
  }

  /** Genera el PDF (documento) de una cotización. */
  async generatePdf(companyId: string, id: string): Promise<Buffer> {
    const quote = await this.findOne(companyId, id);
    return buildQuotePdf(quote);
  }
}
