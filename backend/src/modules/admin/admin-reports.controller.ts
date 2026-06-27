import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminReportsService } from './admin-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Reportes del panel de administración (solo admin). Los reportes se generan
 * en PDF. El admin no fija compañía: se indica por query (`companyId`).
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  /** Resumen de inventario por día (vendido, stock que queda y agotados). */
  @Get('inventory')
  async inventory(
    @Query('companyId') companyId: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const { buffer, date: reportDate } =
      await this.reportsService.getInventoryReportPdf(companyId, date);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inventario-${companyId}-${reportDate}.pdf"`,
    );
    res.send(buffer);
  }

  /** Datos del resumen de inventario por día en JSON (para previsualizar). */
  @Get('inventory/data')
  inventoryData(
    @Query('companyId') companyId: string,
    @Query('date') date: string,
  ) {
    return this.reportsService.getInventoryReport(companyId, date);
  }

  /** Resumen de inventario por día en Excel (.xlsx). */
  @Get('inventory/excel')
  async inventoryExcel(
    @Query('companyId') companyId: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const { buffer, date: reportDate } =
      await this.reportsService.getInventoryReportExcel(companyId, date);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inventario-${companyId}-${reportDate}.xlsx"`,
    );
    res.send(buffer);
  }

  /**
   * Productos vendidos divididos por compañía en un rango de fechas (hora de
   * Colombia). Por defecto el día de hoy. Por cada compañía lista sus productos
   * con la cantidad vendida y los ingresos (precio x cantidad). Si se indica
   * `companyId`, el reporte se genera solo para esa compañía.
   */
  @Get('product-sales')
  async productSales(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('companyId') companyId: string,
    @Res() res: Response,
  ) {
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getProductSalesReportPdf(
      from,
      to,
      companyId,
    );
    const companyPart = companyId?.trim() ? `${companyId.trim()}-` : '';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="productos-vendidos-${companyPart}${fromDate}_a_${toDate}.pdf"`,
    );
    res.send(buffer);
  }

  /** Datos de productos vendidos en JSON (para previsualizar). */
  @Get('product-sales/data')
  productSalesData(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('companyId') companyId: string,
  ) {
    return this.reportsService.getProductSalesReport(from, to, companyId);
  }

  /** Productos vendidos divididos por compañía en Excel (.xlsx). */
  @Get('product-sales/excel')
  async productSalesExcel(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('companyId') companyId: string,
    @Res() res: Response,
  ) {
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getProductSalesReportExcel(from, to, companyId);
    const companyPart = companyId?.trim() ? `${companyId.trim()}-` : '';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="productos-vendidos-${companyPart}${fromDate}_a_${toDate}.xlsx"`,
    );
    res.send(buffer);
  }

  /**
   * Resumen de ventas de una compañía agrupado por cliente o por producto en un
   * rango de fechas. `groupBy` = `customer` (cuánto se ha vendido a cada
   * cliente) o `product` (cuánto se ha vendido de cada producto).
   */
  @Get('sales-summary/data')
  salesSummaryData(
    @Query('companyId') companyId: string,
    @Query('groupBy') groupBy: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const group = groupBy === 'customer' ? 'customer' : 'product';
    return this.reportsService.getSalesSummaryReport(companyId, group, from, to);
  }

  /** Resumen de ventas por cliente o producto en PDF. */
  @Get('sales-summary/pdf')
  async salesSummaryPdf(
    @Query('companyId') companyId: string,
    @Query('groupBy') groupBy: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const group = groupBy === 'customer' ? 'customer' : 'product';
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getSalesSummaryReportPdf(
      companyId,
      group,
      from,
      to,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ventas-${group}-${companyId}-${fromDate}_a_${toDate}.pdf"`,
    );
    res.send(buffer);
  }

  /** Resumen de ventas por cliente o producto en Excel (.xlsx). */
  @Get('sales-summary/excel')
  async salesSummaryExcel(
    @Query('companyId') companyId: string,
    @Query('groupBy') groupBy: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const group = groupBy === 'customer' ? 'customer' : 'product';
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getSalesSummaryReportExcel(
      companyId,
      group,
      from,
      to,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ventas-${group}-${companyId}-${fromDate}_a_${toDate}.xlsx"`,
    );
    res.send(buffer);
  }

  /**
   * Ranking de vendedores de una compañía en un rango de fechas: del que más
   * vende al que menos, con sus pedidos, unidades e ingresos.
   */
  @Get('seller-ranking/data')
  sellerRankingData(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getSellerRankingReport(companyId, from, to);
  }

  /** Ranking de vendedores en PDF. */
  @Get('seller-ranking/pdf')
  async sellerRankingPdf(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getSellerRankingReportPdf(companyId, from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ranking-vendedores-${companyId}-${fromDate}_a_${toDate}.pdf"`,
    );
    res.send(buffer);
  }

  /** Ranking de vendedores en Excel (.xlsx). */
  @Get('seller-ranking/excel')
  async sellerRankingExcel(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getSellerRankingReportExcel(
      companyId,
      from,
      to,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ranking-vendedores-${companyId}-${fromDate}_a_${toDate}.xlsx"`,
    );
    res.send(buffer);
  }

  /**
   * Reporte vendedor–producto: cuánto vendió cada vendedor de cada producto en
   * un rango de fechas. Permite filtrar por un vendedor (`sellerId`) y/o por una
   * búsqueda de producto (`search`, por referencia o nombre).
   */
  @Get('seller-product/data')
  sellerProductData(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('sellerId') sellerId: string,
    @Query('sku') sku: string,
  ) {
    return this.reportsService.getSellerProductReport(
      companyId,
      from,
      to,
      sellerId,
      sku,
    );
  }

  /** Reporte vendedor–producto en PDF. */
  @Get('seller-product/pdf')
  async sellerProductPdf(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('sellerId') sellerId: string,
    @Query('sku') sku: string,
    @Res() res: Response,
  ) {
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getSellerProductReportPdf(
      companyId,
      from,
      to,
      sellerId,
      sku,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ventas-vendedor-producto-${companyId}-${fromDate}_a_${toDate}.pdf"`,
    );
    res.send(buffer);
  }

  /** Reporte vendedor–producto en Excel (.xlsx). */
  @Get('seller-product/excel')
  async sellerProductExcel(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('sellerId') sellerId: string,
    @Query('sku') sku: string,
    @Res() res: Response,
  ) {
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getSellerProductReportExcel(
      companyId,
      from,
      to,
      sellerId,
      sku,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ventas-vendedor-producto-${companyId}-${fromDate}_a_${toDate}.xlsx"`,
    );
    res.send(buffer);
  }

  /** Reporte mejor-vendedor-por-producto (datos JSON). */
  @Get('product-seller/data')
  productSellerData(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('sku') sku: string,
  ) {
    return this.reportsService.getProductSellerReport(companyId, from, to, sku);
  }

  /** Reporte mejor-vendedor-por-producto en PDF. */
  @Get('product-seller/pdf')
  async productSellerPdf(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('sku') sku: string,
    @Res() res: Response,
  ) {
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getProductSellerReportPdf(
      companyId,
      from,
      to,
      sku,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mejor-vendedor-producto-${companyId}-${fromDate}_a_${toDate}.pdf"`,
    );
    res.send(buffer);
  }

  /** Reporte mejor-vendedor-por-producto en Excel (.xlsx). */
  @Get('product-seller/excel')
  async productSellerExcel(
    @Query('companyId') companyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('sku') sku: string,
    @Res() res: Response,
  ) {
    const {
      buffer,
      from: fromDate,
      to: toDate,
    } = await this.reportsService.getProductSellerReportExcel(
      companyId,
      from,
      to,
      sku,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mejor-vendedor-producto-${companyId}-${fromDate}_a_${toDate}.xlsx"`,
    );
    res.send(buffer);
  }
}
