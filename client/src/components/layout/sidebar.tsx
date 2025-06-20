import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  Building, 
  PieChart, 
  MessageSquare, 
  FileText, 
  BarChart,
  Plus,
  Calendar,
  CalendarDays,
  X,
  Wallet,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Dashboard / 대시보드", href: "/", icon: BarChart3 },
  { name: "Investors / 투자자", href: "/investors", icon: Users },
  { 
    name: "Companies / 회사", 
    href: "/companies", 
    icon: Building,
    submenu: [
      { name: "Funds / 펀드", href: "/funds", icon: Wallet }
    ]
  },
  { 
    name: "Meetings / 회의", 
    href: "/meeting-logs", 
    icon: Calendar,
    submenu: [
      { name: "Schedule / 일정 예약", href: "/scheduling", icon: Plus },
      { name: "NDR/컨퍼런스", href: "/ndr-conferences", icon: CalendarDays }
    ]
  },
  { name: "Communications / 소통", href: "/communications", icon: MessageSquare },
  { name: "Documents / 문서", href: "/documents", icon: FileText },
  { name: "Reports / 보고서", href: "/reports", icon: BarChart },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Companies / 회사", "Meetings / 회의"]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isExpanded = (itemName: string) => expandedItems.includes(itemName);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-sm border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:transform-none lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between p-4 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="mt-6 px-3 lg:mt-0">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const expanded = isExpanded(item.name);
              
              return (
                <div key={item.name}>
                  {hasSubmenu ? (
                    <>
                      <div className="flex items-center">
                        <Link href={item.href} className="flex-1">
                          <a
                            className={cn(
                              "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                              isActive
                                ? "bg-primary text-white"
                                : "text-gray-700 hover:bg-gray-50"
                            )}
                            onClick={() => onClose()}
                          >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.name}
                          </a>
                        </Link>
                        <button
                          className="p-1 text-gray-500 hover:text-gray-700"
                          onClick={() => toggleExpanded(item.name)}
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {expanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.submenu.map((subItem) => {
                            const subIsActive = location === subItem.href;
                            return (
                              <Link key={subItem.name} href={subItem.href}>
                                <a
                                  className={cn(
                                    "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    subIsActive
                                      ? "bg-primary text-white"
                                      : "text-gray-600 hover:bg-gray-50"
                                  )}
                                  onClick={() => onClose()}
                                >
                                  <subItem.icon className="mr-3 h-4 w-4" />
                                  {subItem.name}
                                </a>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link href={item.href}>
                      <a
                        className={cn(
                          "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-white"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                        onClick={() => onClose()}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </a>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Actions / 빠른 작업
            </h3>
            <div className="mt-2 space-y-1">
              <Link href="/investors">
                <a className="w-full text-left text-gray-700 hover:bg-gray-50 group flex items-center px-3 py-2 text-sm font-medium rounded-lg">
                  <Plus className="mr-3 h-4 w-4" />
                  Add Investor / 투자자 추가
                </a>
              </Link>
              <Link href="/communications">
                <a className="w-full text-left text-gray-700 hover:bg-gray-50 group flex items-center px-3 py-2 text-sm font-medium rounded-lg">
                  <Calendar className="mr-3 h-4 w-4" />
                  Schedule Meeting / 회의 일정
                </a>
              </Link>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
