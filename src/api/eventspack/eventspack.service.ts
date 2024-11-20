import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEventspackDto } from './dto/create-eventspack.dto';
import { UpdateEventspackDto } from './dto/update-eventspack.dto';
import { EventsPack } from './schemas/eventspack.entity';

@Injectable()
export class EventspackService {
  constructor(
    @InjectModel(EventsPack.name) private eventsPackModel: Model<EventsPack>,
  ) {}
  async create(createEventspackDto: CreateEventspackDto) {
    const created_event = await this.eventsPackModel.create(createEventspackDto)
    return {
      statusCode: 201,
      message: 'API.EVENT_PACK_CREATED',
      data: created_event,
    };
  }

  async findAll() {
    const data = await this.eventsPackModel.find()
    return {
      statusCode: 200,
      message: 'API.EVENT_PACK_CREATED',
      data
    };;
  }

  findOne(id: number) {
    return `This action returns a #${id} eventspack`;
  }

  update(id: number, updateEventspackDto: UpdateEventspackDto) {
    return `This action updates a #${id} eventspack`;
  }

  remove(id: number) {
    return `This action removes a #${id} eventspack`;
  }
}
