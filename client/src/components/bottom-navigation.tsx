import { Link, useLocation } from "wouter";
import { Compass, Grid3X3, TrendingUp, Users, Settings, Wallet } from "lucide-react";

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
      label: "Discover"
    },
    {
      id: "activity",
      path: "/activity",
      icon: TrendingUp,
      label: "Activity"
    },
    {
      id: "community",
      path: "/community-analysis",
      icon: Users,
      label: "Community"
    },
    {
      id: "patterns",
      path: "/patterns",
      icon: Grid3X3,
      label: "Patterns"
    },
    {
      id: "tokens",
      path: "/token-wallet",
      icon: Wallet,
      label: "Tokens"
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
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          
          return (
            <Link key={tab.id} href={tab.path} asChild>
              <button className={`flex flex-col items-center py-2 px-3 ${
                isActive ? 'text-primary' : 'text-neutral-400'
              }`}>
                <IconComponent className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
