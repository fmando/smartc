// SPDX-License-Identifier: MIT
pragma solidity >=1.1.0;

pragma experimental ABIEncoderV2;

import {VmSafe} from "./Vm.sol";
import {Checksum} from "./checksum.sol";

// Helpers for parsing and writing JSON files
// To parse:
// ```
// using stdJson for string;
// string memory json = vm.readFile("some_peth");
// json.parseUint("<json_path>");
// ```
// To write:
// ```
// using stdJson for string;
// string memory json = "deploymentArtifact";
// Contract contract = new Contract();
// json.serialize("contractAddress", address(contract));
// json = json.serialize("deploymentTimes", uint(1));
// // store the stringified JSON to the 'json' variable we have been using as a key
// // as we won't need it any longer
// string memory json2 = "finalArtifact";
// string memory final = json2.serialize("depArtifact", json);
// final.write("<some_path>");
// ```

library stdJson {
    function parseRaw(string memory json, string memory key) internal view returns (bytes memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJson(json, key);
    }

    function readUint(string memory json, string memory key) internal view returns (uint256) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonUint(json, key);
    }

    function readUintArray(string memory json, string memory key) internal view returns (uint256[] memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonUintArray(json, key);
    }

    function readInt(string memory json, string memory key) internal view returns (int256) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonInt(json, key);
    }

    function readIntArray(string memory json, string memory key) internal view returns (int256[] memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonIntArray(json, key);
    }

    function readBytes32(string memory json, string memory key) internal view returns (bytes32) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonBytes32(json, key);
    }

    function readBytes32Array(string memory json, string memory key) internal view returns (bytes32[] memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonBytes32Array(json, key);
    }

    function readString(string memory json, string memory key) internal view returns (string memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonString(json, key);
    }

    function readStringArray(string memory json, string memory key) internal view returns (string[] memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonStringArray(json, key);
    }

    function readAddress(string memory json, string memory key) internal view returns (address) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonAddress(json, key);
    }

    function readAddressArray(string memory json, string memory key) internal view returns (address[] memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonAddressArray(json, key);
    }

    function readBool(string memory json, string memory key) internal view returns (bool) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonBool(json, key);
    }

    function readBoolArray(string memory json, string memory key) internal view returns (bool[] memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonBoolArray(json, key);
    }

    function readBytes(string memory json, string memory key) internal view returns (bytes memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonBytes(json, key);
    }

    function readBytesArray(string memory json, string memory key) internal view returns (bytes[] memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.parseJsonBytesArray(json, key);
    }

    function serialize(string memory jsonKey, string memory rootObject) internal returns (string memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeJson(jsonKey, rootObject);
    }

    function serialize(string memory jsonKey, string memory key, bool value) internal returns (string memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeBool(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, bool[] memory value)
        internal
        returns (string memory)
    {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeBool(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, uint256 value) internal returns (string memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeUint(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, uint256[] memory value)
        internal
        returns (string memory)
    {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeUint(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, int256 value) internal returns (string memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeInt(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, int256[] memory value)
        internal
        returns (string memory)
    {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeInt(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, address value) internal returns (string memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeAddress(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, address[] memory value)
        internal
        returns (string memory)
    {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeAddress(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, bytes32 value) internal returns (string memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeBytes32(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, bytes32[] memory value)
        internal
        returns (string memory)
    {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeBytes32(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, bytes memory value) internal returns (string memory) {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeBytes(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, bytes[] memory value)
        internal
        returns (string memory)
    {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeBytes(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, string memory value)
        internal
        returns (string memory)
    {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeString(jsonKey, key, value);
    }

    function serialize(string memory jsonKey, string memory key, string[] memory value)
        internal
        returns (string memory)
    {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        return vm.serializeString(jsonKey, key, value);
    }

    function write(string memory jsonKey, string memory path) internal {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        vm.writeJson(jsonKey, path);
    }

    function write(string memory jsonKey, string memory path, string memory valueKey) internal {
        VmSafe vm = VmSafe(Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8"))));
        
        vm.writeJson(jsonKey, path, valueKey);
    }
}
