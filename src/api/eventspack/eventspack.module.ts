import { Module } from '@nestjs/common';
import { EventspackService } from './eventspack.service';
import { EventspackController } from './eventspack.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsPack, EventsPackSchema } from './schemas/eventspack.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventsPack.name, schema: EventsPackSchema },
    ]),
  ],
  controllers: [EventspackController],
  providers: [EventspackService],
})
export class EventspackModule {}
