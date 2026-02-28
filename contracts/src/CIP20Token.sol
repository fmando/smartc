// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "./interfaces/ICIP20.sol";

/// @title CIP20Token – CIP-20 Token Standard Implementierung
/// @notice Standard-Token auf der Core Coin (XCB) Blockchain
/// @dev Implementiert den CIP-20 Standard (https://cip.coreblockchain.net/cip/cbc/cip-20/)
/// @custom:network Core Coin XCB Blockchain (Devín Testnet Network ID: 3)
contract CIP20Token is ICIP20 {
    // ========== State Variables ==========

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public override totalSupply;

    address public owner;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // ========== Events (geerbt von ICIP20) ==========

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ========== Modifiers ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "CIP20Token: caller is not the owner");
        _;
    }

    // ========== Constructor ==========

    /// @notice Erstellt einen neuen CIP-20 Token
    /// @param _name Token-Name (z.B. "My Token")
    /// @param _symbol Token-Symbol (z.B. "MTK")
    /// @param _decimals Anzahl Dezimalstellen (Standard: 18)
    /// @param _totalSupply Gesamtmenge (in kleinster Einheit, also * 10**decimals)
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply
    ) {
        require(bytes(_name).length > 0, "CIP20Token: name cannot be empty");
        require(bytes(_symbol).length > 0, "CIP20Token: symbol cannot be empty");
        require(_totalSupply > 0, "CIP20Token: totalSupply must be > 0");

        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply;
        owner = msg.sender;

        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    // ========== CIP-20 Standard Functions ==========

    function balanceOf(address _owner) public view override returns (uint256) {
        require(_owner != address(0), "CIP20Token: balance query for zero address");
        return _balances[_owner];
    }

    function transfer(address _to, uint256 _value) public override returns (bool) {
        _transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public override returns (bool) {
        require(
            _allowances[_from][msg.sender] >= _value,
            "CIP20Token: transfer amount exceeds allowance"
        );
        _allowances[_from][msg.sender] -= _value;
        emit Approval(_from, msg.sender, _allowances[_from][msg.sender]);
        _transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public override returns (bool) {
        require(_spender != address(0), "CIP20Token: approve to zero address");
        _allowances[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view override returns (uint256) {
        return _allowances[_owner][_spender];
    }

    // ========== Owner Functions ==========

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "CIP20Token: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function mint(address _to, uint256 _value) public onlyOwner {
        require(_to != address(0), "CIP20Token: mint to zero address");
        totalSupply += _value;
        _balances[_to] += _value;
        emit Transfer(address(0), _to, _value);
    }

    function burn(uint256 _value) public {
        require(_balances[msg.sender] >= _value, "CIP20Token: burn amount exceeds balance");
        _balances[msg.sender] -= _value;
        totalSupply -= _value;
        emit Transfer(msg.sender, address(0), _value);
    }

    // ========== Internal Functions ==========

    function _transfer(address _from, address _to, uint256 _value) internal {
        require(_from != address(0), "CIP20Token: transfer from zero address");
        require(_to != address(0), "CIP20Token: transfer to zero address");
        require(_balances[_from] >= _value, "CIP20Token: transfer amount exceeds balance");

        _balances[_from] -= _value;
        _balances[_to] += _value;
        emit Transfer(_from, _to, _value);
    }
}
