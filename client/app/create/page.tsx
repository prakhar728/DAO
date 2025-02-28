"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    id: "basics",
    title: "Basic Information",
    fields: [
      { id: "name", label: "DAO Name", type: "input" },
      { id: "symbol", label: "Token Symbol", type: "input" },
      { id: "purpose", label: "DAO Purpose", type: "textarea" },
      { id: "description", label: "DAO Description", type: "textarea" },
      { id: "license", label: "License", type: "input", placeholder: "MIT" },
      {
        id: "securityContact",
        label: "Security Contact (Optional)",
        type: "input",
        placeholder: "security@example.com",
      },
    ],
  },
  {
    id: "token-settings",
    title: "Token Settings",
    fields: [
      {
        id: "hasExistingToken",
        label: "Do you have an existing governance token?",
        type: "radio",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "tokenAddress",
        label: "Token Contract Address",
        type: "input",
        placeholder: "0x...",
        condition: (data: { hasExistingToken: string }) =>
          data.hasExistingToken === "yes",
      },
      {
        id: "votesType",
        label: "Token Type",
        type: "radio",
        options: [
          { value: "ERC20Votes", label: "ERC20 (Fungible Token)" },
          { value: "ERC721Votes", label: "ERC721 (NFT)" },
        ],
        condition: (data: { hasExistingToken: string }) =>
          data.hasExistingToken === "no",
      },
      {
        id: "tokenDecimals",
        label: "Token Decimals",
        type: "select",
        options: [
          { value: "18", label: "18 (Standard)" },
          { value: "6", label: "6 (USDC-like)" },
          { value: "8", label: "8 (BTC-like)" },
          { value: "0", label: "0 (No decimals)" },
        ],
        condition: (data: { hasExistingToken: string; votesType: string }) =>
          data.hasExistingToken === "no" && data.votesType === "ERC20Votes",
      },
      {
        id: "tokenClockMode",
        label: "Token Clock Mode",
        type: "radio",
        options: [
          { value: "BlockNumber", label: "Block Number (Traditional)" },
          { value: "Timestamp", label: "Timestamp (More predictable)" },
        ],
      },
      {
        id: "blockTimeSeconds",
        label: "Average Block Time (seconds)",
        type: "input",
        placeholder: "12",
        condition: (data: { tokenClockMode: string }) =>
          data.tokenClockMode === "BlockNumber",
      },
      {
        id: "treasuryAddress",
        label: "Treasury Address (Optional)",
        type: "input",
        placeholder: "0x...",
      },
      {
        id: "adminAddress",
        label: "Admin Address (Optional)",
        type: "input",
        placeholder: "0x...",
      },
    ],
  },
  {
    id: "governance-settings",
    title: "Governance Settings",
    fields: [
      {
        id: "votingDelay",
        label: "Voting Delay (blocks or seconds)",
        type: "input",
        placeholder: "7200 (1 day at 12s blocks)",
        helper: "How long after a proposal is created before voting can start",
      },
      {
        id: "votingPeriod",
        label: "Voting Period (blocks or seconds)",
        type: "input",
        placeholder: "50400 (1 week at 12s blocks)",
        helper: "How long the voting lasts",
      },
      {
        id: "proposalThreshold",
        label: "Proposal Threshold",
        type: "input",
        placeholder: "0",
        helper:
          "Minimum number of votes an account must have to create a proposal",
      },
      {
        id: "quorumNumerator",
        label: "Quorum Percentage (%)",
        type: "slider",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 4,
        helper:
          "Minimum percentage of total token supply needed for a vote to pass",
      },
      {
        id: "updatableSettings",
        label: "Updatable Governance Settings",
        type: "switch",
        helper: "Allow governance settings to be updated by proposals",
      },
      {
        id: "timelockType",
        label: "Timelock Type",
        type: "radio",
        options: [
          { value: "None", label: "None (Execute immediately)" },
          {
            value: "TimelockController",
            label: "OpenZeppelin TimelockController",
          },
          { value: "Compound", label: "Compound-style Timelock" },
        ],
      },
      {
        id: "minTimelockDelay",
        label: "Minimum Timelock Delay (seconds)",
        type: "input",
        placeholder: "172800 (2 days)",
        helper: "Minimum time delay between queue and execution (in seconds)",
        condition: (data: { timelockType: string }) =>
          data.timelockType !== "None",
      },
      {
        id: "upgradeability",
        label: "Upgradeability Pattern",
        type: "radio",
        options: [
          { value: "None", label: "None (Not upgradeable)" },
          { value: "Transparent", label: "Transparent Proxy" },
          {
            value: "UUPS",
            label: "UUPS (Universal Upgradeable Proxy Standard)",
          },
        ],
      },
    ],
  },
  {
    id: "preview",
    title: "Preview Contract",
    fields: [],
  },
];

