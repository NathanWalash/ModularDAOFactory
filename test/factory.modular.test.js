const { expect } = require("chai");
const { ethers } = require("hardhat");

// Test suite for the Modular DAO Factory Demo
// Demonstrates deploying the kernel, modules, catalog, and factory, then creating and interacting with DAOs

describe("Modular DAO Factory Demo", function () {
  let kernelImpl, greetingImpl, counterImpl, memberImpl, factory, owner;

  // Deploy all contracts and set up the environment before running tests
  before(async () => {
    [owner] = await ethers.getSigners();

    // 1) Deploy the Kernel implementation contract
    // Use fully qualified name to avoid ambiguity in contract factories
    const Kernel = await ethers.getContractFactory(
      "contracts/DaoKernel.sol:DaoKernel"
    );
    kernelImpl = await Kernel.deploy();
    await kernelImpl.waitForDeployment();

    // 2) Deploy example module contracts: GreetingModule, CounterModule, and MemberModule
    const G = await ethers.getContractFactory("GreetingModule");
    greetingImpl = await G.deploy();
    await greetingImpl.waitForDeployment();

    const C = await ethers.getContractFactory("CounterModule");
    counterImpl = await C.deploy();
    await counterImpl.waitForDeployment();

    const M = await ethers.getContractFactory("MemberModule");
    memberImpl = await M.deploy();
    await memberImpl.waitForDeployment();

    // 3) Deploy the TemplateCatalog and register the modules
    const Catalog = await ethers.getContractFactory("TemplateCatalog");
    const catalog = await Catalog.deploy();
    await catalog.waitForDeployment();
    
    // Register the Greeting and Counter modules in the catalog
    // Use .target to get the deployed address (ethers v6 style)
    await catalog.registerTemplate(
      ethers.encodeBytes32String("GREETER"),
      greetingImpl.target 
    );
    await catalog.registerTemplate(
      ethers.encodeBytes32String("COUNTER"),
      counterImpl.target 
    );

    // 4) Deploy the DaoFactory, pointing it at the kernel implementation
    const Factory = await ethers.getContractFactory("DaoFactory");
    factory = await Factory.deploy(kernelImpl.target); 
    await factory.waitForDeployment();
  });

  // Test: Create a DAO with the GreetingModule and interact with it
  it("creates a GREETER DAO and uses its module", async () => {
    const modules = [greetingImpl.target];
    const initData = ["0x"];
    const tx = await factory.createDao(
      modules,
      initData,
      "Greeter DAO",
      "A DAO with a greeting module",
      true,
      "greeter"
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment && e.fragment.name === "DaoCreated");
    if (!event) throw new Error("DaoCreated event not found");
    const greeterDao = event.args.dao;
    const greeter = await ethers.getContractAt("GreetingModule", greeterDao);
    await greeter.setGreeting("Hello Modular!");
    expect(await greeter.sayHello()).to.equal("Hello Modular!");
  });

  // Test: Create a DAO with the CounterModule and interact with it
  it("creates a COUNTER DAO and uses its module", async () => {
    const modules = [counterImpl.target];
    const initData = ["0x"];
    const tx = await factory.createDao(
      modules,
      initData,
      "Counter DAO",
      "A DAO with a counter module",
      true,
      "counter"
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment && e.fragment.name === "DaoCreated");
    if (!event) throw new Error("DaoCreated event not found");
    const counterDao = event.args.dao;
    const counter = await ethers.getContractAt("CounterModule", counterDao);
    expect(await counter.getCount()).to.equal(0);
    await counter.increment();
    expect(await counter.getCount()).to.equal(1);
  });

  it("creates a DAO with both MemberModule and GreetingModule, and members can use both", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const modules = [memberImpl.target, greetingImpl.target];
    const initData = [
      ethers.AbiCoder.defaultAbiCoder().encode(["address"], [owner.address]), // MemberModule.init
      "0x" // GreetingModule.init (no-op)
    ];
    const tx = await factory.createDao(
      modules,
      initData,
      "Multi-Module DAO",
      "A DAO with members and greetings",
      true,
      "multi"
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment && e.fragment.name === "DaoCreated");
    if (!event) throw new Error("DaoCreated event not found");
    const dao = event.args.dao;
    const member = await ethers.getContractAt("MemberModule", dao);
    const greeter = await ethers.getContractAt("GreetingModule", dao);
    // MemberModule: owner is admin, addr1 requests to join
    await member.connect(addr1).requestToJoin();
    await member.connect(owner).acceptRequest(addr1.address, 1); // Make addr1 a member
    // GreetingModule: addr1 can set and get greeting
    await greeter.connect(addr1).setGreeting("Hi from member!");
    expect(await greeter.sayHello()).to.equal("Hi from member!");
  });
});