// File: app/api/contracts/calldata/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

interface FunctionInput {
  type: string;
  name?: string;
}

interface CalldataRequestBody {
  contractAddress: string;
  functionName: string;
  functionSignature?: string;
  arguments: string[];
  inputs: FunctionInput[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body
    const body = await request.json() as CalldataRequestBody;
    
    // Extract parameters
    const { contractAddress, functionName, arguments: args, inputs } = body;
    
    // Validate required parameters
    if (!contractAddress || !functionName) {
      return NextResponse.json(
        { message: 'Contract address and function name are required' },
        { status: 400 }
      );
    }

    // Create a function signature
    let functionSignature = `${functionName}(`;
    
    // Add parameter types to the signature
    if (inputs && inputs.length > 0) {
      functionSignature += inputs.map(input => input.type).join(',');
    }
    
    functionSignature += ')';
    
    // Calculate function selector (first 4 bytes of the keccak256 hash of the function signature)
    const functionSelector = ethers.utils.id(functionSignature).slice(0, 10);
    
    // Encode the function parameters
    let encodedParams = '0x';
    
    if (inputs && inputs.length > 0) {
      // Create an ABI coder for this specific function
      const abiCoder = new ethers.utils.AbiCoder();
      
      try {
        // Encode the parameters according to their types
        encodedParams = abiCoder.encode(
          inputs.map(input => input.type),
          args.map((arg, i) => {
            // Convert string booleans to actual booleans
            if (inputs[i].type === 'bool') {
              return arg === 'true';
            }
            
            // Handle arrays
            if (inputs[i].type.includes('[]')) {
              try {
                return JSON.parse(arg);
              } catch {
                throw new Error(`Failed to parse array for parameter ${inputs[i].name || i}`);
              }
            }
            
            // Handle address type validation
            if (inputs[i].type === 'address' && !ethers.utils.isAddress(arg)) {
              throw new Error(`Invalid Ethereum address for parameter ${inputs[i].name || i}`);
            }
            
            return arg;
          })
        ).slice(2); // Remove '0x' prefix
      } catch (error) {
        return NextResponse.json(
          { message: `Parameter encoding error: ${(error as Error).message}` },
          { status: 400 }
        );
      }
    }
    
    // Combine function selector and encoded parameters
    const calldata = functionSelector + encodedParams;
    
    // Generate a hash of the calldata (useful for proposal identification)
    const calldataHash = ethers.utils.keccak256(calldata);
    
    // Return the calldata and its hash
    return NextResponse.json({
      calldata: calldata,
      calldataHash: calldataHash,
      contractAddress: contractAddress,
      functionName: functionName
    });
    
  } catch (error) {
    console.error('Error generating calldata:', error);
    return NextResponse.json(
      { message: 'Failed to generate calldata: ' + (error as Error).message },
      { status: 500 }
    );
  }
}