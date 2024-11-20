import { Test, TestingModule } from '@nestjs/testing';
import { EventspackService } from './eventspack.service';

describe('EventspackService', () => {
  let service: EventspackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventspackService],
    }).compile();

    service = module.get<EventspackService>(EventspackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
