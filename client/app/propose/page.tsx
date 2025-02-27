"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const networks = [
  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia Testnet" },
];

const steps = [
  {
    id: "contract-details",
    title: "Contract Details",
    fields: [
      { 
        id: "network", 
        label: "Network", 
        type: "select",
        options: networks
      },
      { 
        id: "contractAddress", 
        label: "Contract Address", 
        type: "input" 
      },
      { 
        id: "proposalTitle", 
        label: "Proposal Title", 
        type: "input" 
      },
      { 
        id: "proposalDescription", 
        label: "Proposal Description", 
        type: "textarea" 
      },
    ],
  },
  {
    id: "function-selection",
    title: "Function Selection",
    fields: [
      { 
        id: "selectedFunction", 
        label: "Select Function", 
        type: "functionSelector" 
      },
      { 
        id: "argumentsInput", 
        label: "Function Arguments", 
        type: "dynamicArguments" 
      },
    ],
  },
  {
    id: "review",
    title: "Review Proposal",
    fields: [
      { 
        id: "proposalSummary", 
        label: "Proposal Summary", 
        type: "summary" 
      },
    ],
  },
  {
    id: "calldata",
    title: "Generated Calldata",
    fields: [],
  },
];

interface FunctionInput {
  name?: string;
  type: string;
}

interface FunctionItem {
  name: string;
  type: string;
  inputs: FunctionInput[];
  stateMutability: string;
  signature?: string;
}

interface FormData {
  network: string;
  contractAddress: string;
  proposalTitle: string;
  proposalDescription: string;
  selectedFunction: string;
  arguments: string[];
}

