import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { UserRepository } from "../repository/user.repository";
import { GroupMemberService } from "./group-member.service";
import { GroupRole } from "../../generated/prisma/client/enums";

describe("GroupMemberService", () => {
  let service: GroupMemberService;
  let prismaGroup: { findUnique: jest.Mock; findFirst: jest.Mock };
  let prismaGroupMember: {
    findFirst: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  let userRepository: { validateUserExists: jest.Mock };

  beforeEach(async () => {
    prismaGroup = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    };

    prismaGroupMember = {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    userRepository = {
      validateUserExists: jest.fn(),
    };

    const prismaMock = {
      group: prismaGroup,
      groupMember: prismaGroupMember,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupMemberService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<GroupMemberService>(GroupMemberService);
  });

  describe("addMemberToGroup", () => {
    const groupId = "group-1";
    const currentUserId = "user-1";
    const email = "friend@test.com";
    const user = { id: "user-2", email };

    it("should add a member when no friend group conflicts", async () => {
      prismaGroup.findUnique.mockResolvedValueOnce({ id: groupId }); // validateGroupExists
      userRepository.validateUserExists.mockResolvedValueOnce(user);
      prismaGroupMember.findFirst.mockResolvedValueOnce(null); // not a member already

      // Group has exactly 1 member
      prismaGroup.findUnique.mockResolvedValueOnce({
        id: groupId,
        _count: { members: 1 },
      });
      // No existing friend group
      prismaGroup.findFirst.mockResolvedValueOnce(null);

      const createdMember = {
        id: "membership-1",
        groupId,
        userId: user.id,
        role: GroupRole.MEMBER,
      };
      prismaGroupMember.create.mockResolvedValueOnce(createdMember);

      const result = await service.addMemberToGroup(
        groupId,
        email,
        currentUserId,
      );
      expect(result).toEqual(createdMember);
      expect(prismaGroupMember.create).toHaveBeenCalledWith({
        data: {
          groupId,
          userId: user.id,
          role: GroupRole.MEMBER,
        },
      });
    });

    it("should throw ConflictException when adding to a 1-member group creates a duplicate friend group", async () => {
      prismaGroup.findUnique.mockResolvedValueOnce({ id: groupId }); // validateGroupExists
      userRepository.validateUserExists.mockResolvedValueOnce(user);
      prismaGroupMember.findFirst.mockResolvedValueOnce(null); // not a member already

      // Group has exactly 1 member
      prismaGroup.findUnique.mockResolvedValueOnce({
        id: groupId,
        _count: { members: 1 },
      });
      // Existing friend group found
      prismaGroup.findFirst.mockResolvedValueOnce({
        id: "existing-friend-group",
        _count: { members: 2 },
      });

      await expect(
        service.addMemberToGroup(groupId, email, currentUserId),
      ).rejects.toThrow(
        new ConflictException(
          "You and this person are already friends, so a 2-person group isn't needed — you can split expenses directly from your friendship. Add another member if you'd like to turn this into a group",
        ),
      );

      expect(prismaGroupMember.create).not.toHaveBeenCalled();
    });

    it("should not check for friend group if group currently has > 1 members", async () => {
      prismaGroup.findUnique.mockResolvedValueOnce({ id: groupId }); // validateGroupExists
      userRepository.validateUserExists.mockResolvedValueOnce(user);
      prismaGroupMember.findFirst.mockResolvedValueOnce(null); // not a member already

      // Group has 2 members (will be 3)
      prismaGroup.findUnique.mockResolvedValueOnce({
        id: groupId,
        _count: { members: 2 },
      });

      const createdMember = {
        id: "membership-1",
        groupId,
        userId: user.id,
        role: GroupRole.MEMBER,
      };
      prismaGroupMember.create.mockResolvedValueOnce(createdMember);

      const result = await service.addMemberToGroup(
        groupId,
        email,
        currentUserId,
      );
      expect(result).toEqual(createdMember);

      // Should not call findFirst to check for friend group
      expect(prismaGroup.findFirst).not.toHaveBeenCalled();
    });
  });
});
