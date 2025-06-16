import { Link, useLocation } from "wouter";
import { Compass, Grid3X3, TrendingUp, Settings, Coins } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
}

export default function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const [location] = useLocation();

  const tabs = [
    {
      id: "discover",
      path: "/",
      icon: Compass,
      label: "Map"
    },
    {
      id: "insights",
      path: "/insights",
      icon: TrendingUp,
      label: "Insights"
    },
    {
      id: "patterns",
      path: "/patterns",
      icon: Grid3X3,
      label: "Patterns"
    },
    {
      id: "economy",
      path: "/economy",
      icon: Coins,
      label: "Economy"
    },
    {
      id: "settings",
      path: "/settings",
      icon: Settings,
      label: "Settings"
    }
  ];

  return (
    <nav className="bg-white border-t border-gray-200 bottom-nav">
      <div className="flex items-center justify-between px-1 py-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          
          return (
            <Link key={tab.id} href={tab.path} asChild>
              <button className={`flex flex-col items-center py-1 px-1 min-w-0 flex-1 ${
                isActive ? 'text-primary' : 'text-neutral-400'
              }`}>
                <IconComponent className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-medium truncate">{tab.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
