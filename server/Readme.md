```bash
curl -X POST http://localhost:3001/api/contracts/generate?saveToFile=true   -H "Content-Type: application/json"   -d '{
    "name": "MetaDAO",
    "symbol": "META",
    "purpose": "Decentralized funding of projects",
    "description": "A DAO for governing fund distribution",
    "governance": "timelock",
    "voting": "standard 3-day voting",
    "hasExistingToken": "no",
    "treasuryAddress": "0x1234567890123456789012345678901234567890",
    "adminAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
  }'
```