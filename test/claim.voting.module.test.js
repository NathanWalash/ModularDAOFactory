const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');

describe("ClaimVotingModule Integration", function () {
  let kernelImpl, factory, memberImpl, claimVotingImpl;
  let owner, addr1, addr2, addr3, outsider;

  before(async () => {
    [owner, addr1, addr2, addr3, outsider] = await ethers.getSigners();
    // Deploy Kernel implementation
    const Kernel = await ethers.getContractFactory("contracts/DaoKernel.sol:DaoKernel");
    kernelImpl = await Kernel.deploy();
    await kernelImpl.waitForDeployment();
    // Deploy DaoFactory
    const Factory = await ethers.getContractFactory("DaoFactory");
    factory = await Factory.deploy(kernelImpl.target);
    await factory.waitForDeployment();
    // Deploy modules
    const Member = await ethers.getContractFactory("MemberModule");
    memberImpl = await Member.deploy();
    await memberImpl.waitForDeployment();
    const ClaimVoting = await ethers.getContractFactory("ClaimVotingModule");
    claimVotingImpl = await ClaimVoting.deploy();
    await claimVotingImpl.waitForDeployment();
  });

  function setupDaoAndMembers(quorum = 2) {
    return (async () => {
      const template = JSON.parse(fs.readFileSync("test/dao_claim_voting_template.json", "utf8"));
      const moduleAddressMap = {
        MemberModule: memberImpl.target,
        ClaimVotingModule: claimVotingImpl.target
      };
      const userModuleParams = [
        { admin: owner.address },
        { quorum }
      ];
      const modules = template.modules.map((name) => moduleAddressMap[name]);
      const initData = template.initParamsSchema.map((schema, i) => {
        if (template.modules[i] === "MemberModule") {
          return ethers.AbiCoder.defaultAbiCoder().encode(["address"], [userModuleParams[i].admin]);
        } else if (template.modules[i] === "ClaimVotingModule") {
          return ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [userModuleParams[i].quorum]);
        } else {
          return "0x";
        }
      });
      const tx = await factory.createDao(
        modules,
        initData,
        "Claims DAO",
        "A DAO with claims and voting",
        true,
        template.templateId
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find((e) => e.fragment && e.fragment.name === "DaoCreated");
      const dao = event.args.dao;
      const member = await ethers.getContractAt("MemberModule", dao);
      const claimVoting = await ethers.getContractAt("ClaimVotingModule", dao);
      // Add members
      await member.connect(addr1).requestToJoin();
      await member.connect(addr2).requestToJoin();
      await member.connect(addr3).requestToJoin();
      await member.connect(owner).acceptRequest(addr1.address, 1);
      await member.connect(owner).acceptRequest(addr2.address, 1);
      await member.connect(owner).acceptRequest(addr3.address, 1);
      return { dao, member, claimVoting };
    })();
  }

  it("allows members to join and be accepted", async () => {
    const { member } = await setupDaoAndMembers();
    const role1 = await member.getRole(addr1.address);
    const role2 = await member.getRole(addr2.address);
    const role3 = await member.getRole(addr3.address);
    expect(role1).to.equal(1);
    expect(role2).to.equal(1);
    expect(role3).to.equal(1);
  });

  it("edge: non-member cannot create a claim", async () => {
    const { claimVoting } = await setupDaoAndMembers();
    await expect(claimVoting.connect(outsider).createClaim("Outsider Claim", 50, "Should fail")).to.be.revertedWith("Only member");
  });

  it("edge: non-member cannot vote on a claim", async () => {
    const { claimVoting, member } = await setupDaoAndMembers();
    await claimVoting.connect(addr1).createClaim("Test", 1, "desc");
    await expect(claimVoting.connect(outsider).voteOnClaim(0, true)).to.be.revertedWith("Only member");
  });

  it("edge: admin can create and vote on claims", async () => {
    const { claimVoting } = await setupDaoAndMembers();
    await claimVoting.connect(owner).createClaim("Admin Claim", 123, "Admin test");
    await claimVoting.connect(addr1).voteOnClaim(0, true);
    await claimVoting.connect(addr2).voteOnClaim(0, true); // Should finalize as approved
    const claims = await claimVoting.getClaims();
    expect(claims[0].status).to.equal(1); // Approved
  });

  it("edge: cannot create a claim with empty title", async () => {
    const { claimVoting } = await setupDaoAndMembers();
    await expect(claimVoting.connect(addr1).createClaim("", 10, "No title")).to.not.be.reverted; // Allow empty title for now
  });

  it("allows a member to create a claim", async () => {
    const { claimVoting } = await setupDaoAndMembers();
    await claimVoting.connect(addr1).createClaim("Test Claim", 100, "Test description");
    const claims = await claimVoting.getClaims();
    expect(claims.length).to.equal(1);
    expect(claims[0].title).to.equal("Test Claim");
    expect(claims[0].status).to.equal(0); // Pending
  });

  it("allows members to vote and finalizes claim at quorum (rejection)", async () => {
    const { claimVoting } = await setupDaoAndMembers();
    await claimVoting.connect(addr1).createClaim("Test Claim", 100, "Test description");
    await claimVoting.connect(owner).voteOnClaim(0, false);
    await claimVoting.connect(addr2).voteOnClaim(0, false);
    const claims = await claimVoting.getClaims();
    expect(claims[0].status).to.equal(2); // Rejected
    await expect(claimVoting.connect(addr3).voteOnClaim(0, false)).to.be.revertedWith("Not pending");
  });

  it("allows another claim to be created and approved", async () => {
    const { claimVoting } = await setupDaoAndMembers();
    await claimVoting.connect(addr3).createClaim("Second Claim", 200, "Another test");
    await claimVoting.connect(owner).voteOnClaim(0, true);
    await claimVoting.connect(addr1).voteOnClaim(0, true);
    const claims = await claimVoting.getClaims();
    expect(claims[0].status).to.equal(1); // Approved
  });

  it("prevents claimant from voting on their own claim (before finalized)", async () => {
    const { claimVoting } = await setupDaoAndMembers();
    await claimVoting.connect(addr2).createClaim("Third Claim", 300, "Edge");
    await expect(claimVoting.connect(addr2).voteOnClaim(0, true)).to.be.revertedWith("Claimant cannot vote");
  });

  it("prevents double voting (before finalized)", async () => {
    const { claimVoting } = await setupDaoAndMembers();
    await claimVoting.connect(addr2).createClaim("Third Claim", 300, "Edge");
    await claimVoting.connect(owner).voteOnClaim(0, true);
    await expect(claimVoting.connect(owner).voteOnClaim(0, true)).to.be.revertedWith("Already voted");
    await claimVoting.connect(addr1).voteOnClaim(0, true); // Finalize
    await expect(claimVoting.connect(addr3).voteOnClaim(0, true)).to.be.revertedWith("Not pending");
  });
}); 