const { expect } = require("chai");
const { ethers } = require("hardhat");

// Test suite for the Modular DAO Factory Demo
// Demonstrates deploying the kernel, modules, catalog, and factory, then creating and interacting with DAOs

describe("Modular DAO Factory Demo", function () {
  let kernelImpl, greetingImpl, counterImpl, catalog, factory, owner;

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

    // 2) Deploy example module contracts: GreetingModule and CounterModule
    const G = await ethers.getContractFactory("GreetingModule");
    greetingImpl = await G.deploy();
    await greetingImpl.waitForDeployment();

    const C = await ethers.getContractFactory("CounterModule");
    counterImpl = await C.deploy();
    await counterImpl.waitForDeployment();

    // 3) Deploy the TemplateCatalog and register the modules
    const Catalog = await ethers.getContractFactory("TemplateCatalog");
    catalog = await Catalog.deploy();
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
    // Look up the GreetingModule address from the catalog
    const modAddr = await catalog.getModule(
      ethers.encodeBytes32String("GREETER")
    );
    
    // Create a new DAO (proxy) with the GreetingModule
    const tx = await factory.createDao(modAddr);
    const receipt = await tx.wait();

    // Find the DaoCreated event and extract the new DAO address
    const event = receipt.logs.find((e) => e.fragment.name === "DaoCreated");
    const { dao: greeterDao } = event.args;

    // Interact with the new DAO as if it were a GreetingModule
    const greeter = await ethers.getContractAt("GreetingModule", greeterDao);
    await greeter.setGreeting("Hello Modular!");
    expect(await greeter.sayHello()).to.equal("Hello Modular!");
  });

  // Test: Create a DAO with the CounterModule and interact with it
  it("creates a COUNTER DAO and uses its module", async () => {
    // Look up the CounterModule address from the catalog
    const modAddr = await catalog.getModule(
      ethers.encodeBytes32String("COUNTER")
    );

    // Create a new DAO (proxy) with the CounterModule
    const tx = await factory.createDao(modAddr);
    const receipt = await tx.wait();

    // Find the DaoCreated event and extract the new DAO address
    const event = receipt.logs.find((e) => e.fragment.name === "DaoCreated");
    const { dao: counterDao } = event.args;

    // Interact with the new DAO as if it were a CounterModule
    const counter = await ethers.getContractAt("CounterModule", counterDao);
    
    // The counter should start at 0
    expect(await counter.getCount()).to.equal(0);
    
    // Increment the counter and check the value
    await counter.increment();
    expect(await counter.getCount()).to.equal(1);
  });
});