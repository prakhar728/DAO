"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const steps = [
  {
    id: "basics",
    title: "Basic Information",
    fields: [
      { id: "name", label: "DAO Name", type: "input" },
      { id: "symbol", label: "DAO Symbol", type: "input" },
      { id: "purpose", label: "DAO Purpose", type: "textarea" },
      { id: "description", label: "DAO Description", type: "textarea" },
    ],
  },
  {
    id: "addresses",
    title: "Token & Addresses",
    fields: [
      {
        id: "hasExistingToken",
        label: "Do you have an existing ERC20 token?",
        type: "radio",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "tokenAddress",
        label: "Token Contract Address (if existing)",
        type: "input",
        condition: (data) => data.hasExistingToken === "yes",
      },
      { id: "treasuryAddress", label: "Treasury Address", type: "input" },
      { id: "adminAddress", label: "Admin Address", type: "input" },
    ],
  },
  {
    id: "governance-details",
    title: "Governance details",
    fields: [
      {
        id: "governance",
        label: "Governance Structure",
        type: "radio",
        options: [
          { value: "flat", label: "Flat (Equal voting power)" },
          { value: "weighted", label: "Weighted (Based on token holdings)" },
        ],
      },
      {
        id: "voting",
        label: "Voting Mechanism",
        type: "radio",
        options: [
          { value: "simple-majority", label: "Simple Majority" },
          { value: "super-majority", label: "Super Majority (e.g., 66%)" },
          { value: "consensus", label: "Consensus" },
        ],
      },

      // add more options

      // add setting - Voting Delay (input can be in days, number or hours) convert it to seconds.
      // add setting - Voting Period (same input range as Volting Delay)
      // add setting - Proposal Threshold
      // add setting - Quorum percent
      // add setting - Proposal Threshold
      // add setting - Proposal Threshold
    ],
  },
  {
    id: "preview",
    title: "Preview contract",
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
    description: "ProjectName is a blockchain-based solution designed to revolutionize Y by leveraging Z.",
    governance: "weighted",
    voting: "on-chain consensus",
    hasExistingToken: "no",
    tokenAddress: "0x0000000000000000000000000000000000000000",
    treasuryAddress: "0x0000000000000000000000000000000000000000",
    adminAddress: "0x0000000000000000000000000000000000000000"    
  });
  const [selectedContract, setSelectedContract] = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);

  useEffect(() => {
    // If we're on the preview step but don't have contract data yet, generate it
    if (currentStep === 3 && !contractResult?.contracts && !generatingPreview) {
      generatePreview();
    }
  }, [currentStep]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRadioChange = (value: string, name: string) => {
    setFormData({ ...formData, [name]: value });
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
      if (contractResult?.contracts && Object.keys(contractResult?.contracts).length > 0) {
        setSelectedContract(Object.keys(contractResult?.contracts)[0]);
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
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "http://localhost:3001/api/contracts/generate?saveToFile=true",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create DAO contract");
      }

      // Parse and store the response data
      const result = await response.json();

      console.log(result);

      setContractResult({
        contracts: result.contracts,
      });

      console.log("DAO contract deployed successfully:", result);
      handleNext();
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
              value={formData[field.id]}
              onChange={handleInputChange}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              required
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
              required
            />
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
          <Button onClick={handleSubmit} className="mt-4">
            Generate Preview
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
      </div>
    );
  };


  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Your Governance</h1>

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

      <form className="space-y-6">
        <div className="space-y-4">
          {currentStep === 3
            ? renderContractPreview()
            : steps[currentStep].fields.map((field) => renderField(field))}
          {/* {steps[currentStep].fields.map((field) => renderField(field))} */}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSubmitting}
          >
            Previous
          </Button>

          {currentStep == steps.length - 2 ? (
            <Button type="submit" onClick={handleSubmit}>
              {isSubmitting ? "Fetching preview..." : "Preview Contract"}
            </Button>
          ) : currentStep < steps.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting || generatingPreview}>
              {isSubmitting ? "Deploying..." : "Deploy Contract"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
