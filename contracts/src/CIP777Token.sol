// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "./interfaces/ICIP777.sol";
import "./interfaces/ICIP777Recipient.sol";
import "./interfaces/ICIP777Sender.sol";

/// @title CIP777Token – CIP-777 Advanced Fungible Token
/// @notice Erweiterter Token-Standard mit Operatoren und Hooks
/// @dev Implementiert CIP-777 (https://cip.coreblockchain.net/cip/cbc/cip-777/)
///      Hooks werden aufgerufen wenn Empfänger/Sender ICIP777Recipient/Sender implementieren.
///      Kein CIP-1820 Registry erforderlich – direkte Interface-Erkennung via extcodesize.
contract CIP777Token is ICIP777 {

    // ========== State Variables ==========

    string private _name;
    string private _symbol;
    uint256 private _granularity;
    uint256 private _totalSupply;
    address public owner;

    mapping(address => uint256) private _balances;

    // operator => tokenHolder => authorized
    mapping(address => mapping(address => bool)) private _operators;

    // tokenHolder => operator => revoked (für defaultOperators)
    mapping(address => mapping(address => bool)) private _revokedDefaultOperators;

    address[] private _defaultOperators;
    mapping(address => bool) private _isDefaultOperator;

    // ========== Modifiers ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "CIP777: caller is not the owner");
        _;
    }

    modifier validGranularity(uint256 amount) {
        require(amount % _granularity == 0, "CIP777: amount not a multiple of granularity");
        _;
    }

    // ========== Constructor ==========

    /// @notice Erstellt einen neuen CIP-777 Token
    /// @param name_ Token-Name
    /// @param symbol_ Token-Symbol
    /// @param initialSupply Anfangs-Supply (in kleinster Einheit)
    /// @param granularity_ Mindest-Transfereinheit (üblicherweise 1)
    /// @param defaultOperators_ Voreingestellte Operatoren (kann leer sein)
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        uint256 granularity_,
        address[] memory defaultOperators_
    ) {
        require(bytes(name_).length > 0,   "CIP777: name cannot be empty");
        require(bytes(symbol_).length > 0, "CIP777: symbol cannot be empty");
        require(granularity_ >= 1,         "CIP777: granularity must be >= 1");
        require(initialSupply > 0,         "CIP777: initialSupply must be > 0");
        require(initialSupply % granularity_ == 0, "CIP777: supply not a multiple of granularity");

        _name        = name_;
        _symbol      = symbol_;
        _granularity = granularity_;
        owner        = msg.sender;

        for (uint256 i = 0; i < defaultOperators_.length; i++) {
            require(defaultOperators_[i] != address(0), "CIP777: default operator is zero address");
            _defaultOperators.push(defaultOperators_[i]);
            _isDefaultOperator[defaultOperators_[i]] = true;
        }

        _mint(msg.sender, initialSupply, "", "");
    }

    // ========== View Functions ==========

    function name()         public view override returns (string memory)   { return _name; }
    function symbol()       public view override returns (string memory)   { return _symbol; }
    function granularity()  public view override returns (uint256)         { return _granularity; }
    function totalSupply()  public view override returns (uint256)         { return _totalSupply; }
    function balanceOf(address account) public view override returns (uint256) { return _balances[account]; }

    function defaultOperators() public view override returns (address[] memory) {
        return _defaultOperators;
    }

    function isOperatorFor(address operator, address tokenHolder) public view override returns (bool) {
        if (operator == tokenHolder) return true;
        if (_isDefaultOperator[operator] && !_revokedDefaultOperators[tokenHolder][operator]) return true;
        return _operators[operator][tokenHolder];
    }

    // ========== Operator Management ==========

    function authorizeOperator(address operator) public override {
        require(operator != msg.sender, "CIP777: authorizing self as operator");
        if (_isDefaultOperator[operator]) {
            delete _revokedDefaultOperators[msg.sender][operator];
        } else {
            _operators[operator][msg.sender] = true;
        }
        emit AuthorizedOperator(operator, msg.sender);
    }

    function revokeOperator(address operator) public override {
        require(operator != msg.sender, "CIP777: revoking self as operator");
        if (_isDefaultOperator[operator]) {
            _revokedDefaultOperators[msg.sender][operator] = true;
        } else {
            delete _operators[operator][msg.sender];
        }
        emit RevokedOperator(operator, msg.sender);
    }

    // ========== Token Operations ==========

    function send(address to, uint256 amount, bytes calldata data) public override {
        _send(msg.sender, msg.sender, to, amount, data, "");
    }

    function burn(uint256 amount, bytes calldata data) public override {
        _burn(msg.sender, msg.sender, amount, data, "");
    }

    function operatorSend(
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) public override {
        require(isOperatorFor(msg.sender, from), "CIP777: caller is not an operator for holder");
        _send(msg.sender, from, to, amount, data, operatorData);
    }

    function operatorBurn(
        address from,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) public override {
        require(isOperatorFor(msg.sender, from), "CIP777: caller is not an operator for holder");
        _burn(msg.sender, from, amount, data, operatorData);
    }

    // ========== Owner: Mint ==========

    function mint(address to, uint256 amount, bytes calldata data) public onlyOwner {
        _mint(to, amount, data, "");
    }

    // ========== Internal ==========

    function _send(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) internal validGranularity(amount) {
        require(from != address(0), "CIP777: send from zero address");
        require(to   != address(0), "CIP777: send to zero address");
        require(_balances[from] >= amount, "CIP777: insufficient balance");

        _callTokensToSend(operator, from, to, amount, data, operatorData);

        _balances[from] -= amount;
        _balances[to]   += amount;

        emit Sent(operator, from, to, amount, data, operatorData);

        _callTokensReceived(operator, from, to, amount, data, operatorData);
    }

    function _burn(
        address operator,
        address from,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) internal validGranularity(amount) {
        require(from != address(0),        "CIP777: burn from zero address");
        require(_balances[from] >= amount, "CIP777: insufficient balance to burn");

        _callTokensToSend(operator, from, address(0), amount, data, operatorData);

        _balances[from] -= amount;
        _totalSupply    -= amount;

        emit Burned(operator, from, amount, data, operatorData);
    }

    function _mint(
        address to,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) internal validGranularity(amount) {
        require(to != address(0), "CIP777: mint to zero address");

        _totalSupply    += amount;
        _balances[to]   += amount;

        emit Minted(owner, to, amount, data, operatorData);

        _callTokensReceived(owner, address(0), to, amount, data, operatorData);
    }

    /// @dev Ruft tokensToSend Hook auf, wenn `from` ICIP777Sender implementiert
    function _callTokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) internal {
        if (_implementsInterface(from)) {
            ICIP777Sender(from).tokensToSend(operator, from, to, amount, data, operatorData);
        }
    }

    /// @dev Ruft tokensReceived Hook auf, wenn `to` ICIP777Recipient implementiert
    function _callTokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) internal {
        if (to != address(0) && _implementsInterface(to)) {
            ICIP777Recipient(to).tokensReceived(operator, from, to, amount, data, operatorData);
        }
    }

    /// @dev Prüft ob eine Adresse ein Contract ist (hat Code)
    function _implementsInterface(address account) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(account) }
        return size > 0;
    }
}
