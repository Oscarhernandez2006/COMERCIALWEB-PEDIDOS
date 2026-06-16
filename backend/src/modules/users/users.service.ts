import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserCompany } from './entities/user-company.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserCompany)
    private readonly userCompaniesRepository: Repository<UserCompany>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      documentId: dto.documentId,
      email: dto.email?.toLowerCase(),
      name: dto.name,
      role: dto.role,
      siesaSellerCode: dto.siesaSellerCode,
      passwordHash,
    });
    return this.usersRepository.save(user);
  }

  /** Busca por cedula (documento) o, si parece correo, por email. */
  findByUsername(username: string): Promise<User | null> {
    const value = username.trim();
    if (value.includes('@')) {
      return this.usersRepository.findOne({
        where: { email: value.toLowerCase() },
      });
    }
    return this.usersRepository.findOne({ where: { documentId: value } });
  }

  findByDocumentId(documentId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { documentId } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  count(): Promise<number> {
    return this.usersRepository.count();
  }

  /** Lista todos los usuarios (para administración). */
  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  /** Activa/desactiva un usuario. */
  async setActive(id: string, active: boolean): Promise<User> {
    const user = await this.findById(id);
    user.active = active;
    return this.usersRepository.save(user);
  }

  /** Quita el acceso de un usuario a una compañía. */
  async removeCompany(userId: string, companyId: string): Promise<void> {
    await this.userCompaniesRepository.delete({ userId, companyId });
  }

  /** Compañías a las que el usuario tiene acceso (activas). */
  findCompaniesForUser(userId: string): Promise<UserCompany[]> {
    return this.userCompaniesRepository.find({
      where: { userId, active: true },
    });
  }

  /** Codigo de vendedor del usuario para una compañía especifica. */
  async getSellerCode(
    userId: string,
    companyId: string,
  ): Promise<string | undefined> {
    const mapping = await this.userCompaniesRepository.findOne({
      where: { userId, companyId, active: true },
    });
    return mapping?.siesaSellerCode;
  }

  /**
   * Devuelve un mapa `código de vendedor -> nombre` para una compañía.
   * Considera tanto el código por compañía (UserCompany) como el código
   * general del usuario, para mostrar el nombre del vendedor en lugar del
   * código.
   */
  async getSellerNameMap(companyId: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    const users = await this.usersRepository.find();
    for (const user of users) {
      const code = user.siesaSellerCode?.trim();
      if (code && !map.has(code)) map.set(code, user.name);
    }

    const mappings = await this.userCompaniesRepository.find({
      where: { companyId, active: true },
      relations: { user: true },
    });
    for (const mapping of mappings) {
      const code = mapping.siesaSellerCode?.trim();
      if (code && mapping.user?.name) map.set(code, mapping.user.name);
    }

    return map;
  }

  /** Indica si el usuario tiene acceso a la compañía. */
  async hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const count = await this.userCompaniesRepository.count({
      where: { userId, companyId, active: true },
    });
    return count > 0;
  }

  /** Asigna (o actualiza) el acceso de un usuario a una compañía. */
  async assignCompany(
    userId: string,
    companyId: string,
    siesaSellerCode?: string,
  ): Promise<UserCompany> {
    const existing = await this.userCompaniesRepository.findOne({
      where: { userId, companyId },
    });
    const mapping = this.userCompaniesRepository.merge(
      existing ?? new UserCompany(),
      { userId, companyId, siesaSellerCode, active: true },
    );
    return this.userCompaniesRepository.save(mapping);
  }
}
