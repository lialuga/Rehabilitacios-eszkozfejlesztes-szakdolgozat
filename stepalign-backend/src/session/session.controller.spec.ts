import { Test } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

describe('SessionController', () => {
  const service = {
    upsertSession: jest.fn(),
    getSessions: jest.fn(),
    deleteSession: jest.fn(),
  };
  let controller: SessionController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: service }],
    }).compile();
    controller = module.get(SessionController);
  });

  it('delegates to the service', async () => {
    await controller.getUserSessions('u');
    await controller.remove('u', 'c');
    expect(service.getSessions).toHaveBeenCalledWith('u');
    expect(service.deleteSession).toHaveBeenCalledWith('u', 'c');
  });
});
