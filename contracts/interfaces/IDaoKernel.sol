// contracts/interfaces/IDaoKernel.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDaoKernel {
    function initModules(address[] calldata _modules) external;
}