// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import {Comptroller} from "../src/Comptroller.sol";
import {Unitroller} from "../src/Unitroller.sol";
import {SimplePriceOracle} from "../src/SimplePriceOracle.sol"; // Assuming you have this
import {Comp} from "../src/Governance/Comp.sol";

contract DeployComptroller is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying Compound contracts with address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Comp token (governance token)
        console.log("Deploying Comp token...");
        Comp comp = new Comp(deployer); // Assuming constructor takes an admin address
        console.log("Comp token deployed at:", address(comp));

        // 2. Deploy a simple price oracle
        console.log("Deploying SimplePriceOracle...");
        SimplePriceOracle priceOracle = new SimplePriceOracle();
        console.log("SimplePriceOracle deployed at:", address(priceOracle));

        // 3. Deploy the Comptroller implementation
        console.log("Deploying Comptroller implementation...");
        Comptroller comptroller = new Comptroller();
        console.log("Comptroller implementation deployed at:", address(comptroller));

        // 4. Deploy the Unitroller (proxy)
        console.log("Deploying Unitroller (proxy)...");
        Unitroller unitroller = new Unitroller();
        console.log("Unitroller deployed at:", address(unitroller));

        // 5. Set the Comptroller as the implementation for the Unitroller
        console.log("Setting comptroller as implementation...");
        unitroller._setPendingImplementation(address(comptroller));
        comptroller._become(unitroller);
        
        // Cast the unitroller to Comptroller for easier interaction
        Comptroller comptrollerProxy = Comptroller(address(unitroller));

        // 6. Initialize key parameters on the Comptroller
        console.log("Initializing Comptroller parameters...");
        
        // Set price oracle
        comptrollerProxy._setPriceOracle(priceOracle);
        
        // Set close factor (default: 50% - can be adjusted)
        comptrollerProxy._setCloseFactor(0.5e18);
        
        // Set liquidation incentive (default: 8% - can be adjusted)
        comptrollerProxy._setLiquidationIncentive(1.08e18);

        vm.stopBroadcast();

        // Output deployment summary
        console.log("\nDEPLOYMENT SUMMARY");
        console.log("-------------------");
        console.log("Comp Token:        ", address(comp));
        console.log("PriceOracle:       ", address(priceOracle));
        console.log("Comptroller Impl:  ", address(comptroller));
        console.log("Unitroller (Proxy):", address(unitroller));
        console.log("\nTo interact with the Comptroller, use the Unitroller address");
        console.log("with the Comptroller ABI.");
    }
}