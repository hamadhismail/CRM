import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FirebaseAdminModule } from '../../infrastructure/firebase/firebase-admin.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({ imports: [AuthModule, FirebaseAdminModule], controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
