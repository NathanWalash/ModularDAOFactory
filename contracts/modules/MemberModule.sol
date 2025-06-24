// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// MemberModule with role-based access and join requests
contract MemberModule {
    enum Role { None, Member, Admin }

    // Mapping of address to role
    mapping(address => Role) public roles;
    // List of all members (including admins)
    address[] private memberList;
    // Join requests
    mapping(address => bool) public joinRequests;
    address[] private requestList;
    // Initialization flag
    bool public initialized;

    // Events
    event JoinRequested(address indexed requester);
    event MemberAdded(address indexed member, Role role);
    event MemberRemoved(address indexed member);
    event RoleChanged(address indexed member, Role newRole);
    event JoinRequestHandled(address indexed requester, bool accepted);

    // Modifier: only admins can call
    modifier onlyAdmin() {
        require(roles[msg.sender] == Role.Admin, "Only admin");
        _;
    }

    // Standard Diamond interface: return function selectors
    function getSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](10);
        selectors[0] = this.init.selector;
        selectors[1] = this.requestToJoin.selector;
        selectors[2] = this.acceptRequest.selector;
        selectors[3] = this.rejectRequest.selector;
        selectors[4] = this.removeMember.selector;
        selectors[5] = this.changeRole.selector;
        selectors[6] = this.getMembers.selector;
        selectors[7] = this.getJoinRequests.selector;
        selectors[8] = this.getMemberCount.selector;
        selectors[9] = this.getRole.selector;
    }

    // Standard Diamond init (decode firstAdmin from bytes)
    function init(bytes calldata data) external {
        require(!initialized, "Already initialized");
        address firstAdmin = abi.decode(data, (address));
        roles[firstAdmin] = Role.Admin;
        memberList.push(firstAdmin);
        emit MemberAdded(firstAdmin, Role.Admin);
        initialized = true;
    }

    // Request to join the DAO
    function requestToJoin() external {
        require(roles[msg.sender] == Role.None, "Already a member or admin");
        require(!joinRequests[msg.sender], "Already requested");
        joinRequests[msg.sender] = true;
        requestList.push(msg.sender);
        emit JoinRequested(msg.sender);
    }

    // Admin: accept a join request
    function acceptRequest(address requester, Role role) external onlyAdmin {
        require(joinRequests[requester], "No request");
        require(role == Role.Member || role == Role.Admin, "Invalid role");
        joinRequests[requester] = false;
        roles[requester] = role;
        memberList.push(requester);
        emit MemberAdded(requester, role);
        emit JoinRequestHandled(requester, true);
    }

    // Admin: reject a join request
    function rejectRequest(address requester) external onlyAdmin {
        require(joinRequests[requester], "No request");
        joinRequests[requester] = false;
        emit JoinRequestHandled(requester, false);
    }

    // Admin: remove a member (or admin)
    function removeMember(address member) external onlyAdmin {
        require(roles[member] != Role.None, "Not a member");
        roles[member] = Role.None;
        // Remove from memberList (swap and pop)
        for (uint i = 0; i < memberList.length; i++) {
            if (memberList[i] == member) {
                memberList[i] = memberList[memberList.length - 1];
                memberList.pop();
                break;
            }
        }
        emit MemberRemoved(member);
    }

    // Admin: change a member's role
    function changeRole(address member, Role newRole) external onlyAdmin {
        require(roles[member] != Role.None, "Not a member");
        require(newRole == Role.Member || newRole == Role.Admin, "Invalid role");
        roles[member] = newRole;
        emit RoleChanged(member, newRole);
    }

    // Get all current members (including admins)
    function getMembers() external view returns (address[] memory) {
        return memberList;
    }

    // Get all pending join requests
    function getJoinRequests() external view returns (address[] memory) {
        uint count = 0;
        for (uint i = 0; i < requestList.length; i++) {
            if (joinRequests[requestList[i]]) {
                count++;
            }
        }
        address[] memory requests = new address[](count);
        uint idx = 0;
        for (uint i = 0; i < requestList.length; i++) {
            if (joinRequests[requestList[i]]) {
                requests[idx++] = requestList[i];
            }
        }
        return requests;
    }

    // Get the number of current members (including admins)
    function getMemberCount() external view returns (uint256) {
        return memberList.length;
    }

    // Custom getter for role (Diamond-compatible)
    function getRole(address user) external view returns (Role) {
        return roles[user];
    }
} 