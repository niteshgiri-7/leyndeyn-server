import { Test, TestingModule } from "@nestjs/testing";
import { GroupService } from "./group.service";
import { GroupController } from "./group.controller";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { GroupAdminGuard } from "./guard/group-admin.guard";
import type { JwtPayload } from "../auth/jwt-payload.type";

describe("GroupController", () => {
  let controller: GroupController;
  const mockUser: JwtPayload = {
    id: "user-1",
    email: "test@local",
    username: "tester",
    isVerified: true,
  };
  let groupService: {
    findGroupById: jest.Mock;
    createGroup: jest.Mock;
    updateGroupById: jest.Mock;
    deleteGroupById: jest.Mock;
  };

  beforeEach(async () => {
    groupService = {
      findGroupById: jest.fn(),
      createGroup: jest.fn(),
      updateGroupById: jest.fn(),
      deleteGroupById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [
        {
          provide: GroupService,
          useValue: groupService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(GroupAdminGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<GroupController>(GroupController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("gets group by id", async () => {
    const group = { id: "group-1", name: "Test" };
    groupService.findGroupById.mockResolvedValue(group);

    const result = await controller.getGroupById("group-1");

    expect(result).toEqual(group);
    expect(groupService.findGroupById).toHaveBeenCalledWith("group-1");
  });

  it("creates group", async () => {
    const payload = { name: "Test Group", description: "demo" };
    const created = { id: "group-1", ...payload };
    groupService.createGroup.mockResolvedValue(created);

    const result = await controller.createGroup(mockUser, payload);

    expect(result).toEqual(created);
    expect(groupService.createGroup).toHaveBeenCalledWith(mockUser.id, payload);
  });

  it("updates group", async () => {
    const update = { name: "Updated" };
    const updated = { id: "group-1", ...update };
    groupService.updateGroupById.mockResolvedValue(updated);

    const result = await controller.updateGroupById("group-1", update);

    expect(result).toEqual(updated);
    expect(groupService.updateGroupById).toHaveBeenCalledWith(
      "group-1",
      update,
    );
  });

  it("deletes group", async () => {
    const group = { id: "group-1", name: "Test" };
    groupService.deleteGroupById.mockResolvedValue(group);

    const result = await controller.deleteGroupById("group-1");

    expect(result).toEqual(group);
    expect(groupService.deleteGroupById).toHaveBeenCalledWith("group-1");
  });
});
