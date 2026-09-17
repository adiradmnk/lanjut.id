'use client';

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Cpu,
  Layers,
  Zap,
  Globe,
  ShieldCheck,
  Workflow,
  Sparkles,
  CreditCard,
  Building2,
  Users,
  Gauge
} from "lucide-react";

export type NavItem = {
  id: number;
  label: string;
  link?: string;
  subMenus?: {
    title: string;
    items: {
      label: string;
      description: string;
      icon: React.ElementType;
      href?: string;
    }[];
  }[];
};

interface DropdownNavigationProps {
  navItems?: NavItem[];
}

export const defaultNavItems: NavItem[] = [
  {
    id: 1,
    label: "Product",
    subMenus: [
      {
        title: "Microservices Core",
        items: [
          {
            label: "FastAPI Engine",
            description: "High concurrency Python inference runtime",
            icon: Cpu,
            href: "#services"
          },
          {
            label: "Node.js Gateway",
            description: "Express TypeScript API router & orchestrator",
            icon: Layers,
            href: "#services"
          },
          {
            label: "Next.js 16 Client",
            description: "App Router with WebGL wave shader",
            icon: Zap,
            href: "#services"
          }
        ]
      },
      {
        title: "Infrastructure",
        items: [
          {
            label: "Cluster Docker Hub",
            description: "Single-command container orchestration",
            icon: Workflow,
            href: "#deployment"
          },
          {
            label: "OpenAPI Documentation",
            description: "Auto-generated interactive API schema",
            icon: Globe,
            href: "http://localhost:8000/docs"
          }
        ]
      }
    ]
  },
  {
    id: 2,
    label: "Solution",
    subMenus: [
      {
        title: "Use Cases",
        items: [
          {
            label: "Enterprise AI Pipelines",
            description: "Distributed low-latency model inference",
            icon: Sparkles,
            href: "/demo"
          },
          {
            label: "Secure API Gateways",
            description: "Role-based authentication & telemetry",
            icon: ShieldCheck,
            href: "/demo"
          }
        ]
      },
      {
        title: "By Industry",
        items: [
          {
            label: "Financial Infrastructure",
            description: "High-frequency tabular & transaction services",
            icon: Building2,
            href: "/demo"
          },
          {
            label: "Scaling Tech Teams",
            description: "Independent service ownership & deployments",
            icon: Users,
            href: "/demo"
          }
        ]
      }
    ]
  },
  {
    id: 3,
    label: "Pricing",
    subMenus: [
      {
        title: "Deployment Tiers",
        items: [
          {
            label: "Open Source Starter",
            description: "Free self-hosted Docker Compose setup",
            icon: Gauge,
            href: "/demo"
          },
          {
            label: "Enterprise Mesh",
            description: "Kubernetes orchestration & SLA support",
            icon: CreditCard,
            href: "/demo"
          }
        ]
      }
    ]
  }
];

export function DropdownNavigation({ navItems = defaultNavItems }: DropdownNavigationProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isHover, setIsHover] = useState<number | null>(null);

  const handleHover = (menuLabel: string | null) => {
    setOpenMenu(menuLabel);
  };

  return (
    <nav className="relative z-40">
      <ul className="flex items-center space-x-1">
        {navItems.map((navItem) => (
          <li
            key={navItem.label}
            className="relative"
            onMouseEnter={() => handleHover(navItem.label)}
            onMouseLeave={() => handleHover(null)}
          >
            <button
              type="button"
              className="text-sm py-2 px-3.5 flex cursor-pointer group transition-colors duration-200 items-center justify-center gap-1 text-[#273951] hover:text-[#007979] relative font-normal"
              onMouseEnter={() => setIsHover(navItem.id)}
              onMouseLeave={() => setIsHover(null)}
            >
              <span className="relative z-10">{navItem.label}</span>
              {navItem.subMenus && (
                <ChevronDown
                  className={`h-4 w-4 relative z-10 duration-200 transition-transform text-[#64748d] group-hover:text-[#007979] ${
                    openMenu === navItem.label ? "rotate-180 text-[#007979]" : ""
                  }`}
                />
              )}
              {(isHover === navItem.id || openMenu === navItem.label) && (
                <motion.div
                  layoutId="hover-bg"
                  className="absolute inset-0 size-full bg-[#007979]/10"
                  style={{ borderRadius: 99 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>

            <AnimatePresence>
              {openMenu === navItem.label && navItem.subMenus && (
                <div className="w-auto absolute left-1/2 -translate-x-1/2 top-full pt-2">
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="bg-white border border-[#e3e8ee] p-5 w-max shadow-[0_12px_36px_rgba(0,121,121,0.12),0_4px_12px_rgba(0,0,0,0.04)]"
                    style={{ borderRadius: 16 }}
                  >
                    <div className="w-fit shrink-0 flex space-x-10 overflow-hidden">
                      {navItem.subMenus.map((sub) => (
                        <div className="w-full min-w-[210px]" key={sub.title}>
                          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#64748d]">
                            {sub.title}
                          </h3>
                          <ul className="space-y-4">
                            {sub.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <li key={item.label}>
                                  <Link
                                    href={item.href || "#"}
                                    className="flex items-start space-x-3 group p-1.5 -m-1.5 rounded-lg hover:bg-[#f6f9fc] transition-colors duration-150"
                                  >
                                    <div className="border border-[#e3e8ee] text-[#007979] bg-[#f6f9fc] rounded-lg flex items-center justify-center size-9 shrink-0 group-hover:bg-[#007979] group-hover:text-white group-hover:border-[#007979] transition-all duration-200">
                                      <Icon className="h-4 w-4 flex-none" />
                                    </div>
                                    <div className="leading-tight w-max max-w-[230px]">
                                      <p className="text-sm font-medium text-[#0B2027] group-hover:text-[#007979] transition-colors duration-150">
                                        {item.label}
                                      </p>
                                      <p className="text-xs text-[#64748d] mt-0.5 leading-snug">
                                        {item.description}
                                      </p>
                                    </div>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </nav>
  );
}
