const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');

// Main integration and registry test for the Modular DAO Factory system.
// Covers: DAO creation, registry, metadata, querying by template, member count, JSON template-driven creation, and multi-module integration.
// Detailed module logic (e.g., MemberModule roles, join requests) is tested in module-specific test files.

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
    const modules1 = [memberImpl.target];
    const initData1 = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [owner.address])];
    const tx1 = await factory.connect(owner).createDao(
      modules1,
      initData1,
      "Public DAO",
      "A public group",
      true,
      "default"
    );
    const receipt1 = await tx1.wait();
    const event1 = receipt1.logs.find((e) => e.fragment && e.fragment.name === "DaoCreated");
    if (!event1) throw new Error("DaoCreated event not found");
    const dao1 = event1.args.dao;

    const modules2 = [memberImpl.target];
    const initData2 = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [addr1.address])];
    const tx2 = await factory.connect(addr1).createDao(
      modules2,
      initData2,
      "Private DAO",
      "A private group",
      false,
      "default"
    );
    const receipt2 = await tx2.wait();
    const event2 = receipt2.logs.find((e) => e.fragment && e.fragment.name === "DaoCreated");
    if (!event2) throw new Error("DaoCreated event not found");
    const dao2 = event2.args.dao;

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

  it("lists DAOs by template", async () => {
    const daos = await factory.getDaosByTemplate("default");
    expect(daos.length).to.equal(2);
    expect(daos[0].name).to.equal("Public DAO");
    expect(daos[1].name).to.equal("Private DAO");
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

  it("creates a DAO from a JSON template", async () => {
    // Load template
    const template = JSON.parse(fs.readFileSync("test/dao_template.json", "utf8"));
    // Deploy all modules
    const G = await ethers.getContractFactory("GreetingModule");
    const greetingImpl = await G.deploy();
    await greetingImpl.waitForDeployment();
    const C = await ethers.getContractFactory("CounterModule");
    const counterImpl = await C.deploy();
    await counterImpl.waitForDeployment();
    // Map module names to deployed addresses
    const moduleAddressMap = {
      MemberModule: memberImpl.target,
      GreetingModule: greetingImpl.target,
      CounterModule: counterImpl.target
    };
    // Simulate user input for instance creation
    const instanceName = "Solidity Enthusiasts DAO";
    const instanceDescription = "A DAO for Solidity fans to collaborate and learn";
    const isPublic = true;
    // Simulate user input for module params (admin address for MemberModule)
    const userModuleParams = [
      { admin: owner.address }, // for MemberModule
      {}, // for GreetingModule
      {}  // for CounterModule
    ];
    // Build modules and initData arrays from user input
    const modules = template.modules.map((name) => moduleAddressMap[name]);
    const initData = template.initParamsSchema.map((schema, i) => {
      if (template.modules[i] === "MemberModule") {
        return ethers.AbiCoder.defaultAbiCoder().encode(["address"], [userModuleParams[i].admin]);
      } else {
        return "0x";
      }
    });
    // Use user-supplied instance fields
    const tx = await factory.createDao(
      modules,
      initData,
      instanceName,
      instanceDescription,
      isPublic,
      template.templateId
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment && e.fragment.name === "DaoCreated");
    if (!event) throw new Error("DaoCreated event not found");
    const dao = event.args.dao;
    // Check metadata
    const daoCount = await factory.getDaoCount();
    const index = Number(BigInt(daoCount) - 1n);
    const info = await factory.getDaoInfo(index);
    expect(info.name).to.equal(instanceName);
    expect(info.description).to.equal(instanceDescription);
    expect(info.isPublic).to.equal(isPublic);
    expect(info.modules.length).to.equal(3);
    // Check MemberModule functionality
    const member = await ethers.getContractAt("MemberModule", dao);
    expect(await member.getRole(owner.address)).to.equal(2); // Admin
    // Check GreetingModule functionality
    const greeter = await ethers.getContractAt("GreetingModule", dao);
    await greeter.setGreeting("Hello from JSON!");
    expect(await greeter.sayHello()).to.equal("Hello from JSON!");
    // Check CounterModule functionality
    const counter = await ethers.getContractAt("CounterModule", dao);
    expect((await counter.getCount()).toString()).to.equal("0");
    await counter.increment();
    expect((await counter.getCount()).toString()).to.equal("1");
  });
}); 