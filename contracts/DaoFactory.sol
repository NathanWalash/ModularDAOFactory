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
        address[] modules;
        address creator;
        uint256 createdAt;
    }

    // Address of the kernel implementation contract (the logic contract for proxies)
    address public kernelImpl;
    DaoInfo[] public daos;
    mapping(address => uint256) public daoIndex; // dao address => index+1 in daos array
    // Emitted when a new DAO is created
    event DaoCreated(address indexed dao, address[] modules, string name, bool isPublic);

    // Set the kernel implementation address at deployment
    constructor(address _kernelImpl) {
        kernelImpl = _kernelImpl;
    }

    // Deploy a new DAO (proxy) and initialize it with the selected modules and metadata
    function createDao(
        address[] calldata modules,
        bytes[] calldata initData,
        string calldata name,
        string calldata description,
        bool isPublic
    ) external returns (address) {
        require(modules.length == initData.length, "Modules/initData length mismatch");
        address clone = Clones.clone(kernelImpl);
        // Initialize the new DAO with the provided modules and init data
        (bool success, ) = clone.call(
            abi.encodeWithSignature("initModules(address[],bytes[])", modules, initData)
        );
        require(success, "Initialization failed");
        // Store DAO metadata
        daos.push(DaoInfo({
            dao: clone,
            name: name,
            description: description,
            isPublic: isPublic,
            modules: modules,
            creator: msg.sender,
            createdAt: block.timestamp
        }));
        daoIndex[clone] = daos.length; // index+1
        emit DaoCreated(clone, modules, name, isPublic);
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
}