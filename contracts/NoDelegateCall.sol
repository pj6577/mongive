// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.22;

abstract contract NoDelegateCall {
    address private immutable original;

    constructor() {
        original = address(this);
    }

    modifier noDelegateCall() {
        require(address(this) == original);
        _;
    }
} 