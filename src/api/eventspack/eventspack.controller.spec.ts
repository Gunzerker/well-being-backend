import { Test, TestingModule } from '@nestjs/testing';
import { EventspackController } from './eventspack.controller';
import { EventspackService } from './eventspack.service';

describe('EventspackController', () => {
  let controller: EventspackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventspackController],
      providers: [EventspackService],
    }).compile();

    controller = module.get<EventspackController>(EventspackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
