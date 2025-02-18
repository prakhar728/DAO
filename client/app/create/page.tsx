"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const steps = [
  {
    id: "basics",
    title: "Basic Information",
    fields: [
      { id: "name", label: "DAO Name", type: "input" },
      { id: "symbol", label: "DAO Symbol", type: "input" },
      { id: "purpose", label: "DAO Purpose", type: "textarea" },
      { id: "description", label: "DAO Description", type: "textarea" },
    ]
  },
  {
    id: "addresses",
    title: "Token & Addresses",
    fields: [
      { id: "hasExistingToken", label: "Do you have an existing ERC20 token?", type: "radio",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" }
        ]
      },
      { id: "tokenAddress", label: "Token Contract Address (if existing)", type: "input",
        condition: (data) => data.hasExistingToken === "yes"
      },
      { id: "treasuryAddress", label: "Treasury Address", type: "input" },
      { id: "adminAddress", label: "Admin Address", type: "input" }
    ]
  },
  {
    id: "governance-details",
    title: "Governance details",
    fields: [
      { id: "governance", label: "Governance Structure", type: "radio", 
        options: [
          { value: "flat", label: "Flat (Equal voting power)" },
          { value: "weighted", label: "Weighted (Based on token holdings)" }
        ]
      },
      { id: "voting", label: "Voting Mechanism", type: "radio",
        options: [
          { value: "simple-majority", label: "Simple Majority" },
          { value: "super-majority", label: "Super Majority (e.g., 66%)" },
          { value: "consensus", label: "Consensus" }
        ]
      }
    ]
  }
];

export default function CreateDAO() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    purpose: "",
    description: "",
    governance: "",
    voting: "",
    hasExistingToken: "no",
    tokenAddress: "",
    treasuryAddress: "",
    adminAddress: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRadioChange = (value: string, name: string) => {
    setFormData({ ...formData, [name]: value });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("DAO Creation Data:", formData);
    alert("DAO created successfully!");
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
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                  <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Your DAO</h1>
      
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {steps[currentStep].fields.map((field) => renderField(field))}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          {currentStep < steps.length ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button type="submit">Create DAO</Button>
          )}
        </div>
      </form>
    </div>
  );
}