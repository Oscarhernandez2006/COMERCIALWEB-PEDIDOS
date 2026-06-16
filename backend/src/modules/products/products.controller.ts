import {
  Body,
  Controller,
  Get,
  Param,
  ParseFloatPipe,
  Patch,
  Post,
  Query,
  Res,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import {
  buildInventoryTemplate,
  parseInventoryExcel,
} from './inventory.parser';
import { buildStockPdf } from './stock-pdf';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('priceList') priceList?: string,
  ) {
    if (priceList) {
      return this.productsService.findSellableForList(
        companyId,
        priceList,
        search,
      );
    }
    return this.productsService.findAll(companyId, search);
  }

  /** Productos con existencias (stock > 0), sin importar lista de precios. */
  @Get('stock')
  findInStock(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findInStock(companyId, search);
  }

  /**
   * PDF de los productos disponibles hoy (en stock) para compartir con
   * clientes. Disponible para vendedores y administradores.
   */
  @Get('stock/pdf')
  async stockPdf(@CompanyId() companyId: string, @Res() res: Response) {
    const products = await this.productsService.findInStock(companyId);
    const buffer = await buildStockPdf(companyId, products);
    const today = new Date()
      .toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
      .replace(/\//g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="disponibles-${companyId}-${today}.pdf"`,
    );
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('sync')
  sync(@CompanyId() companyId: string) {
    return this.productsService.syncFromSiesa(companyId);
  }

  /** Descarga la plantilla de inventario (Referencia, Descripción, Stock). */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const buffer = buildInventoryTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_inventario.xlsx"',
    );
    res.send(buffer);
  }

  /**
   * Carga diaria de inventario desde Excel. Reemplaza el inventario de la
   * compañía con el de la plantilla.
   */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importInventory(
    @CompanyId() companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new UnsupportedMediaTypeException('No se recibió ningún archivo.');
    }
    const rows = parseInventoryExcel(file.buffer);
    return this.productsService.replaceInventory(companyId, rows);
  }

  /** Edición de stock (única edición permitida desde la web). */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/stock')
  updateStock(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body('stock', ParseFloatPipe) stock: number,
  ) {
    return this.productsService.updateStock(companyId, id, stock);
  }
}
