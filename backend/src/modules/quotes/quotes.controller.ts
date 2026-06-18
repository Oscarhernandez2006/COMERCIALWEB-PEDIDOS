import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(
    @CompanyId() companyId: string,
    @Body() dto: CreateQuoteDto,
    @CurrentUser() user: User,
  ) {
    return this.quotesService.create(companyId, dto, user);
  }

  @Get()
  findMine(
    @CompanyId() companyId: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.quotesService.findAllForSeller(companyId, sellerId);
  }

  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.quotesService.findOne(companyId, id);
  }

  @Get(':id/pdf')
  async pdf(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findOne(companyId, id);
    const buffer = await this.quotesService.generatePdf(companyId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cotizacion-${quote.quoteNumber}.pdf"`,
    );
    res.send(buffer);
  }
}
