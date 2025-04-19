// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.22;

library Oracle {
    struct Observation {
        uint32 blockTimestamp;
        int56 tickCumulative;
        uint160 secondsPerLiquidityCumulativeX128;
        bool initialized;
    }
} 