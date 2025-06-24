// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// ClaimVotingModule: Members can create claims, others vote approve/reject, finalized at quorum
library ClaimVotingStorage {
    bytes32 constant STORAGE_SLOT = keccak256("dao.claim.voting.module.storage");
    enum Status { Pending, Approved, Rejected }
    struct Claim {
        address claimant;
        string title;
        uint256 amount;
        string description;
        uint256 approvals;
        uint256 rejections;
        uint256 createdAt;
        Status status;
        mapping(address => bool) hasVoted;
    }
    struct Layout {
        uint256 quorum;
        uint256 claimCount;
        mapping(uint256 => Claim) claims;
    }
    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }
}

interface IMemberModule {
    function getRole(address user) external view returns (uint8);
}

contract ClaimVotingModule {
    using ClaimVotingStorage for ClaimVotingStorage.Layout;
    event ClaimCreated(uint256 indexed claimId, address indexed claimant, string title, uint256 amount, string description);
    event VoteCast(uint256 indexed claimId, address indexed voter, bool approve);
    event ClaimFinalized(uint256 indexed claimId, ClaimVotingStorage.Status status);

    // Add a public constant for the getRole selector
    bytes4 public constant GET_ROLE_SELECTOR = bytes4(keccak256("getRole(address)"));

    // Diamond-compatible init: set quorum
    function init(bytes calldata data) external {
        ClaimVotingStorage.Layout storage s = ClaimVotingStorage.layout();
        require(s.quorum == 0, "Already initialized");
        uint256 quorum = abi.decode(data, (uint256));
        require(quorum > 0, "Quorum must be > 0");
        s.quorum = quorum;
    }

    // Only members (Role.Member or Role.Admin) can call
    modifier onlyMember() {
        address memberModule = _findMemberModule();
        require(memberModule != address(0), "No MemberModule");
        uint8 role = IMemberModule(address(this)).getRole(msg.sender);
        // 0=None, 1=Member, 2=Admin
        require(role == 1 || role == 2, "Only member");
        _;
    }

    // Create a new claim
    function createClaim(string calldata title, uint256 amount, string calldata description) external onlyMember {
        ClaimVotingStorage.Layout storage s = ClaimVotingStorage.layout();
        uint256 claimId = s.claimCount++;
        ClaimVotingStorage.Claim storage c = s.claims[claimId];
        c.claimant = msg.sender;
        c.title = title;
        c.amount = amount;
        c.description = description;
        c.createdAt = block.timestamp;
        c.status = ClaimVotingStorage.Status.Pending;
        emit ClaimCreated(claimId, msg.sender, title, amount, description);
    }

    // Vote on a claim (approve/reject)
    function voteOnClaim(uint256 claimId, bool approve) external onlyMember {
        ClaimVotingStorage.Layout storage s = ClaimVotingStorage.layout();
        ClaimVotingStorage.Claim storage c = s.claims[claimId];
        require(c.status == ClaimVotingStorage.Status.Pending, "Not pending");
        require(msg.sender != c.claimant, "Claimant cannot vote");
        require(!c.hasVoted[msg.sender], "Already voted");
        c.hasVoted[msg.sender] = true;
        if (approve) {
            c.approvals++;
        } else {
            c.rejections++;
        }
        emit VoteCast(claimId, msg.sender, approve);
        // Finalize if quorum reached
        if (c.approvals >= s.quorum) {
            c.status = ClaimVotingStorage.Status.Approved;
            emit ClaimFinalized(claimId, ClaimVotingStorage.Status.Approved);
        } else if (c.rejections >= s.quorum) {
            c.status = ClaimVotingStorage.Status.Rejected;
            emit ClaimFinalized(claimId, ClaimVotingStorage.Status.Rejected);
        }
    }

    // View struct for external calls
    struct ClaimView {
        address claimant;
        string title;
        uint256 amount;
        string description;
        uint256 approvals;
        uint256 rejections;
        uint256 createdAt;
        uint8 status;
    }

    function getClaim(uint256 claimId) external view returns (ClaimView memory) {
        ClaimVotingStorage.Layout storage s = ClaimVotingStorage.layout();
        ClaimVotingStorage.Claim storage c = s.claims[claimId];
        return ClaimView({
            claimant: c.claimant,
            title: c.title,
            amount: c.amount,
            description: c.description,
            approvals: c.approvals,
            rejections: c.rejections,
            createdAt: c.createdAt,
            status: uint8(c.status)
        });
    }

    function getClaims() external view returns (ClaimView[] memory) {
        ClaimVotingStorage.Layout storage s = ClaimVotingStorage.layout();
        ClaimView[] memory arr = new ClaimView[](s.claimCount);
        for (uint256 i = 0; i < s.claimCount; i++) {
            arr[i] = this.getClaim(i);
        }
        return arr;
    }

    // Diamond selectors
    function getSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = this.init.selector;
        selectors[1] = this.createClaim.selector;
        selectors[2] = this.voteOnClaim.selector;
        selectors[3] = this.getClaim.selector;
        selectors[4] = this.getClaims.selector;
    }

    // Helper: find the MemberModule address from the kernel's modules
    function _findMemberModule() internal view returns (address) {
        address kernel = address(this);
        (bool ok, bytes memory data) = kernel.staticcall(abi.encodeWithSignature("modules()"));
        if (!ok) return address(0);
        address[] memory mods = abi.decode(data, (address[]));
        for (uint256 i = 0; i < mods.length; i++) {
            (ok, data) = mods[i].staticcall(abi.encodeWithSignature("getSelectors()"));
            if (!ok) continue;
            bytes4[] memory selectors = abi.decode(data, (bytes4[]));
            for (uint256 j = 0; j < selectors.length; j++) {
                if (selectors[j] == GET_ROLE_SELECTOR) {
                    return mods[i];
                }
            }
        }
        return address(0);
    }
} 