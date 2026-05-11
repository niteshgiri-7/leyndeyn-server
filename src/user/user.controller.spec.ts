import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe("UserController", () => {
  let controller: UserController;
  const userService = {
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it('getAllUsers returns service result', async () => {
    const users = [{ id: 'id-1', email: 'user@example.com' }];
    userService.findAllUsers.mockResolvedValue(users);

    await expect(controller.getAllUsers()).resolves.toEqual(users);
  });

  it('getUserById returns service result', async () => {
    const user = { id: 'id-1', email: 'user@example.com' };
    userService.findUserById.mockResolvedValue(user);

    await expect(controller.getUserById('id-1')).resolves.toEqual(user);
    expect(userService.findUserById).toHaveBeenCalledWith('id-1');
  });
});
