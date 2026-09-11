import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CanalOrdersService } from './canal-orders.service';
import { DispatchCanalOrderDto } from './dto/dispatch-canal-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

/**
 * Despacho de canales. Genera la remisión, relaciona el documento de Frigo App
 * (orden de compra: kg, ganchos, ID) con su PDF, y envía el pedido a Siesa.
 * Acceso por rol admin o permiso `/admin/canales-despacho`.
 */
@ApiTags('canal-orders-dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/canal-orders/dispatch')
export class CanalDispatchController {
  constructor(private readonly service: CanalOrdersService) {}

  /** Pedidos aprobados por cartera, pendientes de despacho o ya despachados. */
  @Get()
  findPending(@CompanyId() companyId: string, @CurrentUser() user: User) {
    return this.service.findForDispatch(companyId, user);
  }

  /** Registra la remisión y el documento de Frigo App (con su PDF). */
  @Post(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  dispatch(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: DispatchCanalOrderDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ) {
    return this.service.dispatch(companyId, id, dto, file, user);
  }

  /** Envía el pedido despachado (con su remisión) a Siesa. */
  @Post(':id/siesa')
  sendToSiesa(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.sendToSiesa(companyId, id, user);
  }

  /** Descarga el PDF de Frigo App relacionado con el pedido. */
  @Get(':id/frigo-pdf')
  async frigoPdf(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.service.getFrigoPdf(companyId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename.replace(/"/g, '')}"`,
    );
    res.send(buffer);
  }
}
