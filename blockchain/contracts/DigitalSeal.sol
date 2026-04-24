
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract DigitalSeal is ERC721URIStorage, Ownable, ReentrancyGuard {


    uint256 private _nextTokenId;

    uint256 public platformFeeBps = 200;

    address public platformWallet;

    mapping(uint256 => address) public tokenBrand;

    mapping(uint256 => string) public tokenSerial;

    mapping(uint256 => bool) public tokenSold;

    mapping(uint256 => bool) public tokenClaimed;

    mapping(uint256 => uint256) public tokenPrice;

    mapping(string => uint256) public serialToToken;

    mapping(uint256 => uint256) public tokenMintedAt;

    mapping(address => bool) public authorizedBrands;


    event BatchPreMinted(
        address indexed brand,
        uint256 startTokenId,
        uint256 count,
        string[] serials
    );

    event ItemPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price,
        uint256 platformFee
    );

    event SealTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string reason
    );

    event ItemClaimed(
        uint256 indexed tokenId,
        address indexed claimer,
        string serial
    );

    event BrandAuthorized(address indexed brand, bool authorized);

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);


    modifier onlyAuthorizedBrand() {
        require(
            authorizedBrands[msg.sender] || msg.sender == owner(),
            "DigitalSeal: caller is not an authorized brand"
        );
        _;
    }


    constructor(address _platformWallet) ERC721("DigitalSeal", "DSEAL") Ownable(msg.sender) {
        require(_platformWallet != address(0), "DigitalSeal: zero address");
        platformWallet = _platformWallet;

        authorizedBrands[msg.sender] = true;
    }


    function authorizeBrand(address brand, bool authorized) external onlyOwner {
        authorizedBrands[brand] = authorized;
        emit BrandAuthorized(brand, authorized);
    }


    
    function batchPreMint(
        address brandWallet,
        string[] calldata serials,
        string[] calldata metadataURIs,
        uint256 pricePerItem
    ) external onlyAuthorizedBrand nonReentrant returns (uint256 startTokenId) {
        require(serials.length > 0, "DigitalSeal: empty batch");
        require(serials.length == metadataURIs.length, "DigitalSeal: array length mismatch");
        require(brandWallet != address(0), "DigitalSeal: zero brand wallet");

        startTokenId = _nextTokenId;

        for (uint256 i = 0; i < serials.length; i++) {
            uint256 tokenId = _nextTokenId++;

            _safeMint(brandWallet, tokenId);
            _setTokenURI(tokenId, metadataURIs[i]);

            tokenBrand[tokenId] = brandWallet;
            tokenSerial[tokenId] = serials[i];
            tokenPrice[tokenId] = pricePerItem;
            tokenMintedAt[tokenId] = block.timestamp;
            serialToToken[serials[i]] = tokenId;
        }

        emit BatchPreMinted(brandWallet, startTokenId, serials.length, serials);
    }


    
    function purchaseItem(uint256 tokenId) external payable nonReentrant {
        require(_ownerExists(tokenId), "DigitalSeal: token does not exist");
        require(!tokenSold[tokenId], "DigitalSeal: already sold");
        require(!tokenClaimed[tokenId], "DigitalSeal: already claimed");
        require(msg.value >= tokenPrice[tokenId], "DigitalSeal: insufficient payment");

        tokenSold[tokenId] = true;

        uint256 fee = (msg.value * platformFeeBps) / 10000;
        uint256 brandPayment = msg.value - fee;

        (bool feeSuccess, ) = platformWallet.call{value: fee}("");
        require(feeSuccess, "DigitalSeal: fee transfer failed");

        address brand = tokenBrand[tokenId];
        (bool brandSuccess, ) = brand.call{value: brandPayment}("");
        require(brandSuccess, "DigitalSeal: brand payment failed");

        emit ItemPurchased(tokenId, msg.sender, msg.value, fee);
    }


    
    function transferSeal(
        uint256 tokenId,
        address to,
        string calldata reason
    ) external nonReentrant {
        address tokenOwner = ownerOf(tokenId);

        require(
            msg.sender == owner() || msg.sender == tokenOwner,
            "DigitalSeal: not authorized to transfer"
        );

        address from = tokenOwner;
        _transfer(from, to, tokenId);

        emit SealTransferred(tokenId, from, to, reason);
    }


    
    function claimItem(
        uint256 tokenId,
        address claimer
    ) external onlyOwner nonReentrant {
        require(_ownerExists(tokenId), "DigitalSeal: token does not exist");
        require(!tokenClaimed[tokenId], "DigitalSeal: already claimed");

        tokenClaimed[tokenId] = true;

        address from = ownerOf(tokenId);
        _transfer(from, claimer, tokenId);

        emit ItemClaimed(tokenId, claimer, tokenSerial[tokenId]);
    }


    
    function verify(uint256 tokenId) external view returns (
        bool exists,
        string memory serial,
        address brand,
        address currentOwner,
        bool isSold,
        bool isClaimed,
        uint256 mintedAt,
        string memory metadataURI
    ) {
        exists = _ownerExists(tokenId);
        if (!exists) {
            return (false, "", address(0), address(0), false, false, 0, "");
        }

        serial = tokenSerial[tokenId];
        brand = tokenBrand[tokenId];
        currentOwner = ownerOf(tokenId);
        isSold = tokenSold[tokenId];
        isClaimed = tokenClaimed[tokenId];
        mintedAt = tokenMintedAt[tokenId];
        metadataURI = tokenURI(tokenId);
    }

    
    function verifyBySerial(string calldata serial) external view returns (
        bool exists,
        uint256 tokenId,
        address brand,
        address currentOwner,
        bool isSold,
        bool isClaimed,
        uint256 mintedAt,
        string memory metadataURI
    ) {
        tokenId = serialToToken[serial];
        exists = _ownerExists(tokenId);
        if (!exists) {
            return (false, 0, address(0), address(0), false, false, 0, "");
        }

        brand = tokenBrand[tokenId];
        currentOwner = ownerOf(tokenId);
        isSold = tokenSold[tokenId];
        isClaimed = tokenClaimed[tokenId];
        mintedAt = tokenMintedAt[tokenId];
        metadataURI = tokenURI(tokenId);
    }


    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "DigitalSeal: fee too high (max 10%)");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    function setPlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "DigitalSeal: zero address");
        platformWallet = newWallet;
    }


    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }


    function _ownerExists(uint256 tokenId) internal view returns (bool) {
        if (tokenId >= _nextTokenId) return false;
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }
}
