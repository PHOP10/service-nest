import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma/prisma.service';
import { UserModule } from './user/user.module';
import { UserController } from './user/user.controller';
import { AuthController } from './auth/auth.controller';
import { jwtConfig } from './auth/config';
import { DataLeaveModule } from './dataLeave/dataLeave.module';
import { DrugModule } from './drug/drug.module';
import { DurableArticleModule } from './durableArticle/durableArticle.module';
import { InfectiousWasteModule } from './infectiousWaste/infectiousWaste.module';
import { MaCarModule } from './maCar/maCar.module';
import { MaDrugModule } from './maDrug/maDrug.module';
import { MaMedicalEquipmentModule } from './maMedicalEquipment/maMedicalEquipment.module';
import { MasterCarModule } from './masterCar/masterCar.module';
import { MasterDrugModule } from './masterDrug/masterDrug.module';
import { MasterLeaveModule } from './masterLeave/masterLeave.module';
import { MasterPatientModule } from './masterPatient/masterPatient.module';
import { MedicalEquipmentModule } from './medicalEquipment/medicalEquipment.module';
import { OfficialTravelRequestModule } from './officialTravelRequest/officialTravelRequest.module';
import { SupportingResourceModule } from './supportingResource/supportingResource.module';
import { VisitHomeModule } from './visitHome/visitHome.module';
import { DataLeaveController } from './dataLeave/dataLeave.controller';
import { DrugController } from './drug/drug.controller';
import { DurableArticleController } from './durableArticle/durableArticle.controller';
import { InfectiousWasteController } from './infectiousWaste/infectiousWaste.controller';
import { MaCarController } from './maCar/maCar.controller';
import { MaDrugController } from './maDrug/maDrug.controller';
import { MaMedicalEquipmentController } from './maMedicalEquipment/maMedicalEquipment.controller';
import { MasterCarController } from './masterCar/masterCar.controller';
import { MasterDrugController } from './masterDrug/masterDrug.controller';
import { MasterLeaveController } from './masterLeave/masterLeave.controller';
import { MasterPatientController } from './masterPatient/masterPatient.controller';
import { MedicalEquipmentController } from './medicalEquipment/medicalEquipment.controller';
import { OfficialTravelRequestController } from './officialTravelRequest/officialTravelRequest.controller';
import { SupportingResourceController } from './supportingResource/supportingResource.controller';
import { VisitHomeController } from './visitHome/visitHome.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: { expiresIn: jwtConfig.expires },
    }),
    UserModule,
    DataLeaveModule,
    DrugModule,
    DurableArticleModule,
    InfectiousWasteModule,
    MaCarModule,
    MaDrugModule,
    MaMedicalEquipmentModule,
    MasterCarModule,
    MasterDrugModule,
    MasterLeaveModule,
    MasterPatientModule,
    MedicalEquipmentModule,
    OfficialTravelRequestModule,
    SupportingResourceModule,
    VisitHomeModule,
  ],
  controllers: [
    UserController,
    AuthController,
    DataLeaveController,
    DrugController,
    DurableArticleController,
    InfectiousWasteController,
    MaCarController,
    MaDrugController,
    MaMedicalEquipmentController,
    MasterCarController,
    MasterDrugController,
    MasterLeaveController,
    MasterPatientController,
    MedicalEquipmentController,
    OfficialTravelRequestController,
    SupportingResourceController,
    VisitHomeController,
  ],
  providers: [PrismaService],
})
export class AppModule {}
