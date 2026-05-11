// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.27;

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract Booster is ERC20, ERC20Burnable, AccessManaged, ERC20Permit {

    uint256 public constant MAX_SUPPLY = 1000000000e18;

    uint256 public totalMinted;

    event TokensMinted(address indexed to, uint256 amount);

    constructor(address recipient, address initialAuthority)
        ERC20("Booster", "BST")
        AccessManaged(initialAuthority)
        ERC20Permit("Booster")
    {
        uint256 initialSupply = 10000e18;
        totalMinted = initialSupply;
        _mint(recipient, initialSupply);
    }

    function mint(address to, uint256 amount) public restricted {
        require(totalMinted + amount <= MAX_SUPPLY, "Exceeds max supply");
        totalMinted += amount;
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}