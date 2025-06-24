const { expect } = require("chai");
const { ethers } = require("hardhat");

// Test suite for the updated MemberModule with roles and join requests

describe("MemberModule (roles & join requests)", function () {
  let kernelImpl, memberImpl, factory, owner, dao, addr1, addr2, addr3;

  before(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy Kernel implementation
    const Kernel = await ethers.getContractFactory(
      "contracts/DaoKernel.sol:DaoKernel"
    );
    kernelImpl = await Kernel.deploy();
    await kernelImpl.waitForDeployment();

    // Deploy MemberModule
    const Member = await ethers.getContractFactory("MemberModule");
    memberImpl = await Member.deploy();
    await memberImpl.waitForDeployment();

    // Deploy DaoFactory
    const Factory = await ethers.getContractFactory("DaoFactory");
    factory = await Factory.deploy(kernelImpl.target);
    await factory.waitForDeployment();

    // Create a new DAO using MemberModule
    const modules = [memberImpl.target];
    const initData = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [owner.address])];
    const tx = await factory.createDao(
      modules,
      initData,
      "Test Member DAO",
      "A DAO for member module tests",
      true
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment && e.fragment.name === "DaoCreated");
    if (!event) throw new Error("DaoCreated event not found");
    dao = event.args.dao;
  });

  // Helper to get the MemberModule interface at the DAO address
  function getMemberModuleAtDAO() {
    return ethers.getContractAt("MemberModule", dao);
  }

  it("initializes with deployer as admin", async () => {
    const memberModule = await getMemberModuleAtDAO();
    expect(await memberModule.getRole(owner.address)).to.equal(2); // Role.Admin
    const members = await memberModule.getMembers();
    expect(members).to.include(owner.address);
  });

  it("allows users to request to join", async () => {
    const memberModule = await getMemberModuleAtDAO();
    await memberModule.connect(addr1).requestToJoin();
    await memberModule.connect(addr2).requestToJoin();
    const requests = await memberModule.getJoinRequests();
    expect(requests).to.include(addr1.address);
    expect(requests).to.include(addr2.address);
  });

  it("admin can accept join requests and assign roles", async () => {
    const memberModule = await getMemberModuleAtDAO();
    // Accept addr1 as Member
    await memberModule.connect(owner).acceptRequest(addr1.address, 1); // Role.Member
    expect(await memberModule.getRole(addr1.address)).to.equal(1);
    // Accept addr2 as Admin
    await memberModule.connect(owner).acceptRequest(addr2.address, 2); // Role.Admin
    expect(await memberModule.getRole(addr2.address)).to.equal(2);
    // Requests should be cleared
    const requests = await memberModule.getJoinRequests();
    expect(requests).to.not.include(addr1.address);
    expect(requests).to.not.include(addr2.address);
    // Members list should include new members
    const members = await memberModule.getMembers();
    expect(members).to.include(addr1.address);
    expect(members).to.include(addr2.address);
  });

  it("admin can reject join requests", async () => {
    const memberModule = await getMemberModuleAtDAO();
    // addr3 requests to join
    await memberModule.connect(addr3).requestToJoin();
    let requests = await memberModule.getJoinRequests();
    expect(requests).to.include(addr3.address);
    // Owner rejects addr3
    await memberModule.connect(owner).rejectRequest(addr3.address);
    requests = await memberModule.getJoinRequests();
    expect(requests).to.not.include(addr3.address);
    expect(await memberModule.getRole(addr3.address)).to.equal(0); // Role.None
  });

  it("only admins can accept/reject requests, remove members, or change roles", async () => {
    const memberModule = await getMemberModuleAtDAO();
    // addr1 is a member, not admin
    await expect(
      memberModule.connect(addr1).acceptRequest(addr3.address, 1)
    ).to.be.revertedWith("Only admin");
    await expect(
      memberModule.connect(addr1).rejectRequest(addr3.address)
    ).to.be.revertedWith("Only admin");
    await expect(
      memberModule.connect(addr1).removeMember(owner.address)
    ).to.be.revertedWith("Only admin");
    await expect(
      memberModule.connect(addr1).changeRole(addr2.address, 1)
    ).to.be.revertedWith("Only admin");
  });

  it("admins can change roles and remove members", async () => {
    const memberModule = await getMemberModuleAtDAO();
    // Owner demotes addr2 from Admin to Member
    await memberModule.connect(owner).changeRole(addr2.address, 1); // Role.Member
    expect(await memberModule.getRole(addr2.address)).to.equal(1);
    // Owner removes addr1
    await memberModule.connect(owner).removeMember(addr1.address);
    expect(await memberModule.getRole(addr1.address)).to.equal(0); // Role.None
    const members = await memberModule.getMembers();
    expect(members).to.not.include(addr1.address);
  });

  it("prevents duplicate join requests and role assignment", async () => {
    const memberModule = await getMemberModuleAtDAO();
    // addr2 is already a member
    await expect(
      memberModule.connect(addr2).requestToJoin()
    ).to.be.revertedWith("Already a member or admin");
    // addr3 is not in any role, but already rejected
    await memberModule.connect(addr3).requestToJoin();
    await expect(
      memberModule.connect(addr3).requestToJoin()
    ).to.be.revertedWith("Already requested");
  });
}); 