export default function ProposePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    network: "",
    contractAddress: "",
    proposalTitle: "",
    proposalDescription: "",
    selectedFunction: "",
    arguments: []
  });
  
  const [contractFunctions, setContractFunctions] = useState<FunctionItem[]>([]);
  const [selectedFunctionDetails, setSelectedFunctionDetails] = useState<FunctionItem | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [callData, setCallData] = useState("");
  const [calldataHash, setCalldataHash] = useState("");

  // Handle input change for text fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle network selection
  const handleNetworkChange = (value: string) => {
    setFormData({ ...formData, network: value });
  };

  // Handle function selection
  const handleFunctionSelect = (functionName: string) => {
    setFormData({ ...formData, selectedFunction: functionName });
    
    // Find the function details from our list
    const funcDetails = contractFunctions.find(f => f.name === functionName);
    setSelectedFunctionDetails(funcDetails || null);
    
    // Reset the arguments when switching functions
    setFormData(prev => ({
      ...prev,
      arguments: funcDetails ? new Array(funcDetails.inputs.length).fill("") : []
    }));
  };

  // Handle argument input change
  const handleArgumentChange = (index: number, value: string) => {
    const newArgs = [...formData.arguments];
    newArgs[index] = value;
    setFormData({ ...formData, arguments: newArgs });
  };

  // Fetch contract ABI and extract callable functions
  const fetchContractABI = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/contracts/abi?network=${formData.network}&address=${formData.contractAddress}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch contract ABI");
      }
      
      const data = await response.json();
      
      // Filter for functions that can be called by governance
      const governableFunctions = data.abi.filter(item => 
        item.type === "function" && 
        item.stateMutability !== "view" && 
        item.stateMutability !== "pure"
      );
      
      setContractFunctions(governableFunctions);
      
      if (governableFunctions.length === 0) {
        setErrorMessage("No callable functions found in this contract");
      } else {
        // Move to next step
        handleNext();
      }
    } catch (error) {
      console.error("Error fetching contract ABI:", error);
      setErrorMessage(error.message || "Failed to fetch contract ABI");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate call data based on selected function and arguments
  const generateCallData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const payload = {
        contractAddress: formData.contractAddress,
        functionName: formData.selectedFunction,
        functionSignature: selectedFunctionDetails?.signature,
        arguments: formData.arguments,
        inputs: selectedFunctionDetails?.inputs
      };
      
      const response = await fetch("/api/contracts/calldata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate calldata");
      }
      
      const result = await response.json();
      setCallData(result.calldata);
      setCalldataHash(result.calldataHash);
      
      // Move to final step
      handleNext();
    } catch (error) {
      console.error("Error generating calldata:", error);
      setErrorMessage(error.message || "Failed to generate calldata");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitStep = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    switch (currentStep) {
      case 0:
        // Validate and fetch ABI
        if (!formData.network || !formData.contractAddress) {
          setErrorMessage("Please fill in all required fields");
          return;
        }
        fetchContractABI();
        break;
        
      case 1:
        // Validate function selection and arguments
        if (!formData.selectedFunction) {
          setErrorMessage("Please select a function");
          return;
        }
        
        // Check if all required arguments are filled
        const missingArgs = formData.arguments.some((arg, index) => 
          !arg && selectedFunctionDetails.inputs[index].type !== "bool"
        );
        
        if (missingArgs) {
          setErrorMessage("Please fill in all function arguments");
          return;
        }
        
        // Move to review step
        handleNext();
        break;
        
      case 2:
        // Generate calldata
        generateCallData();
        break;
        
      default:
        break;
    }
  };

  // Render field based on type
  const renderField = (field: any) => {
    switch (field.type) {
      case "input":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              id={field.id}
              name={field.id}
              value={formData[field.id]}
              onChange={handleInputChange}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Textarea
              id={field.id}
              name={field.id}
              value={formData[field.id]}
              onChange={handleInputChange}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              rows={4}
            />
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Select 
              value={formData[field.id]} 
              onValueChange={(value) => handleNetworkChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "functionSelector":
        return (
          <div key={field.id} className="space-y-2">
            <Label>{field.label}</Label>
            {contractFunctions.length > 0 ? (
              <Select 
                value={formData.selectedFunction} 
                onValueChange={handleFunctionSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a function" />
                </SelectTrigger>
                <SelectContent>
                  {contractFunctions.map((func) => (
                    <SelectItem key={func.name} value={func.name}>
                      {func.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No functions available. Please fetch a valid contract first.
              </div>
            )}
            
            {selectedFunctionDetails && (
              <div className="mt-4 text-sm border p-3 rounded-md bg-gray-50">
                <p className="font-medium">Function signature:</p>
                <code className="bg-gray-100 p-1 rounded text-sm">
                  {selectedFunctionDetails.name}({selectedFunctionDetails.inputs.map(input => `${input.type} ${input.name || ''}`).join(', ')})
                </code>
              </div>
            )}
          </div>
        );

      case "dynamicArguments":
        return (
          <div key={field.id} className="space-y-4 mt-6">
            <Label>{field.label}</Label>
            {selectedFunctionDetails && selectedFunctionDetails.inputs.length > 0 ? (
              selectedFunctionDetails.inputs.map((input, index) => (
                <div key={index} className="space-y-1">
                  <Label className="text-sm">
                    {input.name || `param${index}`} ({input.type})
                  </Label>
                  {input.type === "bool" ? (
                    <Select
                      value={formData.arguments[index] || "false"}
                      onValueChange={(value) => handleArgumentChange(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">true</SelectItem>
                        <SelectItem value="false">false</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.arguments[index] || ""}
                      onChange={(e) => handleArgumentChange(index, e.target.value)}
                      placeholder={`Enter ${input.type} value`}
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">
                No arguments required for this function.
              </div>
            )}
          </div>
        );

      case "summary":
        return (
          <div key={field.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{formData.proposalTitle || "Untitled Proposal"}</CardTitle>
                <CardDescription>
                  Network: {networks.find(n => n.id === formData.network)?.name || formData.network}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Contract Address</h4>
                  <p className="text-sm break-all">{formData.contractAddress}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Description</h4>
                  <p className="text-sm whitespace-pre-line">{formData.proposalDescription}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Function Call</h4>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {formData.selectedFunction}(
                    {selectedFunctionDetails?.inputs.map((input, i) => 
                      `${input.name || `param${i}`}: ${formData.arguments[i]}`
                    ).join(', ')}
                    )
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const renderCallDataPreview = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Proposal Call Data</CardTitle>
            <CardDescription>
              Use this data to submit your proposal to the governance contract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Call Data</h4>
              <div className="bg-gray-50 p-3 rounded-md overflow-x-auto">
                <code className="text-xs break-all">{callData}</code>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Call Data Hash</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <code className="text-xs break-all">{calldataHash}</code>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(callData);
              }}
            >
              Copy Call Data
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Proposal</h1>

      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 text-center ${
                index <= currentStep ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {step.title}
            </div>
          ))}
        </div>
        <div className="relative mt-2">
          <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-gray-200" />
          <div
            className="absolute left-0 top-1/2 -mt-px h-0.5 bg-blue-600 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {errorMessage && (
        <Alert className="mb-6 bg-red-50">
          <AlertDescription className="text-red-600">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <form className="space-y-6" onSubmit={handleSubmitStep}>
        <div className="space-y-4">
          {currentStep === 3
            ? renderCallDataPreview()
            : steps[currentStep].fields.map((field) => renderField(field))}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isLoading}
            variant="outline"
          >
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Processing..." : "Next"}
            </Button>
          ) : (
            <Button 
              type="button"
              onClick={() => {
                // Reset state to start over
                setCurrentStep(0);
                setFormData({
                  network: "",
                  contractAddress: "",
                  proposalTitle: "",
                  proposalDescription: "",
                  selectedFunction: "",
                  arguments: []
                });
                setContractFunctions([]);
                setSelectedFunctionDetails(null);
                setCallData("");
                setCalldataHash("");
              }}
            >
              Create New Proposal
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}