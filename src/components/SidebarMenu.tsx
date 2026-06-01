import React from "react";
import { 
  Home, 
  FilePlus, 
  Clipboard, 
  BookOpen, 
  HelpCircle, 
  GraduationCap, 
  History, 
  Settings, 
  Sparkles 
} from "lucide-react";
import { PlanlyLogo } from "./PlanlyLogo";

export interface SidebarMenuProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  appName: string;
}

export function SidebarMenu({ activeTab, setActiveTab, appName }: SidebarMenuProps) {
  const menuItems = [
    { id: "inicio", label: "Inicio", icon: Home },
    { id: "planeacion", label: "Nueva Planeación", icon: FilePlus, badge: "IA" },
    { id: "examenes", label: "Exámenes", icon: Clipboard, badge: "Nuevo" },
    { id: "plantillas", label: "Mis Plantillas", icon: BookOpen },
    { id: "temarios", label: "Historial de Temarios", icon: GraduationCap },
    { id: "historial", label: "Historial de Descargas", icon: History },
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
          <span className="text-[10px] text-[#27C7B8] font-bold tracking-wider mt-1.5 uppercase">
            Un producto más de RAUVIA
          </span>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 group text-left ${
                  isActive
                    ? "bg-[rgba(39,199,184,0.16)] text-white border-l-4 border-[#27C7B8]"
                    : "text-[#BFD7F5] hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 duration-150 ${
                    isActive ? "text-[#27C7B8]" : "text-[#BFD7F5]"
                  }`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                    item.badge === "IA" 
                      ? "bg-[#6D5DFB]/20 text-[#6D5DFB] border border-[#6D5DFB]/40" 
                      : "bg-[#27C7B8]/20 text-[#27C7B8]"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* FOOTER METRICS CARD */}
      <div className="p-4 m-4 rounded-xl bg-white/5 border border-white/10 text-xs text-center">
        <div className="text-[11px] text-[#BFD7F5]/70 leading-relaxed">
          Una solución tecnológica de <br />
          <span className="text-[#27C7B8] font-bold">RAUVIA</span>
        </div>
      </div>
    </aside>
  );
}