export default function CreateDAO() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractResult, setContractResult] = useState<{
    address?: string;
    txHash?: string;
    abi?: any;
    error?: string;
    contracts?: {
      [key: string]: {
        name: string;
        code: string;
      };
    };
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "ProjectName",
    symbol: "PRJ",
    purpose: "A decentralized platform for X",
    description:
      "ProjectName is a blockchain-based solution designed to revolutionize Y by leveraging Z.",
    license: "MIT",
    securityContact: "",

    // Token settings
    hasExistingToken: "no",
    tokenAddress: "",
    votesType: "ERC20Votes",
    tokenDecimals: "18",
    tokenClockMode: "BlockNumber",
    blockTimeSeconds: "12",
    treasuryAddress: "",
    adminAddress: "",

    // Governance settings
    votingDelay: "7200",
    votingPeriod: "50400",
    proposalThreshold: "0",
    quorumNumerator: "4",
    updatableSettings: false,
    timelockType: "None",
    minTimelockDelay: "172800",
    upgradeability: "None",
  });
  const [selectedContract, setSelectedContract] = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);

  useEffect(() => {
    // If we're on the preview step but don't have contract data yet, generate it
    if (currentStep === 3 && !contractResult?.contracts && !generatingPreview) {
      generatePreview();
    }
  }, [currentStep, contractResult, generatingPreview]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRadioChange = (value: string, name: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSwitchChange = (checked: boolean, name: string) => {
    setFormData({ ...formData, [name]: checked });
  };

  const handleSliderChange = (value: number[], name: string) => {
    setFormData({ ...formData, [name]: value[0].toString() });
  };

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generatePreview = async () => {
    setGeneratingPreview(true);
    try {
      const response = await fetch(
        "http://localhost:3001/api/contracts/generate?saveToFile=false",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            // Convert numeric string inputs to numbers
            votingDelay: parseInt(formData.votingDelay),
            votingPeriod: parseInt(formData.votingPeriod),
            proposalThreshold: parseInt(formData.proposalThreshold),
            quorumNumerator: parseInt(formData.quorumNumerator),
            tokenDecimals: parseInt(formData.tokenDecimals),
            minTimelockDelay: parseInt(formData.minTimelockDelay),
            blockTimeSeconds: parseInt(formData.blockTimeSeconds),
            // Ensure boolean values
            updatableSettings: Boolean(formData.updatableSettings),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to generate contract preview"
        );
      }

      // Parse and store the response data
      const result = await response.json();

      console.log("Preview generated:", result);

      setContractResult({
        contracts: result.contracts,
      });

      if (result.contracts && Object.keys(result.contracts).length > 0) {
        setSelectedContract(Object.keys(result.contracts)[0]);
      }
    } catch (error) {
      console.error("Error generating contract preview:", error);
      setContractResult({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep < steps.length - 1) {
      handleNext();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "http://localhost:3001/api/contracts/generate?saveToFile=true",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            // Convert numeric string inputs to numbers
            votingDelay: parseInt(formData.votingDelay),
            votingPeriod: parseInt(formData.votingPeriod),
            proposalThreshold: parseInt(formData.proposalThreshold),
            quorumNumerator: parseInt(formData.quorumNumerator),
            tokenDecimals: parseInt(formData.tokenDecimals),
            minTimelockDelay: parseInt(formData.minTimelockDelay),
            blockTimeSeconds: parseInt(formData.blockTimeSeconds),
            // Ensure boolean values
            updatableSettings: Boolean(formData.updatableSettings),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create DAO contract");
      }

      // Parse and store the response data
      const result = await response.json();

      console.log("DAO contract deployed successfully:", result);

      setContractResult({
        contracts: result.contracts,
        address: result.address,
        txHash: result.txHash,
      });
    } catch (error) {
      console.error("Error creating DAO contract:", error);
      setContractResult({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    if (field.condition && !field.condition(formData)) {
      return null;
    }

    switch (field.type) {
      case "input":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              id={field.id}
              name={field.id}
              value={formData[field.id] || ""}
              onChange={handleInputChange}
              placeholder={
                field.placeholder || `Enter ${field.label.toLowerCase()}`
              }
              required={!field.optional}
            />
            {field.helper && (
              <p className="text-sm text-gray-500">{field.helper}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Textarea
              id={field.id}
              name={field.id}
              value={formData[field.id] || ""}
              onChange={handleInputChange}
              placeholder={
                field.placeholder || `Enter ${field.label.toLowerCase()}`
              }
              required={!field.optional}
            />
            {field.helper && (
              <p className="text-sm text-gray-500">{field.helper}</p>
            )}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-2">
            <Label>{field.label}</Label>
            <RadioGroup
              name={field.id}
              value={formData[field.id]}
              onValueChange={(value) => handleRadioChange(value, field.id)}
            >
              {field.options.map((option: any) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`${field.id}-${option.value}`}
                  />
                  <Label htmlFor={`${field.id}-${option.value}`}>
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {field.helper && (
              <p className="text-sm text-gray-500">{field.helper}</p>
            )}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Select
              value={formData[field.id]}
              onValueChange={(value) => handleSelectChange(value, field.id)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helper && (
              <p className="text-sm text-gray-500">{field.helper}</p>
            )}
          </div>
        );

      case "switch":
        return (
          <div
            key={field.id}
            className="flex items-center justify-between space-y-2"
          >
            <div>
              <Label htmlFor={field.id}>{field.label}</Label>
              {field.helper && (
                <p className="text-sm text-gray-500">{field.helper}</p>
              )}
            </div>
            <Switch
              id={field.id}
              checked={Boolean(formData[field.id])}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, field.id)
              }
            />
          </div>
        );

      case "slider":
        return (
          <div key={field.id} className="space-y-4">
            <div className="flex justify-between">
              <Label htmlFor={field.id}>{field.label}</Label>
              <span className="text-sm font-medium">
                {formData[field.id] || field.defaultValue}%
              </span>
            </div>
            <Slider
              id={field.id}
              min={field.min}
              max={field.max}
              step={field.step}
              value={[
                parseInt(formData[field.id] || field.defaultValue.toString()),
              ]}
              onValueChange={(value) => handleSliderChange(value, field.id)}
            />
            {field.helper && (
              <p className="text-sm text-gray-500">{field.helper}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderContractPreview = () => {
    const contracts = contractResult?.contracts;

    if (!contracts || Object.keys(contracts).length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-500">No contract preview available</p>
          <Button
            onClick={generatePreview}
            className="mt-4"
            disabled={generatingPreview}
          >
            {generatingPreview ? "Generating..." : "Generate Preview"}
          </Button>
        </div>
      );
    }

    const contractKeys = Object.keys(contracts);

    return (
      <div className="mt-4">
        <Tabs defaultValue={contractKeys[0]} className="w-full">
          <TabsList className="w-full justify-start">
            {contractKeys.map((key) => (
              <TabsTrigger key={key} value={key}>
                {contracts[key].name}
              </TabsTrigger>
            ))}
          </TabsList>

          {contractKeys.map((key) => (
            <TabsContent key={key} value={key}>
              <div className="bg-gray-50 rounded-md p-4 border">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">{contracts[key].name}</h3>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-[500px] text-sm">
                  <code>{contracts[key].code}</code>
                </pre>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {contractResult?.error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
            <h3 className="font-medium">Error</h3>
            <p>{contractResult.error}</p>
          </div>
        )}

        {contractResult?.address && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Deployment Information</CardTitle>
              <CardDescription>
                Your DAO has been deployed successfully
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Contract Address:</span>
                  <code className="bg-gray-100 px-2 rounded">
                    {contractResult.address}
                  </code>
                </div>
                {contractResult.txHash && (
                  <div className="flex justify-between">
                    <span className="font-medium">Transaction Hash:</span>
                    <code className="bg-gray-100 px-2 rounded">
                      {contractResult.txHash}
                    </code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Create Your DAO Governance
      </h1>

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

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-6">
          {currentStep === 3
            ? renderContractPreview()
            : steps[currentStep].fields.map((field) => renderField(field))}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSubmitting || generatingPreview}
            variant="outline"
            className="px-4"
          >
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || generatingPreview}
              className="px-4"
            >
              Next
            </Button>
          ) : contractResult?.address ? (
            <Button
              type="button"
              className="px-4 bg-green-600 hover:bg-green-700"
              disabled
            >
              Deployed Successfully
            </Button>
          ) : (
            <Button type="submit" className="px-4" disabled={isSubmitting}>
              {isSubmitting ? "Deploying..." : "Deploy Contract"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
