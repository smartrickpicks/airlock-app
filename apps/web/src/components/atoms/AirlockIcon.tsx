"use client";

import { motion } from "framer-motion";
import { useMotionSafe } from "@/lib/animations";
import {
  type AirlockIconProps,
  type AirlockIconName,
  sizeMap,
  mergePresets,
} from "@/components/atoms/airlock-icons/types";

import VaultIcon from "@/components/atoms/airlock-icons/VaultIcon";
import ChamberDiscoverIcon from "@/components/atoms/airlock-icons/ChamberDiscoverIcon";
import ChamberBuildIcon from "@/components/atoms/airlock-icons/ChamberBuildIcon";
import ChamberReviewIcon from "@/components/atoms/airlock-icons/ChamberReviewIcon";
import ChamberShipIcon from "@/components/atoms/airlock-icons/ChamberShipIcon";
import GateVerifyIcon from "@/components/atoms/airlock-icons/GateVerifyIcon";
import GateApprovalIcon from "@/components/atoms/airlock-icons/GateApprovalIcon";
import GateDensityIcon from "@/components/atoms/airlock-icons/GateDensityIcon";
import GateDecisionIcon from "@/components/atoms/airlock-icons/GateDecisionIcon";
import GateConvergenceIcon from "@/components/atoms/airlock-icons/GateConvergenceIcon";
import ModuleContractsIcon from "@/components/atoms/airlock-icons/ModuleContractsIcon";
import ModuleCrmIcon from "@/components/atoms/airlock-icons/ModuleCrmIcon";
import ModuleTriageIcon from "@/components/atoms/airlock-icons/ModuleTriageIcon";
import ModuleCalendarIcon from "@/components/atoms/airlock-icons/ModuleCalendarIcon";
import ModuleDocumentsIcon from "@/components/atoms/airlock-icons/ModuleDocumentsIcon";
import OttoIcon from "@/components/atoms/airlock-icons/OttoIcon";
import LockmarkIcon from "@/components/atoms/airlock-icons/LockmarkIcon";
import TriptychSignalIcon from "@/components/atoms/airlock-icons/TriptychSignalIcon";
import TriptychOrchestrateIcon from "@/components/atoms/airlock-icons/TriptychOrchestrateIcon";
import TriptychControlIcon from "@/components/atoms/airlock-icons/TriptychControlIcon";
import ArchetypeDriverIcon from "@/components/atoms/airlock-icons/ArchetypeDriverIcon";
import ArchetypeEnforcerIcon from "@/components/atoms/airlock-icons/ArchetypeEnforcerIcon";
import ArchetypeInterpreterIcon from "@/components/atoms/airlock-icons/ArchetypeInterpreterIcon";

type IconComponent = React.ComponentType<{ size: number; className?: string }>;

const iconMap: Record<AirlockIconName, IconComponent> = {
  vault: VaultIcon,
  "chamber-discover": ChamberDiscoverIcon,
  "chamber-build": ChamberBuildIcon,
  "chamber-review": ChamberReviewIcon,
  "chamber-ship": ChamberShipIcon,
  "gate-verify": GateVerifyIcon,
  "gate-approval": GateApprovalIcon,
  "gate-density": GateDensityIcon,
  "gate-decision": GateDecisionIcon,
  "gate-convergence": GateConvergenceIcon,
  "module-contracts": ModuleContractsIcon,
  "module-crm": ModuleCrmIcon,
  "module-triage": ModuleTriageIcon,
  "module-calendar": ModuleCalendarIcon,
  "module-documents": ModuleDocumentsIcon,
  otto: OttoIcon,
  lockmark: LockmarkIcon,
  "triptych-signal": TriptychSignalIcon,
  "triptych-orchestrate": TriptychOrchestrateIcon,
  "triptych-control": TriptychControlIcon,
  "archetype-driver": ArchetypeDriverIcon,
  "archetype-enforcer": ArchetypeEnforcerIcon,
  "archetype-interpreter": ArchetypeInterpreterIcon,
};

export default function AirlockIcon({
  name,
  size = "md",
  animate,
  className,
}: AirlockIconProps) {
  const IconSvg = iconMap[name];
  const pixelSize = sizeMap[size];
  const motionProps = useMotionSafe(animate ? mergePresets(animate) : {});

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: pixelSize, height: pixelSize }}
      {...motionProps}
    >
      <IconSvg size={pixelSize} className={className} />
    </motion.div>
  );
}
