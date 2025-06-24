// contracts/DaoFactory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Import the interface for the DAO kernel (proxy logic contract)
import "./interfaces/IDaoKernel.sol";
// Import OpenZeppelin's Clones library for minimal proxy deployment
import "@openzeppelin/contracts/proxy/Clones.sol";

// DaoFactory is responsible for deploying new DAO instances (proxies) with a selected module
contract DaoFactory {
    // Address of the kernel implementation contract (the logic contract for proxies)
    address public kernelImpl;
    // Emitted when a new DAO is created
    event DaoCreated(address indexed dao, address indexed module);

    // Set the kernel implementation address at deployment
    constructor(address _kernelImpl) {
        kernelImpl = _kernelImpl;
    }

    // Deploy a new DAO (proxy) and initialize it with the selected module
    function createDao(address module) external returns (address) {
        // Deploy a minimal proxy (clone) pointing to the kernel implementation
        address clone = Clones.clone(kernelImpl);
        
        // Initialize the new DAO with the provided module
        // The kernel expects an array, so wrap the module in a singleton array
        IDaoKernel(payable(clone)).initModules(_asSingletonArray(module));
        
        // Emit event for tracking
        emit DaoCreated(clone, module);
        return clone;
    }

    // Helper to wrap a module address in a single-element array (required by kernel interface)
    function _asSingletonArray(address module)
        private
        pure
        returns (address[] memory arr)
    {
        arr = new address[](1);
        arr[0] = module;
    }
}