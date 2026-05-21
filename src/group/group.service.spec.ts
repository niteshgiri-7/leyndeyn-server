import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { GroupService } from "./group.service";

type PrismaGroupMock = {
  create: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  findFirst: jest.Mock;
  delete: jest.Mock;
};

describe("GroupService", () => {
  let service: GroupService;
  let prismaGroup: PrismaGroupMock;

  beforeEach(async () => {
    prismaGroup = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    };

    const prismaMock = {
      group: prismaGroup,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createGroup", () => {
    it("creates a group and adds admin member", async () => {
      const userId = "user-1";
      const data = { name: "Test Group", description: "demo" };
      const created = { id: "group-1", ...data };
      prismaGroup.create.mockResolvedValue(created);

      const result = await service.createGroup(userId, data);

      expect(result).toEqual(created);
      expect(prismaGroup.create).toHaveBeenCalledWith({
        data: {
          ...data,
          allowMembersToInvite: undefined,
          allowMembersToManageCategory: undefined,
          invitationCode: "asdfasdf",
          members: {
            createMany: {
              data: [{ userId, role: "ADMIN" }],
            },
          },
        },
      });
    });
  });

  describe("findGroupById", () => {
    it("returns the group when found", async () => {
      const group = { id: "group-1", name: "Test" };
      prismaGroup.findUnique.mockResolvedValue(group);

      const result = await service.findGroupById("group-1");

      expect(result).toEqual(group);
      expect(prismaGroup.findUnique).toHaveBeenCalledWith({
        where: { id: "group-1" },
      });
    });

    it("throws when group is missing", async () => {
      prismaGroup.findUnique.mockResolvedValue(null);

      await expect(service.findGroupById("missing")).rejects.toThrow(
        new NotFoundException("Group not found"),
      );
    });
  });

  describe("updateGroupById", () => {
    it("updates when group exists", async () => {
      const existing = { id: "group-1", name: "Old" };
      const update = { name: "New" };
      const updated = { id: "group-1", name: "New" };
      prismaGroup.findUnique.mockResolvedValue(existing);
      prismaGroup.update.mockResolvedValue(updated);

      const result = await service.updateGroupById("group-1", update);

      expect(result).toEqual(updated);
      expect(prismaGroup.update).toHaveBeenCalledWith({
        where: { id: "group-1" },
        data: update,
      });
    });

    it("throws when group is missing", async () => {
      prismaGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.updateGroupById("missing", { name: "x" }),
      ).rejects.toThrow(new NotFoundException("Group not found"));
      expect(prismaGroup.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteGroupById", () => {
    it("deletes when only one member", async () => {
      const group = { id: "group-1", name: "Test" };
      prismaGroup.findUnique.mockResolvedValue(group);
      prismaGroup.findFirst.mockResolvedValue({
        id: "group-1",
        _count: { members: 1 },
      });
      prismaGroup.delete.mockResolvedValue(group);

      const result = await service.deleteGroupById("group-1");

      expect(result).toEqual(group);
      expect(prismaGroup.delete).toHaveBeenCalledWith({
        where: { id: "group-1" },
      });
    });

    it("throws when group is missing", async () => {
      prismaGroup.findUnique.mockResolvedValue(null);

      await expect(service.deleteGroupById("missing")).rejects.toThrow(
        new NotFoundException("Group not found"),
      );
      expect(prismaGroup.delete).not.toHaveBeenCalled();
    });

    it("throws when group has more than one member", async () => {
      const group = { id: "group-1", name: "Test" };
      prismaGroup.findUnique.mockResolvedValue(group);
      prismaGroup.findFirst.mockResolvedValue({
        id: "group-1",
        _count: { members: 2 },
      });

      await expect(service.deleteGroupById("group-1")).rejects.toThrow(
        new BadRequestException(
          "Cannot delete group with more than 1 member. Please remove members before deleting the group.",
        ),
      );
      expect(prismaGroup.delete).not.toHaveBeenCalled();
    });

    it("defaults member count to zero when missing", async () => {
      const group = { id: "group-1", name: "Test" };
      prismaGroup.findUnique.mockResolvedValue(group);
      prismaGroup.findFirst.mockResolvedValue(null);
      prismaGroup.delete.mockResolvedValue(group);

      const result = await service.deleteGroupById("group-1");

      expect(result).toEqual(group);
      expect(prismaGroup.delete).toHaveBeenCalledWith({
        where: { id: "group-1" },
      });
    });
  });
});
