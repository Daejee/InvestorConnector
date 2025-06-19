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
  X,
  Wallet
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Investors", href: "/investors", icon: Users },
  { name: "Companies", href: "/companies", icon: Building },
  { name: "Funds", href: "/funds", icon: Wallet },
  { name: "Meetings", href: "/meeting-logs", icon: Calendar },
  { name: "Communications", href: "/communications", icon: MessageSquare },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Reports", href: "/reports", icon: BarChart },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

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
              return (
                <Link key={item.name} href={item.href}>
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
              );
            })}
          </div>
          
          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="mt-2 space-y-1">
              <Link href="/investors">
                <a className="w-full text-left text-gray-700 hover:bg-gray-50 group flex items-center px-3 py-2 text-sm font-medium rounded-lg">
                  <Plus className="mr-3 h-4 w-4" />
                  Add Investor
                </a>
              </Link>
              <Link href="/communications">
                <a className="w-full text-left text-gray-700 hover:bg-gray-50 group flex items-center px-3 py-2 text-sm font-medium rounded-lg">
                  <Calendar className="mr-3 h-4 w-4" />
                  Schedule Meeting
                </a>
              </Link>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
