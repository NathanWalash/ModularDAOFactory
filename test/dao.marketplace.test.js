const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Marketplace/Registry", function () {
  let kernelImpl, memberImpl, factory, owner, addr1, addr2;

  before(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

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
  });

  it("creates DAOs with metadata and stores them in the registry", async () => {
    // Create two DAOs: one public, one private
    const tx1 = await factory.connect(owner).createDao(
      memberImpl.target,
      "Public DAO",
      "A public group",
      true
    );
    const receipt1 = await tx1.wait();
    const event1 = receipt1.logs.find((e) => e.fragment.name === "DaoCreated");
    const dao1 = event1.args.dao;

    const tx2 = await factory.connect(addr1).createDao(
      memberImpl.target,
      "Private DAO",
      "A private group",
      false
    );
    const receipt2 = await tx2.wait();
    const event2 = receipt2.logs.find((e) => e.fragment.name === "DaoCreated");
    const dao2 = event2.args.dao;

    // Initialize both DAOs
    const memberModule1 = await ethers.getContractAt("MemberModule", dao1);
    await memberModule1.connect(owner).init(owner.address);
    const memberModule2 = await ethers.getContractAt("MemberModule", dao2);
    await memberModule2.connect(addr1).init(addr1.address);

    // There should be 2 DAOs in the registry
    expect(await factory.getDaoCount()).to.equal(2);

    // Query DAO info by index
    const info1 = await factory.getDaoInfo(0);
    expect(info1.name).to.equal("Public DAO");
    expect(info1.isPublic).to.be.true;
    expect(info1.creator).to.equal(owner.address);
    const info2 = await factory.getDaoInfo(1);
    expect(info2.name).to.equal("Private DAO");
    expect(info2.isPublic).to.be.false;
    expect(info2.creator).to.equal(addr1.address);
  });

  it("lists only public DAOs", async () => {
    const publicDaos = await factory.getAllPublicDaos();
    expect(publicDaos.length).to.equal(1);
    expect(publicDaos[0].name).to.equal("Public DAO");
  });

  it("lists DAOs by creator", async () => {
    const ownerDaos = await factory.getDaosByCreator(owner.address);
    expect(ownerDaos.length).to.equal(1);
    expect(ownerDaos[0].name).to.equal("Public DAO");
    const addr1Daos = await factory.getDaosByCreator(addr1.address);
    expect(addr1Daos.length).to.equal(1);
    expect(addr1Daos[0].name).to.equal("Private DAO");
  });

  it("can query member count for a DAO", async () => {
    // Get the first DAO (public)
    const info1 = await factory.getDaoInfo(0);
    const memberModule1 = await ethers.getContractAt("MemberModule", info1.dao);
    expect(await memberModule1.getMemberCount()).to.equal(1); // Only owner
  });

  it("updates member count as users join and are accepted", async () => {
    // Get the first DAO (public)
    const info1 = await factory.getDaoInfo(0);
    const memberModule1 = await ethers.getContractAt("MemberModule", info1.dao);
    // addr2 requests to join
    await memberModule1.connect(addr2).requestToJoin();
    // owner accepts addr2
    await memberModule1.connect(owner).acceptRequest(addr2.address, 1); // Role.Member
    expect(await memberModule1.getMemberCount()).to.equal(2);
  });
}); 