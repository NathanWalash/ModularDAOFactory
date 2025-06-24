// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// TemplateCatalog is a registry for module templates
// It allows registering and looking up module addresses by name
contract TemplateCatalog {
    // Mapping from template name (as bytes32) to module address
    mapping(bytes32 => address) public templates;

    // Emitted when a new template is registered
    event TemplateRegistered(bytes32 indexed name, address module);

    // Register a new module template with a name
    function registerTemplate(bytes32 name, address module) external {
        templates[name] = module;
        emit TemplateRegistered(name, module);
    }

    // Retrieve the module address for a given template name
    function getModule(bytes32 name) external view returns (address) {
        return templates[name];
    }
}
