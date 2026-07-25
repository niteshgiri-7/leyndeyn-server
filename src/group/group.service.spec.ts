import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { GroupService } from "./group.service";
import { GroupRole } from "../../generated/prisma/client/enums";

type PrismaGroupMock = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  findFirst: jest.Mock;
  delete: jest.Mock;
};

type PrismaGroupMemberMock = {
  findFirst: jest.Mock;
  create: jest.Mock;
};

type PrismaUserMock = {
  findUnique: jest.Mock;
};

describe("GroupService", () => {
  let service: GroupService;
  let prismaGroup: PrismaGroupMock;
  let prismaGroupMember: PrismaGroupMemberMock;
  let prismaUser: PrismaUserMock;

  beforeEach(async () => {
    prismaGroup = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    };

    prismaGroupMember = {
      findFirst: jest.fn(),
      create: jest.fn(),
    };

    prismaUser = {
      findUnique: jest.fn(),
    };

    const prismaMock = {
      group: prismaGroup,
      groupMember: prismaGroupMember,
      user: prismaUser,
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
      const data: { name: string; description: string } = {
        name: "Test Group1",
        description: "demo",
      };
      const created: { id: string; name: string; description: string } = {
        id: "group-12",
        ...data,
      };
      prismaGroup.create.mockResolvedValue(created);

      const result = await service.createGroup(userId, data);
      expect(result).toEqual(created);
      expect(prismaGroup.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("createFriendGroup", () => {
    it("creates a two-admin group for a valid friend email", async () => {
      const userId = "user-1";
      const friendEmail = "friend@local";
      const friend: { id: string } = { id: "user-2" };
      const created: { id: string; name: string } = { id: "group-1", name: "" };

      prismaUser.findUnique.mockResolvedValue(friend);
      prismaGroup.create.mockResolvedValue(created);

      const result = await service.createFriendGroup(userId, friendEmail);

      expect(result).toEqual(created);
      expect(prismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: friendEmail },
        select: { id: true },
      });
      const createCall = prismaGroup.create.mock.calls[0] as unknown[];
      const createPayload = createCall[0] as {
        data: {
          name: string;
          invitationCode: string;
          members: {
            createMany: {
              data: Array<{ userId: string; role: GroupRole }>;
            };
          };
        };
      };

      expect(createPayload).toBeDefined();
      expect(createPayload.data.name).toBe("");
      expect(typeof createPayload.data.invitationCode).toBe("string");
      expect(createPayload.data.members.createMany.data).toEqual([
        { userId, role: GroupRole.ADMIN },
        { userId: friend.id, role: GroupRole.ADMIN },
      ]);
    });

    it("throws when the friend email belongs to the current user", async () => {
      prismaUser.findUnique.mockResolvedValue({ id: "user-1" });

      await expect(
        service.createFriendGroup("user-1", "friend@local"),
      ).rejects.toThrow(
        new BadRequestException("You cannot add yourself as a friend"),
      );
      expect(prismaGroup.create).not.toHaveBeenCalled();
    });

    it("throws when no user exists for the provided email", async () => {
      prismaUser.findUnique.mockResolvedValue(null);

      await expect(
        service.createFriendGroup("user-1", "missing@local"),
      ).rejects.toThrow(
        new NotFoundException("No user found with email: missing@local"),
      );
      expect(prismaGroup.create).not.toHaveBeenCalled();
    });
  });

  describe("getAllFriendGroups", () => {
    it("returns groups with exactly two members for the current user", async () => {
      const groups: Array<{
        id: string;
        name: string;
        members: Array<{ userId: string }>;
      }> = [
        {
          id: "group-1",
          name: "",
          members: [{ userId: "user-1" }, { userId: "user-2" }],
        },
      ];
      prismaGroup.findMany.mockResolvedValue(groups);

      const result = await service.getAllFriendGroups("user-1");

      expect(result).toEqual(groups);
      expect(prismaGroup.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              userId: "user-1",
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    });
  });

  describe("findGroupById", () => {
    it("returns the group when found", async () => {
      const group: { id: string; name: string } = {
        id: "group-1",
        name: "Test",
      };
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
      const existing: { id: string; name: string } = {
        id: "group-1",
        name: "Old",
      };
      const update: { name: string } = { name: "New" };
      const updated: { id: string; name: string } = {
        id: "group-1",
        name: "New",
      };
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
      const group: { id: string; name: string } = {
        id: "group-1",
        name: "Test",
      };
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

  describe("joinGroupViaInvitationCode", () => {
    const invitationCode = "abc123";
    const userId = "user-1";
    const group = { id: "group-1", name: "Test Group" };

    it("should throw NotFoundException when invitation code is invalid", async () => {
      prismaGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.joinGroupViaInvitationCode(invitationCode, userId),
      ).rejects.toThrow(new NotFoundException("Invalid invitation code"));

      expect(prismaGroup.findUnique).toHaveBeenCalledWith({
        where: { invitationCode },
      });
      expect(prismaGroupMember.findFirst).not.toHaveBeenCalled();
      expect(prismaGroupMember.create).not.toHaveBeenCalled();
    });

    it("should throw ConflictException when user is already a member", async () => {
      prismaGroup.findUnique.mockResolvedValue(group);
      prismaGroupMember.findFirst.mockResolvedValue({
        id: "membership-1",
        groupId: group.id,
        userId,
      });

      await expect(
        service.joinGroupViaInvitationCode(invitationCode, userId),
      ).rejects.toThrow(
        new ConflictException("You are already a member of this group"),
      );

      expect(prismaGroup.findUnique).toHaveBeenCalledWith({
        where: { invitationCode },
      });
      expect(prismaGroupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: group.id, userId },
      });
      expect(prismaGroupMember.create).not.toHaveBeenCalled();
    });

    it("should create a GroupMember entry when invitation is valid and user is not a member", async () => {
      const createdMember = {
        id: "membership-1",
        groupId: group.id,
        userId,
        role: GroupRole.MEMBER,
      };
      prismaGroup.findUnique.mockResolvedValue(group);
      prismaGroupMember.findFirst.mockResolvedValue(null);
      prismaGroupMember.create.mockResolvedValue(createdMember);

      const result = await service.joinGroupViaInvitationCode(
        invitationCode,
        userId,
      );

      expect(result).toEqual(createdMember);
      expect(prismaGroup.findUnique).toHaveBeenCalledWith({
        where: { invitationCode },
      });
      expect(prismaGroupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: group.id, userId },
      });
      expect(prismaGroupMember.create).toHaveBeenCalledWith({
        data: {
          groupId: group.id,
          userId,
          role: GroupRole.MEMBER,
        },
      });
    });
  });
});
