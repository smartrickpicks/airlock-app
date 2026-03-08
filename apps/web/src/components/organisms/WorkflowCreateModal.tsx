"use client";

import { useState } from "react";
import Button from "@/components/atoms/Button";
import Modal from "@/components/molecules/Modal";
import {
  CATEGORY_LABELS,
  TRIGGER_TYPE_LABELS,
  type TriggerType,
  type WorkflowCategory,
} from "@/lib/mock-workflows";

interface WorkflowCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    category: WorkflowCategory;
    triggerType: TriggerType;
  }) => void;
}

const CATEGORIES: WorkflowCategory[] = [
  "lead_qualification",
  "communications",
  "deal_automation",
  "notification",
  "onboarding",
  "contract",
  "custom",
];

const TRIGGERS: TriggerType[] = [
  "form_submitted",
  "inbound_message",
  "meeting_transcript_ready",
  "contract_qualification_reached",
  "manual",
  "follow_up_due",
];

export default function WorkflowCreateModal({
  isOpen,
  onClose,
  onCreate,
}: WorkflowCreateModalProps) {
  const [name, setName] = useState("Discovery Intake Orchestrator");
  const [description, setDescription] = useState(
    "Creates a CRM relationship, discovery tasks, and a human review gate when a lead arrives.",
  );
  const [category, setCategory] =
    useState<WorkflowCategory>("lead_qualification");
  const [triggerType, setTriggerType] = useState<TriggerType>("form_submitted");

  const inputClasses =
    "w-full rounded-md border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none";
  const labelClasses = "mb-1 block text-xs font-medium text-text-secondary";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Workflow" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Create a discovery-to-contract draft workflow and open it in the
          visual builder.
        </p>

        <div>
          <label htmlFor="workflow-name" className={labelClasses}>
            Name
          </label>
          <input
            id="workflow-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="workflow-description" className={labelClasses}>
            Description
          </label>
          <textarea
            id="workflow-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="workflow-category" className={labelClasses}>
              Category
            </label>
            <select
              id="workflow-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as WorkflowCategory)}
              className={inputClasses}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="workflow-trigger" className={labelClasses}>
              Trigger
            </label>
            <select
              id="workflow-trigger"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className={inputClasses}
            >
              {TRIGGERS.map((item) => (
                <option key={item} value={item}>
                  {TRIGGER_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onCreate({ name, description, category, triggerType });
              onClose();
            }}
          >
            Create Draft
          </Button>
        </div>
      </div>
    </Modal>
  );
}
