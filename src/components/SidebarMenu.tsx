import React from "react";
import { motion } from "motion/react";
import {
  Home,
  FilePlus,
  Clipboard,
  BookOpen,
  History,
  Download,
  Settings,
} from "lucide-react";
import { PlanlyLogo } from "./PlanlyLogo";

type SidebarNavId =
  | "inicio"
  | "planeacion"
  | "examenes"
  | "plantillas"
  | "temarios"
  | "historial"
  | "config";

export interface SidebarMenuProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  appName: string;
}

export function SidebarMenu({ activeTab, setActiveTab, appName }: SidebarMenuProps) {
  const menuItems: Array<{
    id: SidebarNavId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: { text: "IA" | "Nuevo"; variant: "ai" | "new" };
  }> = [
    { id: "inicio", label: "Inicio", icon: Home },
    {
      id: "planeacion",
      label: "Nueva Planeación",
      icon: FilePlus,
      badge: { text: "IA", variant: "ai" },
    },
    {
      id: "examenes",
      label: "Exámenes",
      icon: Clipboard,
      badge: { text: "Nuevo", variant: "new" },
    },
    { id: "plantillas", label: "Mis Plantillas", icon: BookOpen },
    { id: "temarios", label: "Historial de Temarios", icon: History },
    { id: "historial", label: "Historial de Descargas", icon: Download },
    { id: "config", label: "Configuración", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0B2A5B] text-[#BFD7F5] flex flex-col shrink-0 h-screen select-none justify-between border-r border-[#172033]/20 shadow-xl sticky top-0">
      <div>
        {/* BRAND LOGO HEADER */}
        <div className="p-5 border-b border-white/10 flex flex-col items-center justify-center">
          <div className="w-full h-11 px-1">
            <PlanlyLogo variant="negative" className="w-full h-full" />
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav aria-label={`${appName} navegación`} className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  try {
                    localStorage.setItem("planly_activeTab", item.id);
                  } catch {
                  }
                  setActiveTab(item.id);
                }}
                className="relative w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-left transition-all duration-200 ease-out group overflow-hidden hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-xl bg-[#1677D2]/18"
                  >
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-[#27C7B8]" />
                  </motion.div>
                )}

                <div
                  className={`relative z-10 flex items-center gap-3 transition-all duration-200 ease-out ${
                    isActive ? "text-white" : "text-[#BFD7F5]/85 group-hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-all duration-200 ease-out ${
                      isActive ? "text-white" : "text-[#BFD7F5]/85 group-hover:text-white group-hover:scale-[1.04]"
                    }`}
                  />
                  <span className="tracking-tight">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`relative z-10 inline-flex items-center justify-center text-[9px] font-extrabold px-2 py-1 rounded-full border transition-all duration-200 ease-out sidebar-badge-breathe ${
                      item.badge.variant === "ai"
                        ? "bg-[#6D5DFB]/18 text-[#B7AEFF] border-[#6D5DFB]/30"
                        : "bg-[#27C7B8]/16 text-[#7BF3E8] border-[#27C7B8]/30 px-2.5"
                    }`}
                  >
                    {item.badge.text}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* FOOTER METRICS CARD */}
      <div className="p-4">
        <div className="sidebar-footer-card rounded-2xl bg-white/[0.06] border border-white/5 px-4 py-4 text-xs text-center relative overflow-hidden">
          <div className="text-[11px] text-[#BFD7F5]/70 leading-relaxed">
            Una solución tecnológica de <br />
            <span className="text-[#27C7B8] font-bold">RAUVIA Consulting</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
