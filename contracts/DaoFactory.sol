// contracts/DaoFactory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Import OpenZeppelin's Clones library for minimal proxy deployment
import "@openzeppelin/contracts/proxy/Clones.sol";

// DaoFactory is responsible for deploying new DAO instances (proxies) with a selected module
contract DaoFactory {
    // DAO metadata struct
    struct DaoInfo {
        address dao;
        string name;
        string description;
        bool isPublic;
        address module;
        address creator;
        uint256 createdAt;
    }

    // Address of the kernel implementation contract (the logic contract for proxies)
    address public kernelImpl;
    DaoInfo[] public daos;
    mapping(address => uint256) public daoIndex; // dao address => index+1 in daos array
    // Emitted when a new DAO is created
    event DaoCreated(address indexed dao, address indexed module, string name, bool isPublic);

    // Set the kernel implementation address at deployment
    constructor(address _kernelImpl) {
        kernelImpl = _kernelImpl;
    }

    // Deploy a new DAO (proxy) and initialize it with the selected module and metadata
    function createDao(
        address module,
        string calldata name,
        string calldata description,
        bool isPublic
    ) external returns (address) {
        // Deploy a minimal proxy (clone) pointing to the kernel implementation
        address clone = Clones.clone(kernelImpl);
        
        // Initialize the new DAO with the provided module using a low-level call
        address[] memory modules = _asSingletonArray(module);
        (bool success, ) = clone.call(
            abi.encodeWithSignature("initModules(address[])", modules)
        );
        require(success, "Initialization failed");
        
        // Store DAO metadata
        daos.push(DaoInfo({
            dao: clone,
            name: name,
            description: description,
            isPublic: isPublic,
            module: module,
            creator: msg.sender,
            createdAt: block.timestamp
        }));
        daoIndex[clone] = daos.length; // index+1
        
        // Emit event for tracking
        emit DaoCreated(clone, module, name, isPublic);
        return clone;
    }

    // Get the number of DAOs created
    function getDaoCount() external view returns (uint256) {
        return daos.length;
    }

    // Get DAO info by index
    function getDaoInfo(uint256 index) external view returns (DaoInfo memory) {
        require(index < daos.length, "Index out of bounds");
        return daos[index];
    }

    // Get all public DAOs
    function getAllPublicDaos() external view returns (DaoInfo[] memory) {
        uint count = 0;
        for (uint i = 0; i < daos.length; i++) {
            if (daos[i].isPublic) count++;
        }
        DaoInfo[] memory result = new DaoInfo[](count);
        uint idx = 0;
        for (uint i = 0; i < daos.length; i++) {
            if (daos[i].isPublic) {
                result[idx++] = daos[i];
            }
        }
        return result;
    }

    // Get all DAOs created by a user
    function getDaosByCreator(address creator) external view returns (DaoInfo[] memory) {
        uint count = 0;
        for (uint i = 0; i < daos.length; i++) {
            if (daos[i].creator == creator) count++;
        }
        DaoInfo[] memory result = new DaoInfo[](count);
        uint idx = 0;
        for (uint i = 0; i < daos.length; i++) {
            if (daos[i].creator == creator) {
                result[idx++] = daos[i];
            }
        }
        return result;
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